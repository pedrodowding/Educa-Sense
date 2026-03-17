-- Sprint 7.3: Fix Notifications Contract (Compatibility & Security)
-- Description: Ensures 'body' column exists for legacy/RPC compatibility, fixes RPCs, and enforces social rules.

-- 1. Schema Compatibility: Ensure 'body' and 'message' exist and are synced
DO $$
BEGIN
    -- Ensure 'body' exists (Legacy/Error 42703 fix)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'child_notifications' 
        AND column_name = 'body'
    ) THEN
        ALTER TABLE public.child_notifications ADD COLUMN body TEXT DEFAULT '';
    END IF;

    -- Ensure 'message' exists (New standard)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'child_notifications' 
        AND column_name = 'message'
    ) THEN
        ALTER TABLE public.child_notifications ADD COLUMN message TEXT;
    END IF;

    -- Backfill/Sync: body <- message (if body empty)
    UPDATE public.child_notifications 
    SET body = message 
    WHERE (body IS NULL OR body = '') AND message IS NOT NULL;

    -- Backfill/Sync: message <- body (if message empty)
    UPDATE public.child_notifications 
    SET message = body 
    WHERE (message IS NULL OR message = '') AND body IS NOT NULL;

    -- Ensure 'title' exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'child_notifications' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE public.child_notifications ADD COLUMN title TEXT DEFAULT 'Nova notificação';
    END IF;
END $$;

-- 2. Secure RPC: send_predefined_message
-- Note: We maintain p_from_child_id because current Auth architecture (Parent-based) 
-- does not provide a native current_child_id() session function for Student Mode.
-- However, we strictly validate permissions and logic.
CREATE OR REPLACE FUNCTION public.rpc_send_predefined_message(
    p_from_child_id UUID,
    p_to_child_id UUID,
    p_message_id TEXT
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

    -- 5. Notify Target (Filling BOTH body and message for compatibility)
    INSERT INTO public.child_notifications (child_id, type, title, message, body, metadata)
    VALUES (
        p_to_child_id,
        'friend_activity',
        'Mensagem de um amigo',
        v_from_name || ' diz: ' || v_msg_text, -- message
        v_from_name || ' diz: ' || v_msg_text, -- body (fix for 42703)
        jsonb_build_object('message_id', p_message_id, 'friend_id', p_from_child_id, 'subtype', 'message')
    );

    -- 6. Audit
    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (p_from_child_id, v_guardian_id, 'predefined_message_sent', jsonb_build_object('to_child_id', p_to_child_id, 'message_id', p_message_id));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure list_notifications returns all columns
-- Drop first to avoid 42P13 (cannot remove parameter defaults from existing function)
DROP FUNCTION IF EXISTS public.rpc_list_notifications(uuid, integer);

CREATE OR REPLACE FUNCTION public.rpc_list_notifications(
  p_child_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS SETOF public.child_notifications AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.child_notifications
  WHERE child_id = p_child_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reload Schema
NOTIFY pgrst, 'reload schema';
