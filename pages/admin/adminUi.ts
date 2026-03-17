export type TabKey = 'dashboard' | 'users' | 'api' | 'logs' | 'time' | 'backup';

export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return '--';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '--';
  return d.toLocaleString();
};

export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const isOwnerAllowed = (userId: string | undefined) => {
  const raw =
    (import.meta as any).env?.VITE_ADMIN_OWNER_USER_IDS ??
    (import.meta as any).env?.VITE_ADMIN_OWNER_USER_ID ??
    '';
  const list = String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (list.length === 0) return true;
  if (!userId) return false;
  return list.includes(userId);
};

