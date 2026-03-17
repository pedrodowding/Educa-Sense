-- Sprint Audit 1-9: Stabilization & Hardening
-- Description: Consolidates Social, Rewards, and Fixes UX gaps.

-- 1. SOCIAL CONSOLIDATION
-- 1.1 Update child_notifications constraint to support 'social_message'
ALTER TABLE public.child_notifications 
DROP CONSTRAINT IF EXISTS child_notifications_type_check;

ALTER TABLE public.child_notifications 
ADD CONSTRAINT child_notifications_type_check 
CHECK (type IN ('info', 'success', 'warning', 'error', 'friend_activity', 'social_message'));

-- 1.2 Fix rpc_send_predefined_message to use 'social_message' and safe audit
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

    -- 4. Map Message ID to Text
    v_msg_text := CASE 
        WHEN p_message_id = 'boa' THEN 'Boa! 👍' 
        WHEN p_message_id = 'parabens' THEN 'Parabéns! 🎉' 
        WHEN p_message_id = 'bora_jogar' THEN 'Bora jogar? 🎮' 
        WHEN p_message_id = 'voce_consegue' THEN 'Você consegue! 🚀'
        WHEN p_message_id = 'oi' THEN 'Oi! 👋'
        ELSE 'Mandou um oi!'
    END;

    -- 5. Send Notification (Type: social_message)
    INSERT INTO public.child_notifications (child_id, title, message, type, metadata)
    VALUES (
        p_to_child_id,
        'Nova mensagem de ' || v_from_name,
        v_msg_text,
        'social_message',
        jsonb_build_object(
            'from_child_id', p_from_child_id, 
            'from_child_name', v_from_name,
            'message_id', p_message_id
        )
    );

    -- 6. Audit Log (Best Effort / Safe)
    BEGIN
        INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
        VALUES (
            p_from_child_id, 
            v_guardian_id, 
            'predefined_message_sent', 
            jsonb_build_object('to_child_id', p_to_child_id, 'message_id', p_message_id)
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignore audit failure to not block UX
        NULL;
    END;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. REWARD GOVERNANCE
-- 2.1 Add enabled flags to children
ALTER TABLE public.children 
ADD COLUMN IF NOT EXISTS story_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS drawing_enabled BOOLEAN DEFAULT TRUE;
-- game_enabled already exists

-- 2.2 RPC to get active rewards
CREATE OR REPLACE FUNCTION public.rpc_get_active_rewards(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_game BOOLEAN;
    v_story BOOLEAN;
    v_drawing BOOLEAN;
    v_list TEXT[] := ARRAY[]::TEXT[];
BEGIN
    SELECT game_enabled, story_enabled, drawing_enabled 
    INTO v_game, v_story, v_drawing
    FROM public.children 
    WHERE id = p_child_id;

    IF NOT FOUND THEN
        RETURN '[]'::jsonb;
    END IF;

    IF v_game THEN v_list := array_append(v_list, 'game'); END IF;
    IF v_story THEN v_list := array_append(v_list, 'story'); END IF;
    IF v_drawing THEN v_list := array_append(v_list, 'drawing'); END IF;

    RETURN to_jsonb(v_list);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.3 RPC to toggle reward (Parent Control)
CREATE OR REPLACE FUNCTION public.rpc_toggle_reward(
    p_child_id UUID,
    p_reward_type TEXT, -- 'game', 'story', 'drawing'
    p_enabled BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_guardian_id UUID;
BEGIN
    SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_child_id;
    
    IF v_guardian_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    IF p_reward_type = 'game' THEN
        UPDATE public.children SET game_enabled = p_enabled WHERE id = p_child_id;
    ELSIF p_reward_type = 'story' THEN
        UPDATE public.children SET story_enabled = p_enabled WHERE id = p_child_id;
    ELSIF p_reward_type = 'drawing' THEN
        UPDATE public.children SET drawing_enabled = p_enabled WHERE id = p_child_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TYPE');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. SCHOOL WALL FIX
-- Ensure no crash if guardian not linked (Handled in frontend, but backend view should be safe)
-- (No specific SQL needed, handled by RLS returning empty)


NOTIFY pgrst, 'reload schema';
