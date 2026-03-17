
-- Drop policies antigas para recriar com a lógica corrigida
DROP POLICY IF EXISTS "Children can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Children can send messages" ON public.messages;
DROP POLICY IF EXISTS "Receiver can mark as read" ON public.messages;

-- 1. Leitura: Participantes da conversa (Sender ou Receiver)
-- Nota: Para usuários anônimos (crianças), usamos apenas o access_code no header.
-- Para usuários autenticados (guardians), usamos auth.uid().
CREATE POLICY "Children can view own messages" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = messages.sender_id
            AND (
                -- Caso Auth (Guardian)
                (auth.role() = 'authenticated' AND c.guardian_id = auth.uid())
                OR
                -- Caso Anon (Student com Access Code)
                (auth.role() = 'anon' AND c.access_code = current_setting('request.headers', true)::json->>'x-child-access-code')
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = messages.receiver_id
            AND (
                (auth.role() = 'authenticated' AND c.guardian_id = auth.uid())
                OR
                (auth.role() = 'anon' AND c.access_code = current_setting('request.headers', true)::json->>'x-child-access-code')
            )
        )
    );

-- 2. Escrita: Apenas o Sender pode criar (e deve ser o usuário atual)
CREATE POLICY "Children can send messages" ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = messages.sender_id
            AND (
                (auth.role() = 'authenticated' AND c.guardian_id = auth.uid())
                OR
                (auth.role() = 'anon' AND c.access_code = current_setting('request.headers', true)::json->>'x-child-access-code')
            )
        )
    );

-- 3. Update (Marcar como lido): Apenas Receiver
CREATE POLICY "Receiver can mark as read" ON public.messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = messages.receiver_id
            AND (
                (auth.role() = 'authenticated' AND c.guardian_id = auth.uid())
                OR
                (auth.role() = 'anon' AND c.access_code = current_setting('request.headers', true)::json->>'x-child-access-code')
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children c
            WHERE c.id = messages.receiver_id
            AND (
                (auth.role() = 'authenticated' AND c.guardian_id = auth.uid())
                OR
                (auth.role() = 'anon' AND c.access_code = current_setting('request.headers', true)::json->>'x-child-access-code')
            )
        )
    );

-- Notificar schema reload
NOTIFY pgrst, 'reload schema';
