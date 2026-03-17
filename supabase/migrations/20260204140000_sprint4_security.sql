-- Create child_blocks table
CREATE TABLE IF NOT EXISTS public.child_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_child_id uuid not null references public.children(id) on delete cascade,
  blocked_child_id uuid not null references public.children(id) on delete cascade,
  reason text,
  created_at timestamptz default now(),
  CONSTRAINT unique_block UNIQUE (blocker_child_id, blocked_child_id),
  CONSTRAINT no_self_block CHECK (blocker_child_id != blocked_child_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_child_blocks_blocker ON public.child_blocks(blocker_child_id);
CREATE INDEX IF NOT EXISTS idx_child_blocks_blocked ON public.child_blocks(blocked_child_id);

-- RLS for child_blocks
ALTER TABLE public.child_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Guardians can view blocks of their children
CREATE POLICY "Guardians can view blocks of their children" ON public.child_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_blocks.blocker_child_id
        AND children.guardian_id = auth.uid()
    )
  );

-- Policy: RPC usage mainly, but strictly speaking only the blocker (via RPC) or parent should insert
-- We will handle insertion via RPC for safety and complex logic (removing friends etc), 
-- but we can allow SELECT for the child themselves if needed (to show blocked list? maybe not needed for child UI yet).
-- For now, let's keep it restricted.

-- RPC: Block Friend
CREATE OR REPLACE FUNCTION public.rpc_block_child(
  p_child_id uuid,
  p_blocked_child_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_guardian_id uuid;
  v_current_user uuid;
BEGIN
  v_current_user := auth.uid();
  
  -- Verify ownership/permission (Child initiating block OR Parent initiating block)
  -- For Sprint 4, UI says "Perfil do Amigo -> Bloquear", so it's the child acting (or parent logged as child?).
  -- Usually we check if the auth.uid() is the guardian of the p_child_id.
  
  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_child_id;
  
  IF v_guardian_id != v_current_user THEN
     RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_child_id = p_blocked_child_id THEN
     RETURN jsonb_build_object('success', false, 'error', 'SELF_BLOCK');
  END IF;

  -- 1. Insert Block
  INSERT INTO public.child_blocks (blocker_child_id, blocked_child_id, reason)
  VALUES (p_child_id, p_blocked_child_id, p_reason)
  ON CONFLICT (blocker_child_id, blocked_child_id) DO NOTHING;

  -- 2. Remove Friendship if exists
  DELETE FROM public.friendships
  WHERE (child_a_id = LEAST(p_child_id, p_blocked_child_id) 
    AND child_b_id = GREATEST(p_child_id, p_blocked_child_id));

  -- 3. Cancel any pending requests
  UPDATE public.friend_requests
  SET status = 'canceled', responded_at = NOW()
  WHERE (from_child_id = p_child_id AND to_child_id = p_blocked_child_id AND status = 'pending')
     OR (from_child_id = p_blocked_child_id AND to_child_id = p_child_id AND status = 'pending');

  -- 4. Audit
  INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, actor_child_id, action, metadata)
  VALUES (p_child_id, v_current_user, p_child_id, 'friend_blocked_by_child', jsonb_build_object('blocked_child_id', p_blocked_child_id, 'reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Unblock Child (For Parent UI)
CREATE OR REPLACE FUNCTION public.rpc_unblock_child(
  p_child_id uuid,
  p_blocked_child_id uuid
)
RETURNS JSONB AS $$
DECLARE
  v_guardian_id uuid;
BEGIN
  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_child_id;
  
  IF v_guardian_id != auth.uid() THEN
     RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  DELETE FROM public.child_blocks
  WHERE blocker_child_id = p_child_id AND blocked_child_id = p_blocked_child_id;

  INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
  VALUES (p_child_id, auth.uid(), 'friend_unblocked_by_parent', jsonb_build_object('unblocked_child_id', p_blocked_child_id));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: List Blocks (For Parent UI)
CREATE OR REPLACE FUNCTION public.rpc_get_child_blocks(p_child_id uuid)
RETURNS JSONB AS $$
DECLARE
  v_blocks jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_child_id AND guardian_id = auth.uid()) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', cb.id,
      'blocked_child', (SELECT jsonb_build_object('id', c.id, 'name', c.name, 'avatar', c.avatar) FROM public.children c WHERE c.id = cb.blocked_child_id),
      'created_at', cb.created_at
    )
  ) INTO v_blocks
  FROM public.child_blocks cb
  WHERE cb.blocker_child_id = p_child_id;

  RETURN COALESCE(v_blocks, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update rpc_send_friend_request_by_code with Limits and Block Checks
CREATE OR REPLACE FUNCTION public.rpc_send_friend_request_by_code(
    p_from_child_id UUID,
    p_friend_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_to_child_id UUID;
    v_existing_status TEXT;
    v_friendship_exists BOOLEAN;
    v_guardian_id UUID;
    v_current_user UUID;
    v_requires_parent_approval BOOLEAN;
    v_to_friends_enabled BOOLEAN;
    v_from_child_name TEXT;
    
    -- Limit variables
    v_daily_count INTEGER;
    v_monthly_count INTEGER;
    v_is_blocked BOOLEAN;
BEGIN
    v_current_user := auth.uid();

    SELECT guardian_id, name INTO v_guardian_id, v_from_child_name FROM public.children WHERE id = p_from_child_id;

    IF v_guardian_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Child not found or no guardian');
    END IF;

    IF v_guardian_id != v_current_user THEN
         RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Guardian mismatch');
    END IF;

    -- 1. Check Limits (Anti-spam)
    -- Max 5 per day
    SELECT COUNT(*) INTO v_daily_count
    FROM public.friends_audit_log
    WHERE child_id = p_from_child_id 
      AND action = 'request_sent'
      AND created_at > (NOW() - INTERVAL '1 day');

    IF v_daily_count >= 5 THEN
       INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
       VALUES (p_from_child_id, v_current_user, 'spam_limit_daily_reached', jsonb_build_object('count', v_daily_count));
       
       RETURN jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_REACHED', 'message', 'Você atingiu o limite de 5 convites por dia.');
    END IF;

    -- Max 20 per month
    SELECT COUNT(*) INTO v_monthly_count
    FROM public.friends_audit_log
    WHERE child_id = p_from_child_id 
      AND action = 'request_sent'
      AND created_at > (NOW() - INTERVAL '30 days');

    IF v_monthly_count >= 20 THEN
       INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
       VALUES (p_from_child_id, v_current_user, 'spam_limit_monthly_reached', jsonb_build_object('count', v_monthly_count));
       
       RETURN jsonb_build_object('success', false, 'error', 'MONTHLY_LIMIT_REACHED', 'message', 'Você atingiu o limite de 20 convites por mês.');
    END IF;

    -- Resolve Friend Code
    SELECT child_id INTO v_to_child_id
    FROM public.child_friend_codes
    WHERE friend_code = upper(p_friend_code);

    IF v_to_child_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CODE');
    END IF;

    IF v_to_child_id = p_from_child_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELF_INVITE');
    END IF;

    -- 2. Check Blocks
    -- Is sender blocked by receiver?
    SELECT EXISTS(
      SELECT 1 FROM public.child_blocks 
      WHERE blocker_child_id = v_to_child_id AND blocked_child_id = p_from_child_id
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
       -- Generic error to avoid revealing block status perfectly, or explicit?
       -- PRD doesn't specify masking, but standard practice is "Cannot add this user".
       -- For simplicity/debug let's return a clear error but maybe UI shows "Não foi possível".
       INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
       VALUES (p_from_child_id, v_current_user, 'request_blocked_by_target', jsonb_build_object('target_id', v_to_child_id));
       
       RETURN jsonb_build_object('success', false, 'error', 'BLOCKED_BY_USER', 'message', 'Não foi possível enviar o convite.');
    END IF;

    -- Is receiver blocked by sender? (Shouldn't happen if UI filters, but good to check)
    SELECT EXISTS(
      SELECT 1 FROM public.child_blocks 
      WHERE blocker_child_id = p_from_child_id AND blocked_child_id = v_to_child_id
    ) INTO v_is_blocked;

    IF v_is_blocked THEN
       RETURN jsonb_build_object('success', false, 'error', 'YOU_BLOCKED_USER', 'message', 'Você bloqueou este usuário.');
    END IF;

    -- Standard Checks
    SELECT COALESCE(friends_enabled, true), COALESCE(friends_parent_approval_required, false)
      INTO v_to_friends_enabled, v_requires_parent_approval
    FROM public.children
    WHERE id = v_to_child_id;

    IF v_to_friends_enabled IS DISTINCT FROM true THEN
        RETURN jsonb_build_object('success', false, 'error', 'FRIENDS_DISABLED');
    END IF;

    SELECT EXISTS(
        SELECT 1 FROM public.friendships
        WHERE (child_a_id = LEAST(p_from_child_id, v_to_child_id) AND child_b_id = GREATEST(p_from_child_id, v_to_child_id))
    ) INTO v_friendship_exists;

    IF v_friendship_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_FRIENDS');
    END IF;

    SELECT status INTO v_existing_status
    FROM public.friend_requests
    WHERE (from_child_id = p_from_child_id AND to_child_id = v_to_child_id AND status = 'pending')
       OR (from_child_id = v_to_child_id AND to_child_id = p_from_child_id AND status = 'pending');

    IF v_existing_status IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PENDING');
    END IF;

    INSERT INTO public.friend_requests (from_child_id, to_child_id, status, requires_parent_approval)
    VALUES (p_from_child_id, v_to_child_id, 'pending', v_requires_parent_approval);

    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, actor_child_id, action, metadata)
    VALUES (p_from_child_id, v_current_user, p_from_child_id, 'request_sent', jsonb_build_object('to_child_id', v_to_child_id));

    -- NOTIFICATION: Invite Received
    INSERT INTO public.child_notifications (child_id, type, message, metadata)
    VALUES (
      v_to_child_id, 
      'friend_invite', 
      v_from_child_name || ' quer ser seu amigo!', 
      jsonb_build_object('from_child_id', p_from_child_id, 'from_child_name', v_from_child_name)
    );

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
