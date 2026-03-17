
-- Correção crítica para erro 401 no Chat
-- O problema é que a policy de 'messages' tenta ler a tabela 'children' para validar o remetente.
-- Mas o usuário 'anon' (aluno logado por código) não tinha permissão de SELECT na tabela 'children',
-- fazendo a validação falhar silenciosamente ou gerar erro de permissão em cascata.

-- 1. Permitir que role 'anon' leia a tabela children, mas APENAS o registro que corresponde ao código enviado no header.
DROP POLICY IF EXISTS "Anon can view own child profile via code" ON public.children;

CREATE POLICY "Anon can view own child profile via code" ON public.children
    FOR SELECT
    TO anon
    USING (
        -- Compara o access_code do registro com o header enviado
        access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
    );

-- 2. Garantir Grants explícitos (caso ainda não existam)
GRANT SELECT ON public.children TO anon;

-- 3. Reforçar Grants na tabela messages (redundância por segurança)
GRANT ALL ON public.messages TO anon;
GRANT ALL ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

-- 4. Recarregar schema
NOTIFY pgrst, 'reload schema';
