-- Fix: Friend Requests Security (Debug Fix)
-- Description: Corrige lógica de verificação de permissão e melhora mensagens de debug.

CREATE OR REPLACE FUNCTION public.rpc_send_friend_request_by_code(
    p_from_child_id UUID,
    p_friend_code TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_to_child_id UUID;
    v_existing_status TEXT;
    v_friendship_exists BOOLEAN;
    v_guardian_id UUID;
    v_current_user UUID;
BEGIN
    v_current_user := auth.uid();

    -- Verificação de segurança (Depuração Aprofundada)
    SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_from_child_id;

    -- Se não achou a criança
    IF v_guardian_id IS NULL THEN
         RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Child not found or no guardian');
    END IF;

    -- Se o guardian_id não bate com o usuário logado
    IF v_guardian_id != v_current_user THEN
         -- Log de erro detalhado para ajudar a entender o que está acontecendo
         -- Nota: Retornar IDs reais pode ser inseguro em prod, mas essencial para debug agora.
         RETURN jsonb_build_object(
            'success', false, 
            'error', 'UNAUTHORIZED: Guardian mismatch',
            'debug', jsonb_build_object(
                'child_id', p_from_child_id,
                'child_guardian_id', v_guardian_id,
                'current_auth_uid', v_current_user
            )
         );
    END IF;

    -- 1. Achar destino
    SELECT child_id INTO v_to_child_id 
    FROM public.child_friend_codes 
    WHERE friend_code = upper(p_friend_code);

    IF v_to_child_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_CODE');
    END IF;

    IF v_to_child_id = p_from_child_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELF_INVITE');
    END IF;

    -- 2. Verificar amizade existente
    SELECT EXISTS(
        SELECT 1 FROM public.friendships 
        WHERE (child_a_id = LEAST(p_from_child_id, v_to_child_id) AND child_b_id = GREATEST(p_from_child_id, v_to_child_id))
    ) INTO v_friendship_exists;

    IF v_friendship_exists THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_FRIENDS');
    END IF;

    -- 3. Verificar request pendente
    SELECT status INTO v_existing_status
    FROM public.friend_requests
    WHERE (from_child_id = p_from_child_id AND to_child_id = v_to_child_id AND status = 'pending')
       OR (from_child_id = v_to_child_id AND to_child_id = p_from_child_id AND status = 'pending');

    IF v_existing_status IS NOT NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PENDING');
    END IF;

    -- 4. Inserir request
    INSERT INTO public.friend_requests (from_child_id, to_child_id, status)
    VALUES (p_from_child_id, v_to_child_id, 'pending');

    RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
