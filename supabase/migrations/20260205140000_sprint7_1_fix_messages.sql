-- Sprint 7.1: Fix Predefined Message RPC
-- Description: Fixes validation for friendship and social settings for both parties.

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

    -- 5. Notify Target
    INSERT INTO public.child_notifications (child_id, type, message, metadata)
    VALUES (
        p_to_child_id,
        'friend_activity',
        v_from_name || ' diz: ' || CASE 
            WHEN p_message_id = 'boa' THEN 'Boa!' 
            WHEN p_message_id = 'parabens' THEN 'Parabéns!' 
            WHEN p_message_id = 'bora_jogar' THEN 'Bora jogar?' 
            WHEN p_message_id = 'voce_consegue' THEN 'Você consegue!' 
            ELSE 'Oi!' END,
        jsonb_build_object('message_id', p_message_id, 'friend_id', p_from_child_id, 'subtype', 'message')
    );

    -- 6. Audit
    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (p_from_child_id, v_guardian_id, 'predefined_message_sent', jsonb_build_object('to_child_id', p_to_child_id, 'message_id', p_message_id));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
