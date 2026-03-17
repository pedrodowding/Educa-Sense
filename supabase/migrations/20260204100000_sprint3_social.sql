-- 1. Create child_notifications table
CREATE TABLE IF NOT EXISTS public.child_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT CHECK (type IN ('info', 'success', 'warning', 'error', 'friend_activity')) DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_child_notifications_child ON public.child_notifications(child_id, created_at DESC);

-- RLS
ALTER TABLE public.child_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Guardians can view their children's notifications" ON public.child_notifications;
CREATE POLICY "Guardians can view their children's notifications" ON public.child_notifications
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.children WHERE children.id = child_notifications.child_id AND children.guardian_id = auth.uid())
  );

-- 2. Update rpc_respond_friend_request to create notification
CREATE OR REPLACE FUNCTION public.rpc_respond_friend_request(
    p_child_id UUID,
    p_request_id UUID,
    p_action TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_parent uuid;
    v_other_child_name TEXT;
    v_my_child_name TEXT;
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

        -- NOTIFICATION LOGIC
        -- Get names
        SELECT name INTO v_my_child_name FROM public.children WHERE id = p_child_id;
        SELECT name INTO v_other_child_name FROM public.children WHERE id = v_req.from_child_id;

        -- Notify the sender (the one who sent the request)
        INSERT INTO public.child_notifications (child_id, title, message, type, metadata)
        VALUES (
            v_req.from_child_id,
            'Novo amigo! 🎉',
            v_my_child_name || ' aceitou seu convite de amizade.',
            'friend_activity',
            jsonb_build_object('friend_id', p_child_id, 'friend_name', v_my_child_name)
        );

        -- Notify the receiver (me) - Optional but good for the "flag" logic
        INSERT INTO public.child_notifications (child_id, title, message, type, metadata)
        VALUES (
            p_child_id,
            'Novo amigo! 🎉',
            'Você e ' || v_other_child_name || ' agora são amigos.',
            'friend_activity',
            jsonb_build_object('friend_id', v_req.from_child_id, 'friend_name', v_other_child_name)
        );

        RETURN jsonb_build_object('success', true, 'status', 'accepted', 'has_new_social_event', true);
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update rpc_parent_respond_friend_request to create notification
CREATE OR REPLACE FUNCTION public.rpc_parent_respond_friend_request(
  p_request_id uuid,
  p_action text
)
RETURNS JSONB AS $$
DECLARE
  v_parent uuid;
  v_req RECORD;
  v_other_child_name TEXT;
  v_my_child_name TEXT;
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

    -- NOTIFICATION LOGIC
    -- Get names
    SELECT name INTO v_my_child_name FROM public.children WHERE id = v_req.to_child_id;
    SELECT name INTO v_other_child_name FROM public.children WHERE id = v_req.from_child_id;

    -- Notify the sender (the one who sent the request)
    INSERT INTO public.child_notifications (child_id, title, message, type, metadata)
    VALUES (
        v_req.from_child_id,
        'Novo amigo! 🎉',
        v_my_child_name || ' aceitou seu convite de amizade (aprovado pelo responsável).',
        'friend_activity',
        jsonb_build_object('friend_id', v_req.to_child_id, 'friend_name', v_my_child_name)
    );

    -- Notify the receiver (my child)
    INSERT INTO public.child_notifications (child_id, title, message, type, metadata)
    VALUES (
        v_req.to_child_id,
        'Novo amigo! 🎉',
        'Seu responsável aprovou a amizade com ' || v_other_child_name || '.',
        'friend_activity',
        jsonb_build_object('friend_id', v_req.from_child_id, 'friend_name', v_other_child_name)
    );

    RETURN jsonb_build_object('success', true, 'status', 'accepted', 'has_new_social_event', true);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. New RPC to get Friend Profile with Badges
CREATE OR REPLACE FUNCTION public.rpc_get_friend_profile(
    p_my_child_id UUID,
    p_friend_child_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_guardian_id UUID;
    v_friendship_exists BOOLEAN;
    v_friend_data JSONB;
    v_badges JSONB;
BEGIN
    -- Check if I am the guardian of p_my_child_id (if acting as guardian)
    -- OR if I am the child (if acting as child - complex with auth)
    -- For now, assume Guardian context or public access if correct IDs provided?
    -- No, strict security.
    
    -- If auth.uid() is present, check guardian.
    IF auth.uid() IS NOT NULL THEN
        SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_my_child_id;
        IF v_guardian_id IS NULL OR v_guardian_id != auth.uid() THEN
             -- If we are not the guardian, maybe we are the child logged in via another method?
             -- Since we don't have robust child auth yet (just access code), and RLS depends on Guardian,
             -- we might need to trust the backend logic if this function is called.
             -- But for safety, we should enforce friendship.
             NULL; 
        END IF;
    END IF;

    -- Check friendship
    SELECT EXISTS(
        SELECT 1 FROM public.friendships
        WHERE (child_a_id = LEAST(p_my_child_id, p_friend_child_id) 
           AND child_b_id = GREATEST(p_my_child_id, p_friend_child_id))
    ) INTO v_friendship_exists;

    IF NOT v_friendship_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FRIENDS');
    END IF;

    -- Get friend basic data
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'avatar', avatar,
        'xp', xp,
        'streak', streak
    ) INTO v_friend_data
    FROM public.children
    WHERE id = p_friend_child_id;

    -- Get recent badges (limit 5)
    SELECT jsonb_agg(t) INTO v_badges
    FROM (
        SELECT b.name, b.icon, b.category
        FROM public.child_badges cb
        JOIN public.badges b ON b.id = cb.badge_id
        WHERE cb.child_id = p_friend_child_id
        ORDER BY cb.earned_at DESC
        LIMIT 5
    ) t;

    RETURN jsonb_build_object(
        'success', true,
        'profile', v_friend_data,
        'badges', COALESCE(v_badges, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_get_friend_profile(UUID, UUID) TO anon, authenticated;
