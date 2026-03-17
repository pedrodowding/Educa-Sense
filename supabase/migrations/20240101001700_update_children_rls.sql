-- Atualizar RLS da tabela children para bloquear INSERT direto
-- A criação deve ser feita EXCLUSIVAMENTE via Edge Function (Service Role)

-- 1. Remover policy antiga permissiva
DROP POLICY IF EXISTS "Guardians can manage their children" ON public.children;

-- 2. Criar policy para SELECT (Leitura permitida para o guardião)
CREATE POLICY "Guardians can view their children" ON public.children
FOR SELECT USING (auth.uid() = guardian_id);

-- 3. Criar policy para UPDATE (Edição permitida)
CREATE POLICY "Guardians can update their children" ON public.children
FOR UPDATE USING (auth.uid() = guardian_id);

-- 4. Criar policy para DELETE (Remoção permitida)
CREATE POLICY "Guardians can delete their children" ON public.children
FOR DELETE USING (auth.uid() = guardian_id);

-- 5. INSERT: BLOQUEAR para usuários autenticados (anon e authenticated)
-- Nenhuma policy FOR INSERT é criada para 'authenticated', o que efetivamente bloqueia.
-- O Service Role (usado pela Edge Function) ignora RLS, então funcionará.
