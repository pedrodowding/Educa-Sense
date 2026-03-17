-- Hotfix de Debug: Reset apenas do dia atual
-- Objetivo: Limpar progresso diário para permitir reprodução de bugs sem afetar histórico.

CREATE OR REPLACE FUNCTION rpc_debug_reset_daily_progress(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_deleted_progress INTEGER;
  v_deleted_checkins INTEGER;
  v_deleted_completions INTEGER;
  v_deleted_rewards INTEGER;
  v_deleted_events INTEGER;
BEGIN
  -- 1. Resetar Child Progress (mas mantendo a row, apenas zerando contadores do dia se possível? 
  --    Não, a tabela child_progress é cumulativa (total_activities, total_xp). 
  --    Resetar o dia aqui é complexo se não tivermos log. 
  --    Mas o "Plano de Hoje" geralmente olha para 'daily_checkins' e 'activity_completions' do dia.
  --    'child_progress' é o acumulado geral. Se deletarmos, zeramos o XP total. O usuário disse "NÃO apagar XP total".
  --    Portanto, NÃO devemos deletar de 'child_progress'. 
  --    Mas talvez tenhamos que decrementar o que foi ganho hoje?
  --    Se for apenas para "Plano de Hoje voltar para 0/3", isso depende de como o frontend calcula 0/3.
  --    Geralmente é baseado em 'activity_completions' do dia.
  
  -- 2. Activity Completions (Tabela principal do progresso diário)
  DELETE FROM public.activity_completions
  WHERE child_id = p_child_id 
  AND completed_date = v_today;
  GET DIAGNOSTICS v_deleted_completions = ROW_COUNT;

  -- 3. Daily Checkins (Se fizer parte do plano)
  -- Nota: A coluna 'date' em daily_checkins é do tipo TEXT (YYYY-MM-DD), não DATE.
  -- Precisamos converter v_today para texto.
  DELETE FROM public.daily_checkins
  WHERE child_id = p_child_id 
  AND date = TO_CHAR(v_today, 'YYYY-MM-DD');
  GET DIAGNOSTICS v_deleted_checkins = ROW_COUNT;

  -- 4. Child Activity Events (Log detalhado)
  DELETE FROM public.child_activity_events
  WHERE child_id = p_child_id 
  AND created_at::DATE = v_today;
  GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

  -- 5. Child Daily Rewards (Se o usuário quiser testar o fluxo de recompensa de novo)
  DELETE FROM public.child_daily_rewards
  WHERE child_id = p_child_id 
  AND reward_date = v_today;
  GET DIAGNOSTICS v_deleted_rewards = ROW_COUNT;

  -- Nota: Não tocamos em child_progress para evitar corromper o XP histórico acumulado,
  -- a menos que queiramos ser muito precisos e subtrair o XP do dia.
  -- Como é um hotfix de debug para "ver se auto-conclui", o foco é o status "done" das atividades.
  -- Remover de activity_completions deve bastar para o frontend mostrar 0/3.

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Daily progress reset for debugging',
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
