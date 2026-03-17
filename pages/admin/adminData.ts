import { supabase } from '../../services/supabase';

export type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  plan: string | null;
  created_at: string | null;
};

export type ApiUsageRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  operation: string;
  model: string | null;
  duration_ms: number | null;
  total_tokens: number | null;
  success: boolean | null;
  error_message: string | null;
};

export type AuditRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
};

export type SessionRow = {
  id: string;
  user_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  user_agent: string | null;
};

export const fetchFreeUsers = async (input: {
  q?: string;
  from?: string;
  to?: string;
  role?: string;
  limit?: number;
}): Promise<ProfileRow[]> => {
  let query = supabase
    .from('profiles')
    .select('id, email, name, role, plan, created_at')
    .eq('plan', 'Free')
    .order('created_at', { ascending: false });

  if (input.role) query = query.eq('role', input.role);
  if (input.from) query = query.gte('created_at', input.from);
  if (input.to) query = query.lte('created_at', input.to);
  if (input.q) query = query.or(`email.ilike.%${input.q}%,name.ilike.%${input.q}%`);
  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
};

export const fetchApiUsageEvents = async (input: {
  userId?: string;
  from?: string;
  to?: string;
  q?: string;
  operation?: string;
  success?: boolean;
  limit?: number;
}): Promise<ApiUsageRow[]> => {
  let query = supabase
    .from('api_usage_events')
    .select('id, created_at, user_id, operation, model, duration_ms, total_tokens, success, error_message')
    .order('created_at', { ascending: false });

  if (input.userId) query = query.eq('user_id', input.userId);
  if (input.q) query = query.or(`operation.ilike.%${input.q}%,model.ilike.%${input.q}%`);
  if (input.operation) query = query.eq('operation', input.operation);
  if (input.success !== undefined) query = query.eq('success', input.success);
  if (input.from) query = query.gte('created_at', input.from);
  if (input.to) query = query.lte('created_at', input.to);
  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as ApiUsageRow[];
};

export const fetchAuditEvents = async (input: {
  actorUserId?: string;
  from?: string;
  to?: string;
  q?: string;
  action?: string;
  entityType?: string;
  limit?: number;
}): Promise<AuditRow[]> => {
  let query = supabase
    .from('audit_events')
    .select('id, created_at, actor_user_id, actor_role, action, entity_type, entity_id')
    .order('created_at', { ascending: false });

  if (input.actorUserId) query = query.eq('actor_user_id', input.actorUserId);
  if (input.q) query = query.or(`action.ilike.%${input.q}%,entity_type.ilike.%${input.q}%`);
  if (input.action) query = query.eq('action', input.action);
  if (input.entityType) query = query.eq('entity_type', input.entityType);
  if (input.from) query = query.gte('created_at', input.from);
  if (input.to) query = query.lte('created_at', input.to);
  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AuditRow[];
};

export const fetchSessions = async (input: {
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
}): Promise<SessionRow[]> => {
  let query = supabase
    .from('user_sessions')
    .select('id, user_id, started_at, ended_at, duration_seconds, user_agent')
    .order('started_at', { ascending: false });

  if (input.userId) query = query.eq('user_id', input.userId);
  if (input.from) query = query.gte('started_at', input.from);
  if (input.to) query = query.lte('started_at', input.to);
  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SessionRow[];
};

export const fetchAdminSettings = async (): Promise<Record<string, any>> => {
  const { data, error } = await supabase.from('admin_settings').select('key, value');
  if (error) throw error;
  const out: Record<string, any> = {};
  for (const row of data ?? []) out[row.key] = row.value;
  return out;
};

export const fetchDashboardStats = async (start: string, end: string, prevStart: string, prevEnd: string) => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_stats', {
    p_start: start,
    p_end: end,
    p_prev_start: prevStart,
    p_prev_end: prevEnd
  });
  if (error) throw error;
  return data;
};

export const fetchDashboardCharts = async (start: string, end: string) => {
  const { data, error } = await supabase.rpc('get_admin_dashboard_charts', {
    p_start: start,
    p_end: end
  });
  if (error) throw error;
  return data;
};

export const fetchOperationalData = async () => {
  const { data, error } = await supabase.rpc('get_admin_operational_data', { p_limit: 20 });
  if (error) throw error;
  return data;
};

export const fetchAttentionUsers = async () => {
  const { data, error } = await supabase.rpc('get_admin_attention_users', { p_limit: 5 });
  if (error) throw error;
  return data;
};

export const fetchUsersList = async (page: number, limit: number, search?: string, plan?: string, status?: string, hasError?: boolean) => {
  const { data, error } = await supabase.rpc('get_admin_users_list', {
    p_page: page,
    p_limit: limit,
    p_search: search || null,
    p_plan: plan || null,
    p_status: status || null,
    p_has_error: hasError || null
  });
  if (error) throw error;
  return data; // { data: [], total: 0, ... }
};

export const fetchUserDetails = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_admin_user_details', { p_user_id: userId });
  if (error) throw error;
  return data;
};

export const upsertAdminSetting = async (key: string, value: any): Promise<void> => {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  await supabase.from('admin_settings').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: userId ?? null
  });
};

export const groupCountByDay = (rows: { created_at: string }[], days: number) => {
  const buckets: { day: string; count: number }[] = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.push({ day: key, count: 0 });
  }
  const idx = new Map(buckets.map((b, i) => [b.day, i]));
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    const i = idx.get(key);
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
};

export const addAdminNote = async (userId: string, content: string, tags: string[] = []) => {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from('admin_user_notes').insert({
    user_id: userId,
    admin_id: user?.id,
    content,
    tags
  });
  if (error) throw error;
};

export const deleteAdminNote = async (noteId: string) => {
  const { error } = await supabase.from('admin_user_notes').delete().eq('id', noteId);
  if (error) throw error;
};

export const buildWeeklyHourlyHeatmap = (sessions: SessionRow[]) => {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  for (const s of sessions) {
    const d = new Date(s.started_at);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getDay();
    const hour = d.getHours();
    grid[day][hour] += 1;
  }
  const max = grid.flat().reduce((acc, n) => Math.max(acc, n), 0);
  return { grid, max };
};
