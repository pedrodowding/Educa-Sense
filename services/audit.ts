import { supabase } from './supabase';

export type AuditEventInput = {
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
};

const getUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

const getUserRole = async (userId: string): Promise<string | null> => {
  const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (error) return null;
  return (data?.role as string | undefined) ?? null;
};

export const logAuditEvent = async (input: AuditEventInput): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const role = await getUserRole(userId);

  const payload = {
    actor_user_id: userId,
    actor_role: role,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {}
  };

  await supabase.from('audit_events').insert(payload);
};

export const logAdminAuditEvent = async (action: string, metadata?: Record<string, unknown>): Promise<void> => {
  const userId = await getUserId();
  if (!userId) return;

  const payload = {
    admin_user_id: userId,
    action,
    metadata: metadata ?? {}
  };

  await supabase.from('admin_audit_events').insert(payload);
};

