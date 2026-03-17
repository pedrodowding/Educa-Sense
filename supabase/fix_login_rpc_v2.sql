-- Versão V2 da RPC: Resiliente a colunas faltantes no banco de dados
-- Usa to_jsonb para ler apenas as colunas que existem e aplica valores padrão para as que faltam
-- Isso resolve o erro: column "story_enabled" does not exist

CREATE OR REPLACE FUNCTION validate_student_access_code(p_access_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child_json jsonb;
BEGIN
  -- Converte a linha inteira encontrada para JSONB dinamicamente
  -- Isso evita erros se colunas específicas não existirem na tabela
  SELECT to_jsonb(c) INTO v_child_json
  FROM children c
  WHERE access_code = upper(trim(p_access_code))
  LIMIT 1;

  -- Se não encontrou, retorna erro
  IF v_child_json IS NULL THEN
    RETURN json_build_object('error', 'INVALID_CODE');
  END IF;

  -- Retorna objeto com valores do banco ou padrões (true) se a coluna não existir
  -- COALESCE verifica se o valor existe no JSON, senão usa o padrão
  RETURN json_build_object(
    'childId', v_child_json->>'id',
    'guardianId', v_child_json->>'guardian_id',
    'gameEnabled', COALESCE((v_child_json->>'game_enabled')::boolean, true),
    'storyEnabled', COALESCE((v_child_json->>'story_enabled')::boolean, true),
    'drawingEnabled', COALESCE((v_child_json->>'drawing_enabled')::boolean, true)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION validate_student_access_code(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION validate_student_access_code IS 'V2: Valida código do aluno de forma segura, suportando tabelas desatualizadas (colunas opcionais).';
