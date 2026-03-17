
-- Tabela de Mensagens (Chat Bidirecional)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    thread_key TEXT NOT NULL, -- Ex: 'min_uuid:max_uuid' para conversa 1:1
    sender_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON public.messages(thread_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON public.messages(receiver_id, read_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);

-- RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Leitura: Participantes da conversa (Sender ou Receiver)
CREATE POLICY "Children can view own messages" ON public.messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE id = messages.sender_id
            AND (
                -- Autenticado via Auth (Guardian)
                guardian_id = auth.uid()
                OR
                -- Autenticado via Código (Student)
                access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
            )
        )
        OR
        EXISTS (
            SELECT 1 FROM public.children
            WHERE id = messages.receiver_id
            AND (
                guardian_id = auth.uid()
                OR
                access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
            )
        )
    );

-- 2. Escrita: Apenas o Sender pode criar (e deve ser o usuário atual)
CREATE POLICY "Children can send messages" ON public.messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE id = messages.sender_id
            AND (
                guardian_id = auth.uid()
                OR
                access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
            )
        )
    );

-- 3. Update (Marcar como lido): Apenas Receiver
CREATE POLICY "Receiver can mark as read" ON public.messages
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE id = messages.receiver_id
            AND (
                guardian_id = auth.uid()
                OR
                access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
            )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.children
            WHERE id = messages.receiver_id
            AND (
                guardian_id = auth.uid()
                OR
                access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
            )
        )
    );

-- Notificar schema reload
NOTIFY pgrst, 'reload schema';
