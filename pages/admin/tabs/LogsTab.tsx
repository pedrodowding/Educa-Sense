import React from 'react';
import { formatDateTime } from '../adminUi';

type Props = {
  audit: any[];
};

const LogsTab: React.FC<Props> = ({ audit }) => {
  return (
    <section className="space-y-2">
      {audit.slice(0, 200).map((a: any) => (
        <div key={a.id} className="bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-black truncate">{a.action}</p>
            <p className="text-[10px] font-black uppercase text-text-sub">{a.actor_role || '—'}</p>
          </div>
          <p className="text-[10px] font-bold text-text-sub uppercase tracking-widest mt-1">
            {formatDateTime(a.created_at)} • {a.actor_user_id || '—'} • {a.entity_type || '—'}
          </p>
        </div>
      ))}
      {audit.length === 0 && <div className="text-xs text-text-sub font-bold">Sem eventos.</div>}
    </section>
  );
};

export default LogsTab;

