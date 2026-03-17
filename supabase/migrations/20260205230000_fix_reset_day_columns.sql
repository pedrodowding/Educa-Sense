-- Fix Reset Day & Debug Diagnostic
-- Standardizes column usage for daily checks and resets.

-- 1. Diagnostic Function: Check counts for today
CREATE OR REPLACE FUNCTION public.rpc_debug_check_day(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_count_progress INTEGER;
  v_count_completions INTEGER;
  v_count_checkins INTEGER;
  v_count_rewards INTEGER;
  v_count_child_events INTEGER;
  v_count_school_events INTEGER;
BEGIN
  -- Child Progress (Update check only, do not delete)
  -- Uses last_activity_at or updated_at
  SELECT COUNT(*) INTO v_count_progress
  FROM public.child_progress
  WHERE child_id = p_child_id
  AND (last_activity_at::DATE = v_today OR updated_at::DATE = v_today);

  -- Activity Completions (completed_date)
  SELECT COUNT(*) INTO v_count_completions
  FROM public.activity_completions
  WHERE child_id = p_child_id
  AND completed_date = v_today;

  -- Daily Checkins (date as text)
  SELECT COUNT(*) INTO v_count_checkins
  FROM public.daily_checkins
  WHERE child_id = p_child_id
  AND date = TO_CHAR(v_today, 'YYYY-MM-DD');

  -- Child Daily Rewards (reward_date)
  SELECT COUNT(*) INTO v_count_rewards
  FROM public.child_daily_rewards
  WHERE child_id = p_child_id
  AND reward_date = v_today;

  -- Child Activity Events (created_at)
  SELECT COUNT(*) INTO v_count_child_events
  FROM public.child_activity_events
  WHERE child_id = p_child_id
  AND created_at::DATE = v_today;

  -- School Activity Events (created_at)
  SELECT COUNT(*) INTO v_count_school_events
  FROM public.activity_events ae
  JOIN public.students s ON s.id = ae.student_id
  WHERE s.child_id = p_child_id
  AND ae.created_at::DATE = v_today;

  RETURN jsonb_build_object(
    'date', v_today,
    'child_progress_updates', v_count_progress,
    'activity_completions', v_count_completions,
    'daily_checkins', v_count_checkins,
    'child_daily_rewards', v_count_rewards,
    'child_activity_events', v_count_child_events,
    'activity_events', v_count_school_events
  );
END;
$$;

-- 2. Reset Function: Delete rows for today (Robust)
CREATE OR REPLACE FUNCTION public.rpc_reset_day(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_guardian_id UUID;
  v_deleted_completions INTEGER;
  v_deleted_checkins INTEGER;
  v_deleted_rewards INTEGER;
  v_deleted_child_events INTEGER;
  v_deleted_school_events INTEGER;
BEGIN
  -- Validation
  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_child_id;
  IF v_guardian_id IS NULL THEN
     RETURN jsonb_build_object('success', false, 'error', 'Child not found');
  END IF;

  -- 1. Activity Completions (completed_date)
  DELETE FROM public.activity_completions
  WHERE child_id = p_child_id 
  AND completed_date = v_today;
  GET DIAGNOSTICS v_deleted_completions = ROW_COUNT;

  -- 2. Daily Checkins (date as text)
  DELETE FROM public.daily_checkins
  WHERE child_id = p_child_id 
  AND date = TO_CHAR(v_today, 'YYYY-MM-DD');
  GET DIAGNOSTICS v_deleted_checkins = ROW_COUNT;

  -- 3. Child Activity Events (created_at)
  DELETE FROM public.child_activity_events
  WHERE child_id = p_child_id 
  AND created_at::DATE = v_today;
  GET DIAGNOSTICS v_deleted_child_events = ROW_COUNT;

  -- 4. Child Daily Rewards (reward_date)
  DELETE FROM public.child_daily_rewards
  WHERE child_id = p_child_id 
  AND reward_date = v_today;
  GET DIAGNOSTICS v_deleted_rewards = ROW_COUNT;

  -- 5. School Activity Events (created_at via students)
  DELETE FROM public.activity_events
  WHERE student_id IN (SELECT id FROM public.students WHERE child_id = p_child_id)
  AND created_at::DATE = v_today;
  GET DIAGNOSTICS v_deleted_school_events = ROW_COUNT;

  -- NOTE: We do NOT delete from child_progress as it stores cumulative XP.
  -- Deleting it would wipe the child's entire history/level.

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Daily progress reset successfully',
    'deleted_counts', jsonb_build_object(
      'activity_completions', v_deleted_completions,
      'daily_checkins', v_deleted_checkins,
      'child_activity_events', v_deleted_child_events,
      'child_daily_rewards', v_deleted_rewards,
      'activity_events', v_deleted_school_events
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_debug_check_day(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_debug_check_day(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.rpc_reset_day(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_reset_day(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
