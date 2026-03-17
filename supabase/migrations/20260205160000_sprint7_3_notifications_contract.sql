-- Sprint 7.3: Notifications Contract & Social UX Hardening
-- Description: Standardizes notification schema (title/message) and fixes RPCs to align with it.

-- 1. Standardize child_notifications Schema
-- Ensure 'title' exists and 'message' is the standard content column.
DO $$
BEGIN
    -- Add 'title' if it doesn't exist (Handling the case where 20260204120000 might have created it without title)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'child_notifications' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.child_notifications ADD COLUMN title TEXT DEFAULT 'Nova notificação';
    END IF;

    -- Ensure 'message' column exists (it should, but just in case)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'child_notifications' 
        AND column_name = 'message'
    ) THEN
        ALTER TABLE public.child_notifications ADD COLUMN message TEXT;
    END IF;
END $$;

-- 2. Fix RPC: Send Predefined Message (Align with Schema)
-- Uses 'title' and 'message' (instead of 'body')
CREATE OR REPLACE FUNCTION public.rpc_send_predefined_message(
    p_from_child_id UUID,
    p_to_child_id UUID,
    p_message_id TEXT -- 'boa', 'parabens', 'bora_jogar', 'voce_consegue'
)
RETURNS JSONB AS $$
DECLARE
    v_guardian_id UUID;
    v_enabled_from BOOLEAN;
    v_enabled_to BOOLEAN;
    v_from_name TEXT;
    v_daily_count INTEGER;
    v_is_friend BOOLEAN;
    v_msg_text TEXT;
BEGIN
    -- 1. Check Sender Social Settings
    SELECT social_interactions_enabled, guardian_id, name INTO v_enabled_from, v_guardian_id, v_from_name 
    FROM public.children WHERE id = p_from_child_id;

    IF v_enabled_from IS FALSE THEN
        RETURN jsonb_build_object('success', false, 'error', 'SOCIAL_DISABLED_SENDER');
    END IF;

    -- 2. Check Receiver Social Settings
    SELECT social_interactions_enabled INTO v_enabled_to
    FROM public.children WHERE id = p_to_child_id;

    IF v_enabled_to IS FALSE THEN
        RETURN jsonb_build_object('success', false, 'error', 'SOCIAL_DISABLED_RECEIVER');
    END IF;

    -- 3. Check Friendship Status
    SELECT EXISTS (
        SELECT 1 FROM public.friendships 
        WHERE (child_a_id = p_from_child_id AND child_b_id = p_to_child_id)
           OR (child_a_id = p_to_child_id AND child_b_id = p_from_child_id)
    ) INTO v_is_friend;

    IF NOT v_is_friend THEN
        RETURN jsonb_build_object('success', false, 'error', 'NOT_FRIENDS');
    END IF;

    -- 4. Check Limits (5 per day)
    SELECT COUNT(*) INTO v_daily_count
    FROM public.friends_audit_log
    WHERE child_id = p_from_child_id 
      AND action = 'predefined_message_sent'
      AND created_at > (NOW() - INTERVAL '1 day');

    IF v_daily_count >= 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'DAILY_LIMIT_REACHED');
    END IF;

    -- Map message ID to text
    v_msg_text := CASE 
        WHEN p_message_id = 'boa' THEN 'Boa!' 
        WHEN p_message_id = 'parabens' THEN 'Parabéns!' 
        WHEN p_message_id = 'bora_jogar' THEN 'Bora jogar?' 
        WHEN p_message_id = 'voce_consegue' THEN 'Você consegue!' 
        ELSE 'Oi!' END;

    -- 5. Notify Target (Using standard 'title' and 'message' columns)
    INSERT INTO public.child_notifications (child_id, type, title, message, metadata)
    VALUES (
        p_to_child_id,
        'friend_activity', -- Standard type
        'Mensagem de um amigo', -- Title
        v_from_name || ' diz: ' || v_msg_text, -- Message (mapped to 'message' column)
        jsonb_build_object('message_id', p_message_id, 'friend_id', p_from_child_id, 'subtype', 'message')
    );

    -- 6. Audit
    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (p_from_child_id, v_guardian_id, 'predefined_message_sent', jsonb_build_object('to_child_id', p_to_child_id, 'message_id', p_message_id));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reload Schema
NOTIFY pgrst, 'reload schema';
