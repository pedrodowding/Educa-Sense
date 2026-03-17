-- Sprint 8.1 Hardening & Sprint 9 Hotfix

-- 1. Hardening child_stories RLS
ALTER TABLE public.child_stories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to be clean
DROP POLICY IF EXISTS "Guardians can view their children's stories" ON public.child_stories;
DROP POLICY IF EXISTS "Guardians can insert stories for their children" ON public.child_stories;
DROP POLICY IF EXISTS "Guardians can delete their children's stories" ON public.child_stories;

-- Policy for Guardians (Authenticated)
CREATE POLICY "Guardians select own children stories" ON public.child_stories
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.children 
    WHERE children.id = child_stories.child_id 
    AND children.guardian_id = auth.uid()
  )
);

CREATE POLICY "Guardians insert own children stories" ON public.child_stories
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.children 
    WHERE children.id = child_stories.child_id 
    AND children.guardian_id = auth.uid()
  )
);

CREATE POLICY "Guardians delete own children stories" ON public.child_stories
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.children 
    WHERE children.id = child_stories.child_id 
    AND children.guardian_id = auth.uid()
  )
);

-- Policy for Children (Anonymous with Access Code Header)
-- We use a custom header 'x-child-access-code' to validate ownership
CREATE POLICY "Children can select own stories via code" ON public.child_stories
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = child_stories.child_id
    AND children.access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
  )
);

CREATE POLICY "Children can insert own stories via code" ON public.child_stories
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = child_stories.child_id
    AND children.access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
  )
);

-- 2. New Table: child_daily_rewards
CREATE TABLE IF NOT EXISTS public.child_daily_rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    reward_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reward_type TEXT NOT NULL, -- 'game', 'story', 'drawing'
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE, -- For games
    duration_minutes INTEGER, -- For games
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(child_id, reward_date, reward_type)
);

ALTER TABLE public.child_daily_rewards ENABLE ROW LEVEL SECURITY;

-- RLS for Rewards
CREATE POLICY "Guardians view rewards" ON public.child_daily_rewards
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.children 
    WHERE children.id = child_daily_rewards.child_id 
    AND children.guardian_id = auth.uid()
  )
);

CREATE POLICY "Children view own rewards" ON public.child_daily_rewards
FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = child_daily_rewards.child_id
    AND children.access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
  )
);

CREATE POLICY "Children insert own rewards" ON public.child_daily_rewards
FOR INSERT TO anon
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.children
    WHERE children.id = child_daily_rewards.child_id
    AND children.access_code = current_setting('request.headers', true)::json->>'x-child-access-code'
  )
);

-- 3. RPCs for Rewards

-- Check if reward can be used
CREATE OR REPLACE FUNCTION rpc_can_use_reward(p_child_id UUID, p_reward_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_exists BOOLEAN;
  v_game_enabled BOOLEAN;
  v_limit INTEGER;
  v_reward_record RECORD;
BEGIN
  -- 1. Check if child exists and get configs
  SELECT game_enabled, game_time_limit INTO v_game_enabled, v_limit
  FROM public.children
  WHERE id = p_child_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'child_not_found');
  END IF;

  -- 2. Check type specific constraints
  IF p_reward_type = 'game' THEN
    IF v_game_enabled IS NOT TRUE THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'game_disabled');
    END IF;
  END IF;

  -- 3. Check if already used today
  SELECT * INTO v_reward_record
  FROM public.child_daily_rewards
  WHERE child_id = p_child_id 
  AND reward_date = v_today 
  AND reward_type = p_reward_type;

  IF FOUND THEN
    -- If it's a game, we might allow resuming if time not expired? 
    -- Requirement: "não consigo jogar mais de 1 vez por dia".
    -- But "ao dar refresh, o jogo deve continuar de onde parou".
    -- So if it exists, we return allowed=true ONLY IF it's a game and time is remaining?
    -- No, simpler: frontend checks "can_use". If used, it blocks new starts.
    -- But for "resume", we might need data.
    RETURN jsonb_build_object(
      'allowed', false, 
      'reason', 'already_used',
      'data', jsonb_build_object(
        'used_at', v_reward_record.used_at,
        'started_at', v_reward_record.started_at,
        'duration_minutes', v_reward_record.duration_minutes
      )
    );
  END IF;

  RETURN jsonb_build_object('allowed', true);
END;
$$;

-- Mark reward as used (Start Session)
-- CRITICAL UPDATE (Sprint 9 Audit): 
-- This function now ONLY validates and returns potential session parameters.
-- It DOES NOT insert into the database unless explicitly requested via a separate flow, 
-- OR we rename this to 'rpc_init_game_session' which handles both.
-- The requirement is: "Apenas acessar a tela ou criar sessão NÃO consome a recompensa."
-- So we need to SPLIT:
-- 1. rpc_get_game_session_status (Read-only / Check)
-- 2. rpc_consume_game_reward (Write / Start)

-- However, to minimize migration churn, we will modify rpc_mark_reward_used to BEHAVIOUR:
-- If 'game', it only returns status. Actual consumption happens when 'start' action is sent?
-- No, let's keep rpc_mark_reward_used as the "Consumer".
-- And creating a NEW RPC for "Check/Init".

-- NEW RPC: rpc_get_game_session_status
CREATE OR REPLACE FUNCTION rpc_get_game_session_status(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_game_enabled BOOLEAN;
  v_limit INTEGER;
  v_session RECORD;
BEGIN
  -- 1. Validation
  SELECT game_enabled, game_time_limit INTO v_game_enabled, v_limit
  FROM public.children
  WHERE id = p_child_id;

  IF v_game_enabled IS NOT TRUE THEN
     RETURN jsonb_build_object('allowed', false, 'reason', 'game_disabled');
  END IF;

  -- 2. Check existing session
  SELECT * INTO v_session
  FROM public.child_daily_rewards
  WHERE child_id = p_child_id 
  AND reward_date = v_today 
  AND reward_type = 'game';

  IF FOUND THEN
     RETURN jsonb_build_object(
        'allowed', true,
        'status', 'active', -- or consumed
        'started_at', v_session.started_at,
        'duration_minutes', v_session.duration_minutes
     );
  END IF;

  -- 3. Not started yet
  RETURN jsonb_build_object(
    'allowed', true,
    'status', 'pending',
    'duration_minutes', COALESCE(v_limit, 5)
  );
END;
$$;

-- UPDATE: rpc_mark_reward_used (Generic)
CREATE OR REPLACE FUNCTION rpc_mark_reward_used(p_child_id UUID, p_reward_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_game_enabled BOOLEAN;
  v_limit INTEGER;
  v_inserted_id UUID;
  v_started_at TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- 1. Validation
  SELECT game_enabled, game_time_limit INTO v_game_enabled, v_limit
  FROM public.children
  WHERE id = p_child_id;

  IF p_reward_type = 'game' AND v_game_enabled IS NOT TRUE THEN
     RETURN jsonb_build_object('success', false, 'error', 'game_disabled');
  END IF;

  -- 2. Insert safely (CONSUME)
  INSERT INTO public.child_daily_rewards (child_id, reward_date, reward_type, used_at, started_at, duration_minutes)
  VALUES (p_child_id, v_today, p_reward_type, v_started_at, v_started_at, COALESCE(v_limit, 5))
  ON CONFLICT (child_id, reward_date, reward_type) 
  DO NOTHING
  RETURNING id INTO v_inserted_id;

  -- If nothing inserted, it was already there (Resume)
  IF v_inserted_id IS NULL THEN
     SELECT started_at, duration_minutes INTO v_started_at, v_limit
     FROM public.child_daily_rewards
     WHERE child_id = p_child_id AND reward_date = v_today AND reward_type = p_reward_type;

     RETURN jsonb_build_object(
        'success', true, 
        'started_at', v_started_at,
        'duration_minutes', COALESCE(v_limit, 5),
        'resumed', true
     );
  END IF;

  RETURN jsonb_build_object(
    'success', true, 
    'started_at', v_started_at,
    'duration_minutes', COALESCE(v_limit, 5)
  );
END;
$$;

-- NEW: rpc_consume_game_reward (Specific for Game Start)
-- Handles the explicit consumption of the game reward when "Start Game" is clicked.
CREATE OR REPLACE FUNCTION rpc_consume_game_reward(p_child_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Re-use the robust logic from mark_reward_used, but strictly for 'game'
  RETURN rpc_mark_reward_used(p_child_id, 'game');
END;
$$;

NOTIFY pgrst, 'reload schema';
