CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS(
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.is_admin());

CREATE TABLE audit_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX audit_events_created_at_idx ON audit_events (created_at DESC);
CREATE INDEX audit_events_actor_user_id_idx ON audit_events (actor_user_id);
CREATE INDEX audit_events_action_idx ON audit_events (action);

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own audit events" ON audit_events
  FOR INSERT WITH CHECK (auth.uid() = actor_user_id);

CREATE POLICY "Admins can view audit events" ON audit_events
  FOR SELECT USING (public.is_admin());

CREATE TABLE api_usage_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  operation TEXT NOT NULL,
  model TEXT,
  duration_ms INTEGER,
  prompt_chars INTEGER,
  response_chars INTEGER,
  prompt_tokens INTEGER,
  response_tokens INTEGER,
  total_tokens INTEGER,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX api_usage_events_created_at_idx ON api_usage_events (created_at DESC);
CREATE INDEX api_usage_events_user_id_idx ON api_usage_events (user_id);
CREATE INDEX api_usage_events_operation_idx ON api_usage_events (operation);

ALTER TABLE api_usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own api usage events" ON api_usage_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view api usage events" ON api_usage_events
  FOR SELECT USING (public.is_admin());

CREATE TABLE user_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX user_sessions_started_at_idx ON user_sessions (started_at DESC);
CREATE INDEX user_sessions_user_id_idx ON user_sessions (user_id);

ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions" ON user_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON user_sessions
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view sessions" ON user_sessions
  FOR SELECT USING (public.is_admin());

CREATE TABLE admin_audit_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX admin_audit_events_created_at_idx ON admin_audit_events (created_at DESC);
CREATE INDEX admin_audit_events_admin_user_id_idx ON admin_audit_events (admin_user_id);

ALTER TABLE admin_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can insert admin audit events" ON admin_audit_events
  FOR INSERT WITH CHECK (public.is_admin() AND auth.uid() = admin_user_id);

CREATE POLICY "Admins can view admin audit events" ON admin_audit_events
  FOR SELECT USING (public.is_admin());

CREATE TABLE admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage settings" ON admin_settings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

