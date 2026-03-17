-- Função RPC para validar código de acesso do aluno de forma segura
-- Bypass de RLS via SECURITY DEFINER para evitar erros de permissão
-- Execute este script no SQL Editor do Supabase Dashboard

CREATE OR REPLACE FUNCTION validate_student_access_code(p_access_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_child record;
BEGIN
  -- Normalizar código (remove espaços e converte para maiúsculo)
  -- Buscando na tabela children
  SELECT id, guardian_id, game_enabled, story_enabled, drawing_enabled
  INTO v_child
  FROM children
  WHERE access_code = upper(trim(p_access_code))
  LIMIT 1;

  -- Se não encontrou, retorna objeto de erro
  IF v_child.id IS NULL THEN
    RETURN json_build_object('error', 'INVALID_CODE');
  END IF;

  -- Retorna objeto JSON com dados necessários para a sessão
  RETURN json_build_object(
    'childId', v_child.id,
    'guardianId', v_child.guardian_id,
    'gameEnabled', v_child.game_enabled,
    'storyEnabled', v_child.story_enabled,
    'drawingEnabled', v_child.drawing_enabled
  );
END;
$$;

-- Permitir que qualquer usuário (anonimo ou logado) chame esta função
GRANT EXECUTE ON FUNCTION validate_student_access_code(text) TO anon, authenticated, service_role;

COMMENT ON FUNCTION validate_student_access_code IS 'Valida código de acesso do aluno e retorna dados da sessão, ignorando RLS da tabela children.';
