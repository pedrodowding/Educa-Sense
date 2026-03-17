-- RPC for Admin Dashboard KPIs
CREATE OR REPLACE FUNCTION get_admin_dashboard_stats(
    p_start timestamptz,
    p_end timestamptz,
    p_prev_start timestamptz,
    p_prev_end timestamptz
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_dau_current int;
    v_dau_prev int;
    v_signups_current int;
    v_signups_prev int;
    v_active_children_current int;
    v_active_children_prev int;
    v_exercises_current int;
    v_exercises_prev int;
    
    v_api_total_current int;
    v_api_errors_current int;
    v_api_p95_current float;
    
    v_api_total_prev int;
    v_api_errors_prev int;
    v_api_p95_prev float;
    
    v_dau_change float;
    v_signups_change float;
    v_active_children_change float;
    v_exercises_change float;
    v_api_error_rate_current float;
    v_api_error_rate_prev float;
    v_api_error_rate_change float;
    v_api_p95_change float;

BEGIN
    -- DAU (Active Users)
    SELECT count(distinct user_id) INTO v_dau_current FROM user_sessions WHERE started_at BETWEEN p_start AND p_end;
    SELECT count(distinct user_id) INTO v_dau_prev FROM user_sessions WHERE started_at BETWEEN p_prev_start AND p_prev_end;

    -- New Signups
    SELECT count(*) INTO v_signups_current FROM profiles WHERE created_at BETWEEN p_start AND p_end;
    SELECT count(*) INTO v_signups_prev FROM profiles WHERE created_at BETWEEN p_prev_start AND p_prev_end;

    -- Active Children (using learning_history + activity_completions)
    WITH active_ids AS (
        SELECT child_id FROM learning_history WHERE created_at BETWEEN p_start AND p_end AND child_id IS NOT NULL
        UNION
        SELECT child_id FROM activity_completions WHERE completed_at BETWEEN p_start AND p_end AND child_id IS NOT NULL
    )
    SELECT count(distinct child_id) INTO v_active_children_current FROM active_ids;

    WITH active_ids_prev AS (
        SELECT child_id FROM learning_history WHERE created_at BETWEEN p_prev_start AND p_prev_end AND child_id IS NOT NULL
        UNION
        SELECT child_id FROM activity_completions WHERE completed_at BETWEEN p_prev_start AND p_prev_end AND child_id IS NOT NULL
    )
    SELECT count(distinct child_id) INTO v_active_children_prev FROM active_ids_prev;

    -- Exercises Generated (history entries)
    SELECT count(*) INTO v_exercises_current FROM learning_history WHERE created_at BETWEEN p_start AND p_end;
    SELECT count(*) INTO v_exercises_prev FROM learning_history WHERE created_at BETWEEN p_prev_start AND p_prev_end;

    -- API Stats
    SELECT count(*), count(CASE WHEN success = false THEN 1 END) 
    INTO v_api_total_current, v_api_errors_current 
    FROM api_usage_events WHERE created_at BETWEEN p_start AND p_end;

    SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) 
    INTO v_api_p95_current
    FROM api_usage_events WHERE created_at BETWEEN p_start AND p_end AND duration_ms IS NOT NULL;

    SELECT count(*), count(CASE WHEN success = false THEN 1 END) 
    INTO v_api_total_prev, v_api_errors_prev 
    FROM api_usage_events WHERE created_at BETWEEN p_prev_start AND p_prev_end;

    SELECT percentile_cont(0.95) WITHIN GROUP (ORDER BY duration_ms) 
    INTO v_api_p95_prev
    FROM api_usage_events WHERE created_at BETWEEN p_prev_start AND p_prev_end AND duration_ms IS NOT NULL;

    -- Calculations
    v_dau_change := CASE WHEN v_dau_prev > 0 THEN ((v_dau_current::float - v_dau_prev::float) / v_dau_prev::float) * 100 ELSE 0 END;
    v_signups_change := CASE WHEN v_signups_prev > 0 THEN ((v_signups_current::float - v_signups_prev::float) / v_signups_prev::float) * 100 ELSE 0 END;
    v_active_children_change := CASE WHEN v_active_children_prev > 0 THEN ((v_active_children_current::float - v_active_children_prev::float) / v_active_children_prev::float) * 100 ELSE 0 END;
    v_exercises_change := CASE WHEN v_exercises_prev > 0 THEN ((v_exercises_current::float - v_exercises_prev::float) / v_exercises_prev::float) * 100 ELSE 0 END;
    
    v_api_error_rate_current := CASE WHEN v_api_total_current > 0 THEN (v_api_errors_current::float / v_api_total_current::float) * 100 ELSE 0 END;
    v_api_error_rate_prev := CASE WHEN v_api_total_prev > 0 THEN (v_api_errors_prev::float / v_api_total_prev::float) * 100 ELSE 0 END;
    v_api_error_rate_change := v_api_error_rate_current - v_api_error_rate_prev; -- Percentage point difference

    v_api_p95_current := COALESCE(v_api_p95_current, 0);
    v_api_p95_prev := COALESCE(v_api_p95_prev, 0);
    v_api_p95_change := CASE WHEN v_api_p95_prev > 0 THEN ((v_api_p95_current - v_api_p95_prev) / v_api_p95_prev) * 100 ELSE 0 END;

    RETURN jsonb_build_object(
        'dau', jsonb_build_object('value', v_dau_current, 'change', v_dau_change),
        'signups', jsonb_build_object('value', v_signups_current, 'change', v_signups_change),
        'active_children', jsonb_build_object('value', v_active_children_current, 'change', v_active_children_change),
        'exercises', jsonb_build_object('value', v_exercises_current, 'change', v_exercises_change),
        'api_error_rate', jsonb_build_object('value', v_api_error_rate_current, 'change', v_api_error_rate_change),
        'api_p95', jsonb_build_object('value', v_api_p95_current, 'change', v_api_p95_change)
    );
END;
$$;

-- RPC for Charts (with TZ adjustment)
CREATE OR REPLACE FUNCTION get_admin_dashboard_charts(
    p_start timestamptz,
    p_end timestamptz
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_signups_by_day JSONB;
    v_usage_by_module JSONB;
BEGIN
    -- Signups by day (Brazil Time)
    SELECT jsonb_agg(t) INTO v_signups_by_day FROM (
        SELECT date_trunc('day', created_at AT TIME ZONE 'America/Sao_Paulo') as date, count(*) as count
        FROM profiles
        WHERE created_at BETWEEN p_start AND p_end
        GROUP BY 1
        ORDER BY 1
    ) t;

    -- Usage by module
    SELECT jsonb_agg(t) INTO v_usage_by_module FROM (
        SELECT COALESCE(program, type, 'outros') as module, count(*) as count
        FROM learning_history
        WHERE created_at BETWEEN p_start AND p_end
        GROUP BY 1
        ORDER BY 2 DESC
    ) t;

    RETURN jsonb_build_object(
        'signups_by_day', COALESCE(v_signups_by_day, '[]'::jsonb),
        'usage_by_module', COALESCE(v_usage_by_module, '[]'::jsonb)
    );
END;
$$;

-- RPC for Operational Data
CREATE OR REPLACE FUNCTION get_admin_operational_data(
    p_limit int DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_critical_errors JSONB;
    v_recent_backups JSONB;
BEGIN
    -- Recent Critical Errors
    SELECT jsonb_agg(t) INTO v_critical_errors FROM (
        SELECT id, created_at, operation, error_message, user_id
        FROM api_usage_events
        WHERE success = false
        ORDER BY created_at DESC
        LIMIT p_limit
    ) t;

    -- Recent Backups (from audit logs)
    SELECT jsonb_agg(t) INTO v_recent_backups FROM (
        SELECT id, created_at, metadata
        FROM admin_audit_events
        WHERE action = 'admin_backup_generated'
        ORDER BY created_at DESC
        LIMIT p_limit
    ) t;
    
    RETURN jsonb_build_object(
        'recent_errors', COALESCE(v_critical_errors, '[]'::jsonb),
        'recent_backups', COALESCE(v_recent_backups, '[]'::jsonb)
    );
END;
$$;
