import { supabase } from './supabase';

type SessionStartResult = { id: string; startedAt: string };

const STORAGE_KEY = 'educasense_active_session';

const getActiveSession = (): SessionStartResult | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SessionStartResult;
    if (!parsed?.id || !parsed?.startedAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

const setActiveSession = (value: SessionStartResult | null) => {
  if (!value) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
};

export const startUserSession = async (): Promise<string | null> => {
  try {
    const { data } = await supabase.auth.getUser();
    const userId = data.user?.id;
    if (!userId) return null;

    const existing = getActiveSession();
    if (existing) return existing.id;

    const startedAt = new Date().toISOString();
    // Use client-side UUID generation to avoid needing .select() which fails RLS
    // Fallback for older browsers included
    const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
      ? crypto.randomUUID() 
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

    const payload = {
      id: sessionId,
      user_id: userId,
      started_at: startedAt,
      user_agent: navigator.userAgent,
      metadata: {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    };

    // Optimistically set session to prevent infinite retry loops if API fails
    setActiveSession({ id: sessionId, startedAt });

    // Attempt insert without selecting return data
    const { error } = await supabase
      .from('user_sessions')
      .insert(payload);

    if (error) {
      console.warn('[Sessions] Failed to log session (non-critical):', error.message);
      // We do not clear active session here, to avoid retry loop
    }

    return sessionId;
  } catch (e) {
    console.error('[Sessions] Unexpected error:', e);
    return null;
  }
};

export const endUserSession = async (): Promise<void> => {
  const active = getActiveSession();
  if (!active) return;

  setActiveSession(null);

  const endedAt = new Date();
  const startedAt = new Date(active.startedAt);
  const durationSeconds = Number.isFinite(startedAt.getTime())
    ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 1000))
    : null;

  await supabase
    .from('user_sessions')
    .update({
      ended_at: endedAt.toISOString(),
      duration_seconds: durationSeconds
    })
    .eq('id', active.id);
};

