-- Sprint 5: Stabilization and Fixes
-- Description: Fix Notification RPCs (PGRST202), add schema reload, and enhance robustness.

-- 1. Fix Notification RPCs
-- We make p_child_id optional to support both Guardian (passing ID) and Child (context) modes.

DROP FUNCTION IF EXISTS public.rpc_get_unread_notifications_count(uuid);
DROP FUNCTION IF EXISTS public.rpc_list_notifications(uuid, integer);
DROP FUNCTION IF EXISTS public.rpc_mark_notification_read(uuid);

-- 1.1 Get Unread Count
CREATE OR REPLACE FUNCTION public.rpc_get_unread_notifications_count(p_child_id uuid DEFAULT NULL)
RETURNS integer AS $$
DECLARE
  v_count integer;
  v_target_child_id uuid;
  v_guardian_id uuid;
  v_auth_user uuid;
BEGIN
  v_auth_user := auth.uid();
  
  -- Resolve Child ID: Use parameter or fall back to JWT claim
  v_target_child_id := COALESCE(p_child_id, (auth.jwt() ->> 'child_id')::uuid);
  
  IF v_target_child_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Verify ownership/access
  -- 1. Is user the Guardian?
  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = v_target_child_id;
  
  -- 2. Is user the Child? (Assuming Child Auth might set auth.uid = child_id OR we trust JWT claim if correctly signed)
  -- For strict security, we rely on Guardian check or explicit Child Auth check.
  
  IF v_guardian_id != v_auth_user AND v_target_child_id != v_auth_user THEN
    -- Unauthorized
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.child_notifications
  WHERE child_id = v_target_child_id AND read = false;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.2 List Notifications
CREATE OR REPLACE FUNCTION public.rpc_list_notifications(
  p_child_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 20
)
RETURNS SETOF public.child_notifications AS $$
DECLARE
  v_target_child_id uuid;
  v_guardian_id uuid;
BEGIN
  v_target_child_id := COALESCE(p_child_id, (auth.jwt() ->> 'child_id')::uuid);
  
  IF v_target_child_id IS NULL THEN
    RETURN;
  END IF;

  -- Access Check
  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = v_target_child_id;
  
  IF v_guardian_id != auth.uid() AND v_target_child_id != auth.uid() THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.child_notifications
  WHERE child_id = v_target_child_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1.3 Mark as Read
CREATE OR REPLACE FUNCTION public.rpc_mark_notification_read(p_notification_id uuid)
RETURNS boolean AS $$
DECLARE
  v_child_id uuid;
  v_guardian_id uuid;
BEGIN
  SELECT child_id INTO v_child_id FROM public.child_notifications WHERE id = p_notification_id;
  
  IF v_child_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT guardian_id INTO v_guardian_id FROM public.children WHERE id = v_child_id;

  -- Access Check: Guardian or Child Owner
  IF v_guardian_id != auth.uid() AND v_child_id != auth.uid() THEN
    RETURN false;
  END IF;

  UPDATE public.child_notifications
  SET read = true
  WHERE id = p_notification_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Schema Reload (Crucial for PostgREST to detect new RPCs)
NOTIFY pgrst, 'reload schema';
