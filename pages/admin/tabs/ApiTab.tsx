import React, { useMemo } from 'react';
import { clamp, formatDateTime } from '../adminUi';
import { groupCountByDay } from '../adminData';

type Props = {
  usage: any[];
  settings: Record<string, any>;
};

const ApiTab: React.FC<Props> = ({ usage, settings }) => {
  const apiDaily = useMemo(() => groupCountByDay(usage as any[], 14), [usage]);
  const apiTotal = useMemo(() => usage.length, [usage]);
  const apiErrors = useMemo(() => usage.filter(u => u.success === false).length, [usage]);
  const apiTokens = useMemo(() => usage.reduce((acc, r) => acc + (r.total_tokens || 0), 0), [usage]);
  const apiTopOps = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of usage) map.set(r.operation, (map.get(r.operation) || 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [usage]);

  const alerts = useMemo(() => {
    const settingsThreshold = settings?.api_anomaly_thresholds;
    const perHourLimit = clamp(Number(settingsThreshold?.requestsPerHour ?? 200), 10, 5000);
    const errorRateLimit = clamp(Number(settingsThreshold?.errorRatePercent ?? 20), 1, 100);

    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const byUser = new Map<string, { total: number; errors: number }>();
    for (const r of usage) {
      const ts = new Date(r.created_at).getTime();
      if (!Number.isFinite(ts) || ts < oneHourAgo) continue;
      const userId = r.user_id || 'unknown';
      const entry = byUser.get(userId) || { total: 0, errors: 0 };
      entry.total += 1;
      if (r.success === false) entry.errors += 1;
      byUser.set(userId, entry);
    }

    const out: { userId: string; reason: string }[] = [];
    for (const [userId, v] of byUser.entries()) {
      const errorRate = v.total > 0 ? (v.errors / v.total) * 100 : 0;
      if (v.total >= perHourLimit) out.push({ userId, reason: `Uso alto na última hora: ${v.total} req` });
      if (errorRate >= errorRateLimit) out.push({ userId, reason: `Taxa de erro alta na última hora: ${Math.round(errorRate)}%` });
    }
    return out.slice(0, 20);
  }, [settings, usage]);

  const maxCount = Math.max(1, ...apiDaily.map(x => x.count));

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Requisições</p>
          <p className="text-2xl font-black text-primary mt-2">{apiTotal}</p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Erros</p>
          <p className="text-2xl font-black text-red-500 mt-2">{apiErrors}</p>
        </div>
        <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800 col-span-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Tokens (total)</p>
          <p className="text-xl font-black mt-2">{apiTokens.toLocaleString()}</p>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 p-4 rounded-3xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-yellow-700 dark:text-yellow-300">Alertas</p>
          <div className="mt-3 space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className="text-xs font-bold text-yellow-700 dark:text-yellow-200">
                {a.userId}: {a.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Últimos 14 dias</p>
        <div className="mt-3 flex items-end gap-1 h-20">
          {apiDaily.map(d => (
            <div key={d.day} className="flex-1">
              <div
                className="w-full bg-primary rounded-md"
                style={{ height: `${Math.max(2, Math.round((d.count / maxCount) * 80))}px` }}
                title={`${d.day}: ${d.count}`}
              ></div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Top operações</p>
        <div className="mt-3 space-y-2">
          {apiTopOps.map(([op, c]) => (
            <div key={op} className="flex items-center justify-between">
              <span className="text-xs font-black truncate">{op}</span>
              <span className="text-xs font-black text-primary">{c}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {usage.slice(0, 80).map((u: any) => (
          <div key={u.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black truncate">{u.operation}</p>
              <span className={`text-[10px] font-black uppercase ${u.success ? 'text-primary' : 'text-red-500'}`}>
                {u.success ? 'ok' : 'erro'}
              </span>
            </div>
            <p className="text-[10px] font-bold text-text-sub uppercase tracking-widest mt-1">
              {formatDateTime(u.created_at)} • {(u.total_tokens || 0).toLocaleString()} tokens
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ApiTab;

