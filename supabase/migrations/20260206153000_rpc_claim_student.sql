
-- RPC to claim a student profile and link it to the current authenticated user
-- Used during student login to ensure children.user_id is populated
CREATE OR REPLACE FUNCTION public.rpc_claim_student_profile(
  p_child_id UUID,
  p_access_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child_id UUID;
  v_current_user_id UUID;
  v_rows_affected INTEGER;
BEGIN
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  -- Verify the child exists and code matches (Security check)
  SELECT id INTO v_child_id
  FROM public.children
  WHERE id = p_child_id 
    -- Case insensitive check for access code to match app logic
    AND UPPER(access_code) = UPPER(p_access_code);

  IF v_child_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid access code or child not found');
  END IF;

  -- Update the user_id
  -- We allow overwriting existing user_id to handle "Lost Device/New Session" scenarios
  -- where the student gets a new anonymous/deterministic account.
  UPDATE public.children
  SET user_id = v_current_user_id
  WHERE id = v_child_id;
  
  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected > 0 THEN
    RETURN jsonb_build_object('success', true, 'child_id', v_child_id, 'user_id', v_current_user_id);
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Failed to update record');
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
