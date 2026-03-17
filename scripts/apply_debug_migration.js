import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load env
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; // Using Anon key, likely to fail for DDL if RLS/Permissions are strict, but worth a try or check if service role is available (not in .env file seen)

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Attempting to run migration V2...');
  
  const sql = `
  CREATE OR REPLACE FUNCTION rpc_debug_reset_daily_progress_v2(p_child_id UUID)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
    v_today DATE := CURRENT_DATE;
    v_deleted_completions INTEGER;
    v_deleted_checkins INTEGER;
    v_deleted_rewards INTEGER;
    v_deleted_events INTEGER;
  BEGIN
    -- 1. Activity Completions
    DELETE FROM public.activity_completions
    WHERE child_id = p_child_id 
    AND completed_date = v_today;
    GET DIAGNOSTICS v_deleted_completions = ROW_COUNT;

    -- 2. Daily Checkins (CORRIGIDO: Converte Data para Texto)
    DELETE FROM public.daily_checkins
    WHERE child_id = p_child_id 
    AND date = TO_CHAR(v_today, 'YYYY-MM-DD');
    GET DIAGNOSTICS v_deleted_checkins = ROW_COUNT;

    -- 3. Child Activity Events
    DELETE FROM public.child_activity_events
    WHERE child_id = p_child_id 
    AND created_at::DATE = v_today;
    GET DIAGNOSTICS v_deleted_events = ROW_COUNT;

    -- 4. Child Daily Rewards
    DELETE FROM public.child_daily_rewards
    WHERE child_id = p_child_id 
    AND reward_date = v_today;
    GET DIAGNOSTICS v_deleted_rewards = ROW_COUNT;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Daily progress reset (V2) success',
      'deleted_counts', jsonb_build_object(
        'activity_completions', v_deleted_completions,
        'daily_checkins', v_deleted_checkins,
        'child_activity_events', v_deleted_events,
        'child_daily_rewards', v_deleted_rewards
      )
    );
  END;
  $$;
  `;

  // Try to execute via rpc if a generic 'exec_sql' exists (unlikely but possible in some setups)
  // Or just inform the user that we cannot run DDL with Anon key.
  
  // Actually, we can't run raw SQL with supabase-js client unless we have a specific RPC for it.
  // The goal of this script is to verify connectivity and potentially warn the user.
  
  console.log('---------------------------------------------------');
  console.log('WARNING: Cannot apply migration automatically with Anon Key.');
  console.log('Please copy and paste the SQL content from supabase/migrations/20260205210500_debug_reset_day_v2.sql into your Supabase Dashboard SQL Editor.');
  console.log('---------------------------------------------------');
}

runMigration();
