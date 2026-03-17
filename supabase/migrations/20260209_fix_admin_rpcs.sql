-- Fix RPCs: ensure functions are exposed and parameter names match
-- Run this in Supabase SQL Editor to refresh the schema cache

-- 1. DROP old functions to ensure clean slate (if any signatures mismatch)
DROP FUNCTION IF EXISTS get_admin_users_list;
DROP FUNCTION IF EXISTS get_admin_attention_users;
DROP FUNCTION IF EXISTS get_admin_user_details;

-- 2. Re-create get_admin_users_list
CREATE OR REPLACE FUNCTION get_admin_users_list(
    p_page int DEFAULT 1,
    p_limit int DEFAULT 50,
    p_search text DEFAULT NULL,
    p_plan text DEFAULT NULL,
    p_status text DEFAULT NULL,
    p_has_error boolean DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_offset int;
    v_users JSONB;
    v_total int;
BEGIN
    v_offset := (p_page - 1) * p_limit;

    WITH user_metrics AS (
        SELECT 
            p.id,
            p.email,
            p.name,
            p.role,
            p.plan,
            p.created_at,
            (SELECT count(*) FROM children c WHERE c.guardian_id = p.id) as children_count,
            (SELECT max(started_at) FROM user_sessions s WHERE s.user_id = p.id) as last_active_at,
            EXISTS (
                SELECT 1 FROM api_usage_events e 
                WHERE e.user_id = p.id AND e.success = false AND e.created_at > now() - interval '24 hours'
            ) as has_recent_error,
            (SELECT count(*) FROM activity_completions ac WHERE ac.parent_id = p.id AND ac.completed_at > now() - interval '30 days') as monthly_activity_count
        FROM profiles p
        WHERE 
            (p_search IS NULL OR p.email ILIKE '%' || p_search || '%' OR p.name ILIKE '%' || p_search || '%')
            AND (p_plan IS NULL OR p.plan ILIKE p_plan)
    ),
    filtered_users AS (
        SELECT *,
            CASE 
                WHEN last_active_at > now() - interval '3 days' AND monthly_activity_count > 5 THEN 'High'
                WHEN last_active_at > now() - interval '7 days' THEN 'Medium'
                ELSE 'Low'
            END as engagement_score
        FROM user_metrics
        WHERE 
            (p_status IS NULL OR 
                (p_status = 'active' AND last_active_at > now() - interval '7 days') OR 
                (p_status = 'inactive' AND (last_active_at IS NULL OR last_active_at <= now() - interval '7 days'))
            )
            AND (p_has_error IS NULL OR has_recent_error = p_has_error)
    )
    SELECT 
        jsonb_agg(t) FILTER (WHERE t.id IS NOT NULL),
        count(*)
    INTO v_users, v_total
    FROM (
        SELECT * FROM filtered_users
        ORDER BY last_active_at DESC NULLS LAST
        LIMIT p_limit OFFSET v_offset
    ) t
    RIGHT JOIN (SELECT count(*) FROM filtered_users) c(count) ON true
    GROUP BY c.count;

    RETURN jsonb_build_object(
        'data', COALESCE(v_users, '[]'::jsonb),
        'total', COALESCE(v_total, 0),
        'page', p_page,
        'limit', p_limit
    );
END;
$$;

-- 3. Re-create get_admin_attention_users
CREATE OR REPLACE FUNCTION get_admin_attention_users(
    p_limit int DEFAULT 5
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_inactive_7d JSONB;
    v_error_impacted JSONB;
    v_high_usage_free JSONB;
BEGIN
    -- Inactive > 7 days
    SELECT jsonb_agg(t) INTO v_inactive_7d FROM (
        SELECT p.id, p.email, p.name, max(s.started_at) as last_seen
        FROM profiles p
        LEFT JOIN user_sessions s ON p.id = s.user_id
        WHERE p.created_at < now() - interval '7 days'
        GROUP BY p.id
        HAVING max(s.started_at) < now() - interval '7 days' OR max(s.started_at) IS NULL
        ORDER BY last_seen DESC NULLS LAST
        LIMIT p_limit
    ) t;

    -- Error Impacted (Last 24h)
    SELECT jsonb_agg(t) INTO v_error_impacted FROM (
        SELECT DISTINCT ON (p.id) p.id, p.email, p.name, e.error_message, e.created_at as error_at
        FROM api_usage_events e
        JOIN profiles p ON e.user_id = p.id
        WHERE e.success = false AND e.created_at > now() - interval '24 hours'
        ORDER BY p.id, e.created_at DESC
        LIMIT p_limit
    ) t;

    -- High Usage Free
    SELECT jsonb_agg(t) INTO v_high_usage_free FROM (
        SELECT p.id, p.email, p.name, count(ac.id) as activity_count
        FROM profiles p
        JOIN activity_completions ac ON p.id = ac.parent_id
        WHERE p.plan = 'Free' AND ac.completed_at > now() - interval '30 days'
        GROUP BY p.id
        HAVING count(ac.id) > 10
        ORDER BY activity_count DESC
        LIMIT p_limit
    ) t;

    RETURN jsonb_build_object(
        'inactive_7d', COALESCE(v_inactive_7d, '[]'::jsonb),
        'error_impacted', COALESCE(v_error_impacted, '[]'::jsonb),
        'high_usage_free', COALESCE(v_high_usage_free, '[]'::jsonb)
    );
END;
$$;

-- 4. Re-create get_admin_user_details
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
        'stats', v_stats
    );
END;
$$;

-- 5. Grant permissions to authenticated users (so admins can call it)
GRANT EXECUTE ON FUNCTION get_admin_users_list(int, int, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_users_list(int, int, text, text, text, boolean) TO service_role;

GRANT EXECUTE ON FUNCTION get_admin_attention_users(int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_attention_users(int) TO service_role;

GRANT EXECUTE ON FUNCTION get_admin_user_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_user_details(UUID) TO service_role;

-- 6. Reload schema cache explicitly
NOTIFY pgrst, 'reload schema';
