
-- Solução Definitiva para Chat via Código de Acesso
-- Substitui a lógica de INSERT via RLS (que falha com permissões anônimas complexas) por uma RPC segura.

CREATE OR REPLACE FUNCTION public.rpc_send_message_secure(
    p_receiver_id UUID,
    p_body TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Roda com permissões de admin (bypass RLS)
SET search_path = public
AS $$
DECLARE
    v_access_code TEXT;
    v_sender_id UUID;
    v_thread_key TEXT;
    v_msg_id UUID;
    v_created_at TIMESTAMPTZ;
BEGIN
    -- 1. Obter Access Code do Header
    v_access_code := current_setting('request.headers', true)::json->>'x-child-access-code';
    
    IF v_access_code IS NULL THEN
        RAISE EXCEPTION 'Missing access code header';
    END IF;

    -- 2. Validar Sender
    SELECT id INTO v_sender_id
    FROM public.children
    WHERE access_code = v_access_code
    LIMIT 1;

    IF v_sender_id IS NULL THEN
        RAISE EXCEPTION 'Invalid access code';
    END IF;

    -- 3. Gerar Thread Key (Consistente: min_uuid:max_uuid)
    IF v_sender_id < p_receiver_id THEN
        v_thread_key := v_sender_id || ':' || p_receiver_id;
    ELSE
        v_thread_key := p_receiver_id || ':' || v_sender_id;
    END IF;

    -- 4. Inserir Mensagem
    INSERT INTO public.messages (
        thread_key,
        sender_id,
        receiver_id,
        body
    ) VALUES (
        v_thread_key,
        v_sender_id,
        p_receiver_id,
        trim(p_body)
    )
    RETURNING id, created_at INTO v_msg_id, v_created_at;

    -- 5. Retornar dados da mensagem
    RETURN jsonb_build_object(
        'id', v_msg_id,
        'thread_key', v_thread_key,
        'sender_id', v_sender_id,
        'receiver_id', p_receiver_id,
        'body', trim(p_body),
        'created_at', v_created_at,
        'read_at', null
    );
END;
$$;

-- Permitir execução pública (a segurança está na validação interna do código)
GRANT EXECUTE ON FUNCTION public.rpc_send_message_secure(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_send_message_secure(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_send_message_secure(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
