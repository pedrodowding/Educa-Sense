-- Script para criar as funções RPC necessárias para o GameSessionContext
-- Estas funções gerenciam o tempo de jogo e permissões

-- 1. Tabela para controlar as sessões de jogo ativas
CREATE TABLE IF NOT EXISTS game_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 20,
  active boolean DEFAULT true
);

-- Index para performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_child ON game_sessions(child_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_active ON game_sessions(active);

-- 2. Função RPC para verificar status da sessão (usada no GameSessionContext)
CREATE OR REPLACE FUNCTION rpc_get_game_session_status(p_child_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session record;
  v_game_enabled boolean;
  v_child_exists boolean;
BEGIN
  -- Verificar se a criança existe e se o jogo está habilitado
  -- Usamos to_jsonb para evitar erro se coluna game_enabled não existir
  SELECT EXISTS(SELECT 1 FROM children WHERE id = p_child_id) INTO v_child_exists;
  
  IF NOT v_child_exists THEN
     RETURN json_build_object('allowed', false, 'reason', 'Aluno não encontrado');
  END IF;

  -- Assumir jogo habilitado por padrão se coluna não existir (resiliência)
  BEGIN
    SELECT game_enabled INTO v_game_enabled FROM children WHERE id = p_child_id;
  EXCEPTION WHEN OTHERS THEN
    v_game_enabled := true;
  END;

  IF v_game_enabled IS FALSE THEN
    RETURN json_build_object('allowed', false, 'reason', 'Jogos desabilitados pelo responsável');
  END IF;

  -- Buscar sessão ativa
  SELECT * INTO v_session
  FROM game_sessions
  WHERE child_id = p_child_id
    AND active = true
    AND expires_at > now()
  ORDER BY started_at DESC
  LIMIT 1;

  IF v_session.id IS NOT NULL THEN
    RETURN json_build_object(
      'allowed', true,
      'status', 'active',
      'started_at', v_session.started_at,
      'duration_minutes', v_session.duration_minutes,
      'expires_at', v_session.expires_at
    );
  ELSE
    -- Sem sessão ativa, mas permitido jogar (pending start)
    RETURN json_build_object(
      'allowed', true,
      'status', 'pending',
      'duration_minutes', 20 -- Padrão ou ler de config
    );
  END IF;
END;
$$;

-- 3. Função RPC para iniciar/consumir uma sessão de jogo
CREATE OR REPLACE FUNCTION rpc_consume_game_reward(p_child_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_duration int := 20; -- Padrão 20 min
BEGIN
  -- Encerrar sessões anteriores (opcional, para limpeza)
  UPDATE game_sessions 
  SET active = false 
  WHERE child_id = p_child_id AND active = true;

  -- Criar nova sessão
  INSERT INTO game_sessions (child_id, duration_minutes, expires_at)
  VALUES (p_child_id, v_duration, now() + (v_duration || ' minutes')::interval);

  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Permissões
GRANT ALL ON TABLE game_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE game_sessions TO anon, authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_game_session_status(uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION rpc_consume_game_reward(uuid) TO anon, authenticated, service_role;

COMMENT ON FUNCTION rpc_get_game_session_status IS 'Verifica se o aluno tem uma sessão de jogo ativa ou se pode iniciar uma.';
