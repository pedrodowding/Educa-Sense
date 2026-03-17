
-- 1. RPC para Leitura Segura de Mensagens (Fix Chat Persistence)
CREATE OR REPLACE FUNCTION public.rpc_get_messages_secure(
    p_child_id UUID,
    p_friend_id UUID,
    p_access_code_fallback TEXT DEFAULT NULL
)
RETURNS SETOF public.messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_access_code TEXT;
    v_child_check UUID;
    v_thread_key TEXT;
BEGIN
    -- Obter Access Code
    v_access_code := current_setting('request.headers', true)::json->>'x-child-access-code';
    IF v_access_code IS NULL OR v_access_code = '' THEN
        v_access_code := p_access_code_fallback;
    END IF;

    -- Validar se o solicitante é realmente quem diz ser
    SELECT id INTO v_child_check
    FROM public.children
    WHERE id = p_child_id AND access_code = v_access_code;

    IF v_child_check IS NULL THEN
        -- Retorna vazio se não autorizado
        RETURN;
    END IF;

    -- Calcular Thread Key
    IF p_child_id < p_friend_id THEN
        v_thread_key := p_child_id || ':' || p_friend_id;
    ELSE
        v_thread_key := p_friend_id || ':' || p_child_id;
    END IF;

    -- Retornar mensagens
    RETURN QUERY
    SELECT *
    FROM public.messages
    WHERE thread_key = v_thread_key
    ORDER BY created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_get_messages_secure(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_messages_secure(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_messages_secure(UUID, UUID, TEXT) TO service_role;


-- 2. RPC para Toggle Reward (Fix Settings Page Error)
CREATE OR REPLACE FUNCTION public.rpc_toggle_reward(
    p_child_id UUID,
    p_reward_type TEXT,
    p_enabled BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verificação básica de permissão (Auth User deve ser o guardian)
    IF auth.role() = 'authenticated' THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.children 
            WHERE id = p_child_id AND guardian_id = auth.uid()
        ) THEN
            RETURN jsonb_build_object('success', false, 'error', 'Unauthorized');
        END IF;
    END IF;
    
    -- Update dinâmico
    IF p_reward_type = 'game' THEN
        UPDATE public.children SET game_enabled = p_enabled WHERE id = p_child_id;
    ELSIF p_reward_type = 'story' THEN
        UPDATE public.children SET story_enabled = p_enabled WHERE id = p_child_id;
    ELSIF p_reward_type = 'drawing' THEN
        UPDATE public.children SET drawing_enabled = p_enabled WHERE id = p_child_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid reward type');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.rpc_toggle_reward(UUID, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_toggle_reward(UUID, TEXT, BOOLEAN) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_toggle_reward(UUID, TEXT, BOOLEAN) TO service_role;

NOTIFY pgrst, 'reload schema';
