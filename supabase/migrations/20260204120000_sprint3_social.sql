-- Create child_notifications table
CREATE TABLE IF NOT EXISTS public.child_notifications (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children(id) on delete cascade,
  type text not null, -- 'friend_invite', 'friend_accept', 'friend_activity'
  message text not null,
  read boolean not null default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_child_notifications_child_id ON public.child_notifications(child_id);
CREATE INDEX IF NOT EXISTS idx_child_notifications_created_at ON public.child_notifications(created_at desc);

-- RLS
ALTER TABLE public.child_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guardians can view their children's notifications" ON public.child_notifications;
CREATE POLICY "Guardians can view their children's notifications" ON public.child_notifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_notifications.child_id
        AND children.guardian_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Guardians can update their children's notifications" ON public.child_notifications;
CREATE POLICY "Guardians can update their children's notifications" ON public.child_notifications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.children
      WHERE children.id = child_notifications.child_id
        AND children.guardian_id = auth.uid()
    )
  );

-- RPCs for Notifications

CREATE OR REPLACE FUNCTION public.rpc_get_unread_notifications_count(p_child_id uuid)
RETURNS integer AS $$
DECLARE
  v_count integer;
  v_guardian_id uuid;
BEGIN
  -- Verify ownership
  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_child_id;
  
  IF v_guardian_id != auth.uid() THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.child_notifications
  WHERE child_id = p_child_id AND read = false;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_list_notifications(
  p_child_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS SETOF public.child_notifications AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.children WHERE id = p_child_id AND guardian_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.child_notifications
  WHERE child_id = p_child_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.rpc_mark_notification_read(p_notification_id uuid)
RETURNS boolean AS $$
DECLARE
  v_child_id uuid;
  v_guardian_id uuid;
BEGIN
  SELECT child_id INTO v_child_id FROM public.child_notifications WHERE id = p_notification_id;
  
  IF v_child_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = v_child_id;

  IF v_guardian_id != auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.child_notifications
  SET read = true
  WHERE id = p_notification_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Friend RPCs to generate notifications

-- 1. Send Request (Invite Received)
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
BEGIN
    v_current_user := auth.uid();

    SELECT guardian_id, name INTO v_guardian_id, v_from_child_name FROM public.children WHERE id = p_from_child_id;

    IF v_guardian_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Child not found or no guardian');
    END IF;

    IF v_guardian_id != v_current_user THEN
         RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Guardian mismatch');
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

-- 2. Respond Request (Invite Accepted / Friendship Created)
CREATE OR REPLACE FUNCTION public.rpc_respond_friend_request(
    p_child_id UUID,
    p_request_id UUID,
    p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_parent uuid;
    v_to_child_name TEXT;
    v_from_child_name TEXT;
BEGIN
    v_parent := auth.uid();
    
    -- Get request details
    SELECT fr.*, c_to.name as to_child_name, c_from.name as from_child_name
    INTO v_req 
    FROM public.friend_requests fr
    JOIN public.children c_to ON fr.to_child_id = c_to.id
    JOIN public.children c_from ON fr.from_child_id = c_from.id
    WHERE fr.id = p_request_id;

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

        -- NOTIFICATION 1: Notify Sender (Acceptance)
        INSERT INTO public.child_notifications (child_id, type, message, metadata)
        VALUES (
          v_req.from_child_id, 
          'friend_accept', 
          v_req.to_child_name || ' aceitou seu convite!', 
          jsonb_build_object('friend_id', v_req.to_child_id, 'friend_name', v_req.to_child_name)
        );

        -- NOTIFICATION 2: Notify Receiver (Friendship Created - "Social Event")
        -- "Você e Esther agora são amigos 🎉"
        INSERT INTO public.child_notifications (child_id, type, message, metadata)
        VALUES (
          v_req.to_child_id,
          'friend_activity',
          'Você e ' || v_req.from_child_name || ' agora são amigos 🎉',
          jsonb_build_object('friend_id', v_req.from_child_id, 'friend_name', v_req.from_child_name)
        );
        
        -- Also notify Sender about the "Social Event" specifically? 
        -- The "friend_accept" might be enough, but let's add a consistent 'friend_activity' for them too if we want the "now friends" message.
        -- Let's stick to 'friend_accept' for sender as the primary notification, but maybe format it similarly in UI.
        -- Actually, the PRD says: "Exibir microcopy social quando houver evento recente: “Você tem um novo amigo 🎉”"
        -- This implies we might want a 'friend_activity' type for BOTH to drive that microcopy.
        
        -- Let's add 'friend_activity' for sender too, instead of just 'friend_accept', or in addition.
        -- If we add both, they get 2 notifications. Let's just use 'friend_activity' for the sender too, or 'friend_accept' IS the activity.
        -- The UI can display 'friend_accept' as "Você tem um novo amigo!".
        
        -- For simplicity and complying with PRD "has_new_social_event = true", we return it.

        RETURN jsonb_build_object('success', true, 'status', 'accepted', 'has_new_social_event', true);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Parent Respond Request (Update to include notifications)
CREATE OR REPLACE FUNCTION public.rpc_parent_respond_friend_request(
  p_request_id uuid,
  p_action text
)
RETURNS JSONB AS $$
DECLARE
  v_parent uuid;
  v_req RECORD;
  v_to_child_name TEXT;
  v_from_child_name TEXT;
BEGIN
  v_parent := auth.uid();
  
  SELECT fr.*, c_to.name as to_child_name, c_from.name as from_child_name
  INTO v_req 
  FROM public.friend_requests fr
  JOIN public.children c_to ON fr.to_child_id = c_to.id
  JOIN public.children c_from ON fr.from_child_id = c_from.id
  WHERE fr.id = p_request_id;

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

    -- NOTIFICATIONS
    -- 1. Notify Sender (Acceptance)
    INSERT INTO public.child_notifications (child_id, type, message, metadata)
    VALUES (
      v_req.from_child_id, 
      'friend_accept', 
      v_req.to_child_name || ' (Responsável) aceitou seu convite!', 
      jsonb_build_object('friend_id', v_req.to_child_id, 'friend_name', v_req.to_child_name)
    );

    -- 2. Notify Receiver (Your parent accepted a friend)
    INSERT INTO public.child_notifications (child_id, type, message, metadata)
    VALUES (
      v_req.to_child_id,
      'friend_activity',
      'Seu responsável aprovou a amizade com ' || v_req.from_child_name || ' 🎉',
      jsonb_build_object('friend_id', v_req.from_child_id, 'friend_name', v_req.from_child_name)
    );

    RETURN jsonb_build_object('success', true, 'status', 'accepted', 'has_new_social_event', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
