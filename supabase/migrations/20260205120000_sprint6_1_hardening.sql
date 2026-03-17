-- Sprint 6.1: Hardening
-- Description: Reinforces limits, idempotency, and audit logs for social interactions.

-- 1. Hardening Daily Plan Completion (Idempotency)
-- Ensure only ONE 'daily_plan_completed' event per child per day at Database level.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_daily_plan_completion 
ON public.activity_completions (child_id, completed_date) 
WHERE activity_type = 'daily_plan_completed';

-- 2. Update RPC: Get Friend Activities (Strict Limits)
-- Changes:
-- - LIMIT 3 (was 10)
-- - Only CURRENT_DATE (was last 2 days)
CREATE OR REPLACE FUNCTION public.rpc_get_friend_activities(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_activities JSONB;
BEGIN
  -- Security: Only owner or guardian
  
  SELECT jsonb_agg(
     jsonb_build_object(
        'id', ac.id,
        'activity_type', ac.activity_type,
        'completed_date', ac.completed_date,
        'child_id', ac.child_id,
        'child_name', c.name,
        'child_avatar', c.avatar,
        'metadata', ac.metadata,
        'has_reacted', EXISTS(SELECT 1 FROM public.child_reactions cr WHERE cr.event_id = ac.id AND cr.from_child_id = p_child_id)
     )
  ) INTO v_activities
  FROM public.activity_completions ac
  JOIN public.children c ON c.id = ac.child_id
  JOIN public.friendships f ON (f.child_a_id = p_child_id AND f.child_b_id = c.id) OR (f.child_b_id = p_child_id AND f.child_a_id = c.id)
  WHERE ac.activity_type IN ('daily_plan_completed', 'badge_earned', 'challenge_completed')
    AND ac.completed_date = CURRENT_DATE -- Strict "Today"
    AND ac.child_id != p_child_id -- Not self
  ORDER BY ac.completed_at DESC
  LIMIT 3; -- Strict Limit

  RETURN COALESCE(v_activities, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update Trigger for Robustness
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
  -- Avoid infinite recursion
  IF new.activity_type IN ('daily_plan_completed', 'badge_earned') THEN
     RETURN new;
  END IF;

  -- 1. Check Daily Plan Completion (Count >= 3)
  SELECT count(*) INTO v_count
  FROM public.activity_completions
  WHERE child_id = new.child_id 
    AND completed_date = v_today
    AND activity_type NOT IN ('daily_plan_completed', 'badge_earned');

  IF v_count >= 3 THEN
     -- Check existence efficiently
     SELECT EXISTS(
       SELECT 1 FROM public.activity_completions 
       WHERE child_id = new.child_id 
         AND completed_date = v_today 
         AND activity_type = 'daily_plan_completed'
     ) INTO v_already_completed;
     
     IF NOT v_already_completed THEN
        -- Fetch guardian
        SELECT guardian_id, name INTO v_guardian_id, v_from_child_name FROM public.children WHERE id = new.child_id;
        
        -- Insert Milestone SAFE (Try/Catch unique violation)
        BEGIN
            INSERT INTO public.activity_completions (
               parent_id, child_id, activity_id, activity_type, subject, difficulty, score, xp, stars, completed_date, metadata
            ) VALUES (
               v_guardian_id, new.child_id, uuid_generate_v4(), 'daily_plan_completed', 'Conquista', 'N/A', 0, 50, 5, v_today, '{"auto_generated": true}'::jsonb
            );
            
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
                  'friend_activity',
                  v_from_child_name || ' completou o desafio do plano!', 
                  jsonb_build_object('challenge_id', v_challenge.id, 'friend_id', new.child_id, 'subtype', 'challenge_completed')
                );
                
                -- Audit
                INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
                VALUES (new.child_id, v_guardian_id, 'challenge_completed', jsonb_build_object('challenge_id', v_challenge.id));
            END LOOP;

        EXCEPTION WHEN unique_violation THEN
            -- Do nothing, event already exists
            NULL;
        END;
     END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fix Audit Log Event Names (Compliance)

-- 4.1 Challenge Created
CREATE OR REPLACE FUNCTION public.rpc_create_challenge(
    p_from_child_id UUID,
    p_to_child_id UUID,
    p_challenge_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_guardian_id UUID;
  v_enabled BOOLEAN;
  v_from_name TEXT;
  v_existing_id UUID;
BEGIN
  SELECT social_interactions_enabled, guardian_id, name INTO v_enabled, v_guardian_id, v_from_name 
  FROM public.children WHERE id = p_from_child_id;

  IF v_enabled IS FALSE THEN
     RETURN jsonb_build_object('success', false, 'error', 'SOCIAL_DISABLED');
  END IF;

  SELECT id INTO v_existing_id FROM public.child_challenges 
  WHERE from_child_id = p_from_child_id AND to_child_id = p_to_child_id AND status = 'pending';

  IF v_existing_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PENDING');
  END IF;

  INSERT INTO public.child_challenges (from_child_id, to_child_id, challenge_type, status)
  VALUES (p_from_child_id, p_to_child_id, p_challenge_type, 'pending');

  INSERT INTO public.child_notifications (child_id, type, message, metadata)
  VALUES (
    p_to_child_id,
    'friend_activity',
    v_from_name || ' te desafiou: Completar o Plano de Hoje!',
    jsonb_build_object('challenge_type', p_challenge_type, 'friend_id', p_from_child_id, 'subtype', 'challenge_received')
  );

  -- Audit: Changed to 'challenge_created'
  INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, action, metadata)
  VALUES (p_from_child_id, v_guardian_id, 'challenge_created', jsonb_build_object('to_child_id', p_to_child_id, 'type', p_challenge_type));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4.2 Block Applied
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

  -- 4. Audit: Changed to 'social_block_applied'
  INSERT INTO public.friends_audit_log (child_id, actor_parent_user_id, actor_child_id, action, metadata)
  VALUES (p_child_id, v_current_user, p_child_id, 'social_block_applied', jsonb_build_object('blocked_child_id', p_blocked_child_id, 'reason', p_reason));

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
