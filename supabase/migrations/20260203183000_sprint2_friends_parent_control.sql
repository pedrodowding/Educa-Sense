ALTER TABLE public.children ADD COLUMN IF NOT EXISTS friends_enabled boolean not null default true;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS friends_parent_approval_required boolean not null default false;

ALTER TABLE public.friend_requests ADD COLUMN IF NOT EXISTS requires_parent_approval boolean not null default false;
ALTER TABLE public.friend_requests ADD COLUMN IF NOT EXISTS approved_by_parent_user_id uuid;
ALTER TABLE public.friend_requests ADD COLUMN IF NOT EXISTS approved_at timestamptz;

CREATE TABLE IF NOT EXISTS public.friends_audit_log (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  actor_parent_user_id uuid references public.profiles(id) on delete set null,
  actor_child_id uuid references public.children(id) on delete set null,
  action text not null check (action in (
    'toggle_friends_enabled',
    'toggle_parent_approval_required',
    'request_sent',
    'request_canceled',
    'request_rejected',
    'request_accepted_by_child',
    'request_accepted_by_parent',
    'friend_removed_by_parent'
  )),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS idx_friends_audit_child_created_at ON public.friends_audit_log(child_id, created_at desc);
CREATE INDEX IF NOT EXISTS idx_friends_audit_parent_created_at ON public.friends_audit_log(actor_parent_user_id, created_at desc);

ALTER TABLE public.friends_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parents can view friends audit logs" ON public.friends_audit_log;
CREATE POLICY "Parents can view friends audit logs" ON public.friends_audit_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = friends_audit_log.child_id
        AND children.guardian_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Parents can insert friends audit logs" ON public.friends_audit_log;
CREATE POLICY "Parents can insert friends audit logs" ON public.friends_audit_log
  FOR INSERT WITH CHECK (actor_parent_user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.rpc_parent_update_friends_settings(
  p_child_id uuid,
  p_enabled boolean,
  p_require_approval boolean
)
RETURNS JSONB AS $$
DECLARE
  v_child RECORD;
  v_parent uuid;
BEGIN
  v_parent := auth.uid();
  SELECT id, guardian_id, friends_enabled, friends_parent_approval_required
    INTO v_child
  FROM public.children
  WHERE id = p_child_id;

  IF v_child.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  IF v_child.guardian_id != v_parent THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  UPDATE public.children
  SET friends_enabled = p_enabled,
      friends_parent_approval_required = p_require_approval
  WHERE id = p_child_id;

  IF v_child.friends_enabled IS DISTINCT FROM p_enabled THEN
    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (p_child_id, v_parent, 'toggle_friends_enabled', jsonb_build_object('enabled', p_enabled));
  END IF;

  IF v_child.friends_parent_approval_required IS DISTINCT FROM p_require_approval THEN
    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (p_child_id, v_parent, 'toggle_parent_approval_required', jsonb_build_object('required', p_require_approval));
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_parent_list_pending_friend_requests(
  p_child_id uuid
)
RETURNS JSONB AS $$
DECLARE
  v_parent uuid;
  v_requests jsonb;
BEGIN
  v_parent := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.children
    WHERE id = p_child_id AND guardian_id = v_parent
  ) THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(t) INTO v_requests
  FROM (
    SELECT
      fr.id,
      fr.from_child_id,
      fr.to_child_id,
      fr.status,
      fr.created_at,
      fr.requires_parent_approval,
      fr.approved_by_parent_user_id,
      fr.approved_at,
      (SELECT jsonb_build_object('name', c.name, 'avatar', c.avatar)
       FROM public.children c WHERE c.id = fr.from_child_id) as from_child,
      (SELECT jsonb_build_object('name', c.name, 'avatar', c.avatar)
       FROM public.children c WHERE c.id = fr.to_child_id) as to_child
    FROM public.friend_requests fr
    WHERE fr.to_child_id = p_child_id
      AND fr.status = 'pending'
      AND fr.requires_parent_approval = true
    ORDER BY fr.created_at DESC
  ) t;

  RETURN COALESCE(v_requests, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_parent_respond_friend_request(
  p_request_id uuid,
  p_action text
)
RETURNS JSONB AS $$
DECLARE
  v_parent uuid;
  v_req RECORD;
BEGIN
  v_parent := auth.uid();
  SELECT * INTO v_req FROM public.friend_requests WHERE id = p_request_id;

  IF v_req IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.children
    WHERE id = v_req.to_child_id AND guardian_id = v_parent
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_PENDING');
  END IF;

  IF p_action = 'reject' THEN
    UPDATE public.friend_requests
    SET status = 'rejected', responded_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (v_req.to_child_id, v_parent, 'request_rejected', jsonb_build_object('request_id', p_request_id));

    RETURN jsonb_build_object('success', true, 'status', 'rejected');
  ELSIF p_action = 'accept' THEN
    UPDATE public.friend_requests
    SET status = 'accepted',
        responded_at = NOW(),
        approved_by_parent_user_id = v_parent,
        approved_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO public.friendships (child_a_id, child_b_id)
    VALUES (
      LEAST(v_req.from_child_id, v_req.to_child_id),
      GREATEST(v_req.from_child_id, v_req.to_child_id)
    )
    ON CONFLICT (child_a_id, child_b_id) DO NOTHING;

    UPDATE public.friend_requests
    SET status = 'canceled', responded_at = NOW()
    WHERE from_child_id = v_req.to_child_id
      AND to_child_id = v_req.from_child_id
      AND status = 'pending';

    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (v_req.to_child_id, v_parent, 'request_accepted_by_parent', jsonb_build_object('request_id', p_request_id));

    RETURN jsonb_build_object('success', true, 'status', 'accepted');
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_parent_remove_friendship(
  p_child_id uuid,
  p_friend_child_id uuid
)
RETURNS JSONB AS $$
DECLARE
  v_parent uuid;
BEGIN
  v_parent := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM public.children
    WHERE id = p_child_id AND guardian_id = v_parent
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  DELETE FROM public.friendships
  WHERE child_a_id = LEAST(p_child_id, p_friend_child_id)
    AND child_b_id = GREATEST(p_child_id, p_friend_child_id);

  INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
  VALUES (p_child_id, v_parent, 'friend_removed_by_parent', jsonb_build_object('friend_child_id', p_friend_child_id));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
BEGIN
    v_current_user := auth.uid();

    SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_from_child_id;

    IF v_guardian_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Child not found or no guardian');
    END IF;

    IF v_guardian_id != v_current_user THEN
         RETURN jsonb_build_object(
            'success', false,
            'error', 'UNAUTHORIZED: Guardian mismatch',
            'debug', jsonb_build_object(
                'child_id', p_from_child_id,
                'child_guardian_id', v_guardian_id,
                'current_auth_uid', v_current_user
            )
         );
    END IF;

    SELECT child_id INTO v_to_child_id
    FROM public.child_friend_codes
    WHERE friend_code = upper(p_friend_code);

    IF v_to_child_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CODE');
    END IF;

    IF v_to_child_id = p_from_child_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELF_INVITE');
    END IF;

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
    VALUES (v_to_child_id, v_current_user, p_from_child_id, 'request_sent', jsonb_build_object('to_child_id', v_to_child_id));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_respond_friend_request(
    p_child_id UUID,
    p_request_id UUID,
    p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_parent uuid;
BEGIN
    v_parent := auth.uid();
    SELECT * INTO v_req FROM public.friend_requests WHERE id = p_request_id;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;

    IF v_req.to_child_id != p_child_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_PENDING');
    END IF;

    IF p_action = 'reject' THEN
        UPDATE public.friend_requests
        SET status = 'rejected', responded_at = NOW()
        WHERE id = p_request_id;

        INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, actor_child_id, action, metadata)
        VALUES (v_req.to_child_id, v_parent, p_child_id, 'request_rejected', jsonb_build_object('request_id', p_request_id));

        RETURN jsonb_build_object('success', true, 'status', 'rejected');
    ELSIF p_action = 'accept' THEN
        IF v_req.requires_parent_approval = true THEN
          RETURN jsonb_build_object('success', false, 'error', 'PARENT_APPROVAL_REQUIRED');
        END IF;

        UPDATE public.friend_requests
        SET status = 'accepted', responded_at = NOW()
        WHERE id = p_request_id;

        INSERT INTO public.friendships (child_a_id, child_b_id)
        VALUES (
            LEAST(v_req.from_child_id, v_req.to_child_id),
            GREATEST(v_req.from_child_id, v_req.to_child_id)
        )
        ON CONFLICT (child_a_id, child_b_id) DO NOTHING;

        UPDATE public.friend_requests
        SET status = 'canceled', responded_at = NOW()
        WHERE from_child_id = v_req.to_child_id
          AND to_child_id = v_req.from_child_id
          AND status = 'pending';

        INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, actor_child_id, action, metadata)
        VALUES (v_req.to_child_id, v_parent, p_child_id, 'request_accepted_by_child', jsonb_build_object('request_id', p_request_id));

        RETURN jsonb_build_object('success', true, 'status', 'accepted');
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_cancel_friend_request(
    p_child_id UUID,
    p_request_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_parent uuid;
BEGIN
    v_parent := auth.uid();
    SELECT * INTO v_req FROM public.friend_requests WHERE id = p_request_id;

    IF v_req IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FOUND');
    END IF;

    IF v_req.from_child_id != p_child_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    IF v_req.status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_PENDING');
    END IF;

    UPDATE public.friend_requests
    SET status = 'canceled', responded_at = NOW()
    WHERE id = p_request_id;

    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, actor_child_id, action, metadata)
    VALUES (v_req.from_child_id, v_parent, p_child_id, 'request_canceled', jsonb_build_object('request_id', p_request_id));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_get_friend_requests(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_requests JSONB;
BEGIN
  IF p_child_id IS NULL THEN
      RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(t) INTO v_requests
  FROM (
    SELECT 
      fr.id,
      fr.from_child_id,
      fr.to_child_id,
      fr.status,
      fr.created_at,
      fr.requires_parent_approval,
      fr.approved_by_parent_user_id,
      fr.approved_at,
      (SELECT jsonb_build_object('name', c.name, 'avatar', c.avatar) 
       FROM public.children c WHERE c.id = fr.from_child_id) as from_child,
      (SELECT jsonb_build_object('name', c.name, 'avatar', c.avatar) 
       FROM public.children c WHERE c.id = fr.to_child_id) as to_child
    FROM public.friend_requests fr
    WHERE (fr.from_child_id = p_child_id OR fr.to_child_id = p_child_id)
    AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  ) t;

  RETURN COALESCE(v_requests, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
