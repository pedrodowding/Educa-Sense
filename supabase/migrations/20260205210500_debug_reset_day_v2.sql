-- Hotfix de Debug V2: Reset apenas do dia atual
-- Versão 2: Corrige erro de tipagem (text vs date) na tabela daily_checkins
-- E usa um novo nome de função para garantir que não haja conflito de cache/versão.

CREATE OR REPLACE FUNCTION rpc_debug_reset_daily_progress_v2(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_deleted_completions INTEGER;
  v_deleted_checkins INTEGER;
  v_deleted_rewards INTEGER;
  v_deleted_events INTEGER;
BEGIN
  -- 1. Activity Completions (Tabela principal do progresso diário - Plano 0/3)
  DELETE FROM public.activity_completions
  WHERE child_id = p_child_id 
  AND completed_date = v_today;
  GET DIAGNOSTICS v_deleted_completions = ROW_COUNT;

  -- 2. Daily Checkins
  -- CORREÇÃO CRÍTICA: Converter v_today (DATE) para TEXT (YYYY-MM-DD) pois a coluna 'date' é TEXT
  DELETE FROM public.daily_checkins
  WHERE child_id = p_child_id 
  AND date = TO_CHAR(v_today, 'YYYY-MM-DD');
  GET DIAGNOSTICS v_deleted_checkins = ROW_COUNT;

  -- 3. Child Activity Events
  DELETE FROM public.child_activity_events
  WHERE child_id = p_child_id 
  AND created_at::DATE = v_today;
  GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

  -- 4. Child Daily Rewards
  DELETE FROM public.child_daily_rewards
  WHERE child_id = p_child_id 
  AND reward_date = v_today;
  GET DIAGNOSTICS v_deleted_rewards = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Daily progress reset (V2) success',
    'deleted_counts', jsonb_build_object(
      'activity_completions', v_deleted_completions,
      'daily_checkins', v_deleted_checkins,
      'child_activity_events', v_deleted_events,
      'child_daily_rewards', v_deleted_rewards
    )
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
