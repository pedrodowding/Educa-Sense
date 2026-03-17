-- Fix: Friend Requests Visibility and Security (DEBUG VERSION)
-- Description: Inclui mensagens de erro detalhadas para diagnosticar problemas de permissão.

-- 1. Nova RPC para buscar requests
CREATE OR REPLACE FUNCTION public.rpc_get_friend_requests(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_requests JSONB;
BEGIN
  -- Verificação de segurança
  IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_child_id AND guardian_id = auth.uid()) THEN
      -- Se falhar, retorna vazio mas loga (não tem console.log no pgsql padrão fácil pra cliente, então retorna vazio mesmo)
      -- Poderíamos retornar um erro especial, mas frontend espera array.
      RETURN '[]'::jsonb;
  END IF;

  SELECT jsonb_agg(t) INTO v_requests
  FROM (
    SELECT 
      fr.id,
      fr.from_child_id,
      fr.to_child_id,
      fr.status,
      fr.created_at,
      (SELECT jsonb_build_object('name', c.name, 'avatar', c.avatar) 
       FROM public.children c WHERE c.id = fr.from_child_id) as from_child,
      (SELECT jsonb_build_object('name', c.name, 'avatar', c.avatar) 
       FROM public.children c WHERE c.id = fr.to_child_id) as to_child
    FROM public.friend_requests fr
    WHERE (fr.from_child_id = p_child_id OR fr.to_child_id = p_child_id)
    AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  ) t;

  RETURN COALESCE(v_requests, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualizar rpc_send_friend_request_by_code com DEBUG INFO
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

    -- Verificação de segurança
    IF NOT EXISTS (SELECT 1 FROM public.children WHERE id = p_from_child_id AND guardian_id = v_current_user) THEN
        -- Tentar descobrir por que falhou
        SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = p_from_child_id;
        
        IF v_guardian_id IS NULL THEN
             RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Child has no guardian set in DB');
        ELSIF v_guardian_id != v_current_user THEN
             RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Guardian mismatch. Child Guardian: ' || v_guardian_id || ', Current User: ' || COALESCE(v_current_user::text, 'NULL'));
        ELSE
             RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED: Unknown reason');
        END IF;
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

    -- 3. Verificar request pendente (em qualquer direção)
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
