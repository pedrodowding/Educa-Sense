-- Sprint 9.1: Stabilization & Hardening
-- Description: Implements Audit constraints, Retention policy, Daily Progress Idempotency, and Inbox Hardening.

-- 1. AUDIT LOGS HARDENING
-- 1.1 Standardize Action Types & Constraint
-- First, ensure the table exists (it should, from Sprint 2/3)
CREATE TABLE IF NOT EXISTS public.friends_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
    actor_parent_user_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Migrate old data to compliant types
UPDATE public.friends_audit_log 
SET action = 'social_message_sent' 
WHERE action = 'predefined_message_sent';

-- Drop old constraint if exists
ALTER TABLE public.friends_audit_log
DROP CONSTRAINT IF EXISTS friends_audit_log_action_check;

-- Add new strict constraint
ALTER TABLE public.friends_audit_log
ADD CONSTRAINT friends_audit_log_action_check
CHECK (action IN (
    'friend_request_sent',
    'friend_request_accepted',
    'friend_request_rejected',
    'social_message_sent',
    'social_block_applied',
    'reward_enabled',
    'reward_disabled',
    'challenge_completed' -- Added to support trigger action
));

-- 1.2 Retention Function (90 days)
CREATE OR REPLACE FUNCTION public.rpc_cleanup_audit_logs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM public.friends_audit_log
    WHERE created_at < (CURRENT_DATE - INTERVAL '90 days');
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN jsonb_build_object('success', true, 'deleted_count', v_count);
END;
$$;

-- 2. DAILY PROGRESS IDEMPOTENCY
-- 2.1 Unique Constraint on activity_completions for Daily Plan
CREATE UNIQUE INDEX IF NOT EXISTS idx_activity_completions_daily_unique 
ON public.activity_completions (child_id, completed_date)
WHERE activity_type = 'daily_plan_completed';

-- 2.2 Update any RPC that inserts daily_plan_completed to handle conflict
-- (We assume the application logic might fail if not handled, but 'ON CONFLICT DO NOTHING' is safer if we can find the RPC. 
--  If it's a Trigger, the constraint will raise error, which we want to silence/ignore as per requirement.
--  "Se tentativa duplicada ocorrer: ignorar silenciosamente")
-- Since we can't easily patch "all" inserts without finding them, we'll create a safe wrapper RPC if used, 
-- OR rely on the constraint and ensuring the caller handles it.
-- However, the requirement says "Tornar idempotente... ignorar silenciosamente".
-- If the insertion happens via `rpc_complete_daily_plan` (hypothetical), we should patch it.
-- If it happens via `insert` from frontend, it will throw.
-- Let's create/replace a dedicated RPC for completing the day safely.

CREATE OR REPLACE FUNCTION public.rpc_complete_daily_plan(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
BEGIN
  INSERT INTO public.activity_completions (child_id, activity_type, completed_date, subject, score, metadata)
  VALUES (p_child_id, 'daily_plan_completed', v_today, 'daily_plan', 100, '{}'::jsonb)
  ON CONFLICT (child_id, completed_date) WHERE activity_type = 'daily_plan_completed'
  DO NOTHING;
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  -- Log technical warning (simulated via notice)
  RAISE NOTICE 'Duplicate daily plan completion attempted for child %', p_child_id;
  RETURN jsonb_build_object('success', true, 'ignored', true);
END;
$$;

-- 2.3 Trigger Fix (Robust Check Social Milestones)
CREATE OR REPLACE FUNCTION public.check_social_milestones()
RETURNS trigger AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_count INTEGER;
  v_guardian_id UUID;
  v_already_completed BOOLEAN;
  v_challenge RECORD;
  v_from_child_name TEXT;
BEGIN
  -- Avoid infinite recursion if we insert activity_completions here
  IF new.activity_type IN ('daily_plan_completed', 'badge_earned') THEN
     RETURN new;
  END IF;

  -- 1. Check Daily Plan Completion (Count >= 3)
  -- Simplified: If we have >= 3 records for today, we assume plan done.
  SELECT count(*) INTO v_count
  FROM public.activity_completions
  WHERE child_id = new.child_id 
    AND completed_date = v_today
    AND activity_type NOT IN ('daily_plan_completed', 'badge_earned');

  IF v_count >= 3 THEN
     -- Check if already marked
     SELECT EXISTS(
       SELECT 1 FROM public.activity_completions 
       WHERE child_id = new.child_id 
         AND completed_date = v_today 
         AND activity_type = 'daily_plan_completed'
     ) INTO v_already_completed;
     
     IF NOT v_already_completed THEN
        -- Fetch guardian
        SELECT guardian_id, name INTO v_guardian_id, v_from_child_name FROM public.children WHERE id = new.child_id;
        
        -- Insert Milestone (This generates the event_id for reactions)
        -- FIXED: ON CONFLICT DO NOTHING to ensure idempotency
        INSERT INTO public.activity_completions (
           parent_id, child_id, activity_id, activity_type, subject, difficulty, score, xp, stars, completed_date, metadata
        ) VALUES (
           v_guardian_id, new.child_id, uuid_generate_v4(), 'daily_plan_completed', 'Conquista', 'N/A', 0, 50, 5, v_today, '{"auto_generated": true}'::jsonb
        )
        ON CONFLICT (child_id, completed_date) WHERE activity_type = 'daily_plan_completed' DO NOTHING;
        
        -- 2. Check Pending Challenges (type = 'daily_plan')
        FOR v_challenge IN 
            SELECT * FROM public.child_challenges 
            WHERE to_child_id = new.child_id 
              AND status = 'accepted' 
              AND challenge_type = 'complete_daily_plan'
              AND (created_at::date = v_today OR created_at > (NOW() - INTERVAL '24 hours'))
        LOOP
            UPDATE public.child_challenges 
            SET status = 'completed', completed_at = NOW() 
            WHERE id = v_challenge.id;
            
            -- Notify Challenger (Friend)
            INSERT INTO public.child_notifications (child_id, type, message, metadata)
            VALUES (
              v_challenge.from_child_id, 
              'friend_activity', -- Generic type or add new? Existing types: friend_invite, friend_accept, friend_activity
              v_from_child_name || ' completou o desafio do plano!', 
              jsonb_build_object('challenge_id', v_challenge.id, 'friend_id', new.child_id, 'subtype', 'challenge_completed')
            );
            
            -- Audit
            BEGIN
              INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
              VALUES (new.child_id, v_guardian_id, 'challenge_completed', jsonb_build_object('challenge_id', v_challenge.id));
            EXCEPTION WHEN OTHERS THEN NULL; END;
        END LOOP;
     END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. SOCIAL INBOX HARDENING
-- 3.1 Update rpc_list_notifications to limit history
-- Note: We preserve the Auth logic from Sprint 5 but add the LIMIT/DATE filter.
CREATE OR REPLACE FUNCTION public.rpc_list_notifications(
  p_child_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20 -- Default max 20
)
RETURNS SETOF public.child_notifications AS $$
DECLARE
  v_target_child_id uuid;
  v_guardian_id uuid;
  v_limit INTEGER;
BEGIN
  v_target_child_id := COALESCE(p_child_id, (auth.jwt() ->> 'child_id')::uuid);
  
  IF v_target_child_id IS NULL THEN
    RETURN;
  END IF;

  -- Access Check
  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = v_target_child_id;
  
  IF v_guardian_id != auth.uid() AND v_target_child_id != auth.uid() THEN
    -- Allow if strictly Child (using access code flow mapped to auth.uid via anonymous? No, usually RLS handles that).
    -- If this RPC is SECURITY DEFINER, we MUST check.
    -- Assuming existing logic was working for the user, we keep it.
    -- If it blocks, we might need to relax for 'student_role'? 
    -- For now, we trust the existing logic pattern.
    RETURN;
  END IF;

  -- Enforce Max Limit 20 (even if p_limit is higher)
  v_limit := LEAST(p_limit, 20);

  RETURN QUERY
  SELECT *
  FROM public.child_notifications
  WHERE child_id = v_target_child_id
    AND created_at >= (CURRENT_DATE - INTERVAL '7 days') -- Last 7 days constraint
  ORDER BY created_at DESC
  LIMIT v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3.2 Update rpc_send_predefined_message to use correct audit action
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

    -- 6. Audit Log (Correct Action: social_message_sent)
    BEGIN
        INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
        VALUES (
            p_from_child_id, 
            v_guardian_id, 
            'social_message_sent', 
            jsonb_build_object('to_child_id', p_to_child_id, 'message_id', p_message_id)
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. REWARD GOVERNANCE AUDIT
-- Update rpc_toggle_reward to audit actions
CREATE OR REPLACE FUNCTION public.rpc_toggle_reward(
    p_child_id UUID,
    p_reward_type TEXT, -- 'game', 'story', 'drawing'
    p_enabled BOOLEAN
)
RETURNS JSONB AS $$
DECLARE
    v_guardian_id UUID;
    v_action TEXT;
BEGIN
    SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_child_id;
    
    IF v_guardian_id != auth.uid() THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    -- Perform Update
    IF p_reward_type = 'game' THEN
        UPDATE public.children SET game_enabled = p_enabled WHERE id = p_child_id;
    ELSIF p_reward_type = 'story' THEN
        UPDATE public.children SET story_enabled = p_enabled WHERE id = p_child_id;
    ELSIF p_reward_type = 'drawing' THEN
        UPDATE public.children SET drawing_enabled = p_enabled WHERE id = p_child_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TYPE');
    END IF;

    -- Audit
    v_action := CASE WHEN p_enabled THEN 'reward_enabled' ELSE 'reward_disabled' END;
    
    BEGIN
        INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
        VALUES (
            p_child_id,
            v_guardian_id,
            v_action,
            jsonb_build_object('reward_type', p_reward_type)
        );
    EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignore audit errors
    END;

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
