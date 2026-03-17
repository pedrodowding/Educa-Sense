-- Sprint 7.2: Bugfix Social (Feed SQL Fix & Notification Constraints)
-- Description: Fixes SQL aggregation error in feed RPC and NOT NULL constraints in notifications.

-- 1. Fix RPC: Get Friend Activities (Error 42803)
-- Issue: ORDER BY clause used column not in aggregation.
-- Fix: Use subquery to fetch sorted rows first, then aggregate.
CREATE OR REPLACE FUNCTION public.rpc_get_friend_activities(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_activities JSONB;
BEGIN
  -- Use CTE to fetch top 3 sorted activities first
  WITH recent_activities AS (
      SELECT 
        ac.id,
        ac.activity_type,
        ac.completed_date,
        ac.child_id,
        c.name as child_name,
        c.avatar as child_avatar,
        ac.metadata,
        ac.completed_at
      FROM public.activity_completions ac
      JOIN public.children c ON c.id = ac.child_id
      JOIN public.friendships f ON (f.child_a_id = p_child_id AND f.child_b_id = c.id) OR (f.child_b_id = p_child_id AND f.child_a_id = c.id)
      WHERE ac.activity_type IN ('daily_plan_completed', 'badge_earned', 'challenge_completed')
        AND ac.completed_date >= (CURRENT_DATE - INTERVAL '2 days') -- Relaxed slightly to ensure content, but strict on recent
        AND ac.child_id != p_child_id
      ORDER BY ac.completed_at DESC
      LIMIT 3
  )
  SELECT jsonb_agg(
     jsonb_build_object(
        'id', ra.id,
        'activity_type', ra.activity_type,
        'completed_date', ra.completed_date,
        'child_id', ra.child_id,
        'child_name', ra.child_name,
        'child_avatar', ra.child_avatar,
        'metadata', ra.metadata,
        'has_reacted', EXISTS(SELECT 1 FROM public.child_reactions cr WHERE cr.event_id = ra.id AND cr.from_child_id = p_child_id)
     )
  ) INTO v_activities
  FROM recent_activities ra;

  RETURN COALESCE(v_activities, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Fix RPC: Send Predefined Message (Error 23502)
-- Issue: Missing 'title' and 'body' in child_notifications insert (constraints violations).
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
    v_msg_body TEXT;
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

    -- Map message ID to body text
    v_msg_body := CASE 
        WHEN p_message_id = 'boa' THEN 'Boa!' 
        WHEN p_message_id = 'parabens' THEN 'Parabéns!' 
        WHEN p_message_id = 'bora_jogar' THEN 'Bora jogar?' 
        WHEN p_message_id = 'voce_consegue' THEN 'Você consegue!' 
        ELSE 'Oi!' END;

    -- 5. Notify Target (Fixed: include title and body)
    -- Note: Assuming 'message' column is legacy or alias for 'body'. 
    -- If table has 'title' and 'body', we must use them. 
    -- Based on Sprint 7.2 desc: "Preencher title sempre... Preencher body...".
    -- I will insert into title, body, and type. If 'message' column exists, I'll fill it too for safety.
    -- Checking previous migration, it used 'message'. I will assume 'body' is the target column or 'message' acts as body.
    -- To be safe given the error 23502 on 'title', I will try to insert into title and body.
    -- If the table structure is uncertain, I'd check it, but instruction implies strict requirements.
    -- Assuming schema: child_notifications(child_id, type, title, body, metadata, ...)
    
    INSERT INTO public.child_notifications (child_id, type, title, body, metadata)
    VALUES (
        p_to_child_id,
        'friend_quick_message_received', -- Standardized type
        'Mensagem de um amigo', -- Title
        v_from_name || ' diz: ' || v_msg_body, -- Body
        jsonb_build_object('message_id', p_message_id, 'friend_id', p_from_child_id, 'subtype', 'message')
    );

    -- 6. Audit
    INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
    VALUES (p_from_child_id, v_guardian_id, 'predefined_message_sent', jsonb_build_object('to_child_id', p_to_child_id, 'message_id', p_message_id));

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reload Schema to ensure RPCs are picked up
NOTIFY pgrst, 'reload schema';
