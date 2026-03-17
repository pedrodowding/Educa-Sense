-- Admin Notes Table
-- Allow admins to attach internal notes to users (guardians)

CREATE TABLE IF NOT EXISTS admin_user_notes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  tags TEXT[], -- Array of strings e.g. ['vip', 'churn-risk']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE admin_user_notes ENABLE ROW LEVEL SECURITY;

-- Admins can view/manage all notes
CREATE POLICY "Admins can view all notes" ON admin_user_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can insert notes" ON admin_user_notes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can update notes" ON admin_user_notes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

CREATE POLICY "Admins can delete notes" ON admin_user_notes
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Function to get notes for a user (can be included in user details RPC later, or fetched separately)
-- For now we'll fetch separately in frontend to keep RPC simple or update RPC.
-- Let's update the RPC get_admin_user_details to include notes.

CREATE OR REPLACE FUNCTION get_admin_user_details(
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile JSONB;
    v_children JSONB;
    v_recent_activity JSONB;
    v_recent_errors JSONB;
    v_stats JSONB;
    v_notes JSONB;
BEGIN
    SELECT to_jsonb(p) INTO v_profile FROM profiles p WHERE id = p_user_id;
    SELECT jsonb_agg(c) INTO v_children FROM children c WHERE guardian_id = p_user_id;

    SELECT jsonb_agg(t) INTO v_recent_activity FROM (
        SELECT activity_type, subject, score, completed_at
        FROM activity_completions
        WHERE parent_id = p_user_id
        ORDER BY completed_at DESC
        LIMIT 10
    ) t;

    SELECT jsonb_agg(t) INTO v_recent_errors FROM (
        SELECT operation, error_message, created_at
        FROM api_usage_events
        WHERE user_id = p_user_id AND success = false
        ORDER BY created_at DESC
        LIMIT 10
    ) t;

    -- Notes
    SELECT jsonb_agg(n) INTO v_notes FROM (
        SELECT id, content, tags, created_at, admin_id 
        FROM admin_user_notes 
        WHERE user_id = p_user_id
        ORDER BY created_at DESC
    ) n;

    SELECT jsonb_build_object(
        'total_logins', (SELECT count(*) FROM user_sessions WHERE user_id = p_user_id),
        'total_activities', (SELECT count(*) FROM activity_completions WHERE parent_id = p_user_id),
        'last_active', (SELECT max(started_at) FROM user_sessions WHERE user_id = p_user_id)
    ) INTO v_stats;

    RETURN jsonb_build_object(
        'profile', v_profile,
        'children', COALESCE(v_children, '[]'::jsonb),
        'recent_activity', COALESCE(v_recent_activity, '[]'::jsonb),
        'recent_errors', COALESCE(v_recent_errors, '[]'::jsonb),
        'stats', v_stats,
        'notes', COALESCE(v_notes, '[]'::jsonb)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION get_admin_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_details(UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
