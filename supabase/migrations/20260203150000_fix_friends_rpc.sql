-- Fix: Friends RPC Visibility and Return Types
-- Description: Garante que as funções RPC de amigos retornem JSONB consistente e estejam acessíveis.

-- 0. Dropar funções existentes para permitir alteração de retorno
DROP FUNCTION IF EXISTS public.rpc_get_my_friends(UUID);
DROP FUNCTION IF EXISTS public.rpc_get_friend_requests(UUID);

-- 1. rpc_get_my_friends (Refatorado para JSONB)
CREATE OR REPLACE FUNCTION public.rpc_get_my_friends(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_friends JSONB;
BEGIN
    SELECT jsonb_agg(
        jsonb_build_object(
            'friendship_id', f.id,
            'friend_id', CASE WHEN f.child_a_id = p_child_id THEN f.child_b_id ELSE f.child_a_id END,
            'friend_name', c.name,
            'friend_avatar', c.avatar,
            'friend_xp', c.xp
        )
    ) INTO v_friends
    FROM public.friendships f
    JOIN public.children c ON (
        CASE WHEN f.child_a_id = p_child_id THEN f.child_b_id ELSE f.child_a_id END = c.id
    )
    WHERE f.child_a_id = p_child_id OR f.child_b_id = p_child_id;

    RETURN COALESCE(v_friends, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. rpc_get_friend_requests (Garantir existência e visibilidade)
CREATE OR REPLACE FUNCTION public.rpc_get_friend_requests(p_child_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_requests JSONB;
BEGIN
  -- Se p_child_id for null, retorna vazio
  IF p_child_id IS NULL THEN
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

-- 3. Permissões explícitas (Defesa em profundidade)
GRANT EXECUTE ON FUNCTION public.rpc_get_my_friends(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_friends(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_my_friends(UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.rpc_get_friend_requests(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_get_friend_requests(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_get_friend_requests(UUID) TO service_role;
