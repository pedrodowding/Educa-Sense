import React, { useMemo } from 'react';
import { formatDateTime } from '../adminUi';
import { buildWeeklyHourlyHeatmap } from '../adminData';

type Props = {
  sessions: any[];
  onSelectUser: (userId: string) => void;
};

const TimeTab: React.FC<Props> = ({ sessions, onSelectUser }) => {
  const timeStats = useMemo(() => {
    const byUser = new Map<string, { sessions: number; totalSeconds: number }>();
    for (const s of sessions) {
      const userId = s.user_id || 'unknown';
      const entry = byUser.get(userId) || { sessions: 0, totalSeconds: 0 };
      entry.sessions += 1;
      const dur = typeof s.duration_seconds === 'number' ? s.duration_seconds : 0;
      entry.totalSeconds += dur;
      byUser.set(userId, entry);
    }
    const ranked = Array.from(byUser.entries()).map(([userId, v]) => {
      const avg = v.sessions > 0 ? v.totalSeconds / v.sessions : 0;
      return { userId, sessions: v.sessions, totalSeconds: v.totalSeconds, avgSeconds: avg };
    });
    ranked.sort((a, b) => b.totalSeconds - a.totalSeconds);
    return ranked.slice(0, 20);
  }, [sessions]);

  const heatmap = useMemo(() => buildWeeklyHourlyHeatmap(sessions as any[]), [sessions]);

  return (
    <section className="space-y-4">
      <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Heatmap (dia x hora)</p>
        <div className="mt-3 grid grid-cols-24 gap-1">
          {heatmap.grid.flatMap((row, day) =>
            row.map((value, hour) => {
              const intensity = heatmap.max > 0 ? value / heatmap.max : 0;
              const alpha = 0.08 + intensity * 0.92;
              return (
                <div
                  key={`${day}-${hour}`}
                  title={`Dia ${day} • ${hour}h: ${value}`}
                  className="h-3 rounded-sm"
                  style={{ backgroundColor: `rgba(0, 0, 0, ${alpha})` }}
                ></div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800">
        <p className="text-[10px] font-black uppercase tracking-widest text-text-sub">Top usuários (tempo total)</p>
        <div className="mt-3 space-y-2">
          {timeStats.map(s => (
            <div key={s.userId} className="flex items-center justify-between gap-3">
              <button onClick={() => onSelectUser(s.userId === 'unknown' ? '' : s.userId)} className="text-left text-xs font-black truncate">
                {s.userId}
              </button>
              <span className="text-[10px] font-black uppercase text-text-sub">
                {(s.totalSeconds / 3600).toFixed(1)}h • {Math.round(s.avgSeconds / 60)}m méd • {s.sessions} sessões
              </span>
            </div>
          ))}
          {timeStats.length === 0 && <div className="text-xs text-text-sub font-bold">Sem dados.</div>}
        </div>
      </div>

      <div className="space-y-2">
        {sessions.slice(0, 80).map((s: any) => (
          <div key={s.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-black truncate">{s.user_id || 'unknown'}</p>
              <p className="text-[10px] font-black uppercase text-text-sub">
                {typeof s.duration_seconds === 'number' ? `${Math.round(s.duration_seconds / 60)}m` : '--'}
              </p>
            </div>
            <p className="text-[10px] font-bold text-text-sub uppercase tracking-widest mt-1">
              {formatDateTime(s.started_at)} → {formatDateTime(s.ended_at)}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default TimeTab;

