-- Robust Reset Day RPC
-- Handles daily progress reset for debugging and testing purposes.
-- Clears: activity_completions, daily_checkins, child_activity_events, child_daily_rewards, activity_events
-- Preserves: child_progress (Total XP), album, stories.

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
  -- 0. Validar Guardian (Auth Check)
  SELECT guardian_id INTO v_guardian_id
  FROM public.children
  WHERE id = p_child_id;

  IF v_guardian_id IS NULL THEN
     RETURN jsonb_build_object('success', false, 'error', 'Child not found');
  END IF;

  -- Verifica se o usuário logado é o responsável pela criança
  -- (Comentado para permitir uso por Admin se necessário, mas idealmente descomentar para produção)
  -- IF auth.uid() != v_guardian_id THEN
  --    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
  -- END IF;

  -- 1. Activity Completions (Tabela principal do progresso diário - Plano 0/3)
  DELETE FROM public.activity_completions
  WHERE child_id = p_child_id 
  AND completed_date = v_today;
  GET DIAGNOSTICS v_deleted_completions = ROW_COUNT;

  -- 2. Daily Checkins
  -- CORREÇÃO: Converter v_today (DATE) para TEXT (YYYY-MM-DD) pois a coluna 'date' é TEXT
  DELETE FROM public.daily_checkins
  WHERE child_id = p_child_id 
  AND date = TO_CHAR(v_today, 'YYYY-MM-DD');
  GET DIAGNOSTICS v_deleted_checkins = ROW_COUNT;

  -- 3. Child Activity Events
  DELETE FROM public.child_activity_events
  WHERE child_id = p_child_id 
  AND created_at::DATE = v_today;
  GET DIAGNOSTICS v_deleted_child_events = ROW_COUNT;

  -- 4. Child Daily Rewards
  DELETE FROM public.child_daily_rewards
  WHERE child_id = p_child_id 
  AND reward_date = v_today;
  GET DIAGNOSTICS v_deleted_rewards = ROW_COUNT;

  -- 5. Activity Events (School Module Link)
  DELETE FROM public.activity_events
  WHERE student_id IN (SELECT id FROM public.students WHERE child_id = p_child_id)
  AND created_at::DATE = v_today;
  GET DIAGNOSTICS v_deleted_school_events = ROW_COUNT;

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

-- Grant permissions explicitly
GRANT EXECUTE ON FUNCTION public.rpc_reset_day(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_reset_day(UUID) TO service_role;

-- Force schema reload
NOTIFY pgrst, 'reload schema';
