import React from 'react';

type Props = {
  data: any;
  loading: boolean;
  onSelectUser: (userId: string) => void;
};

const DashboardAttention: React.FC<Props> = ({ data, loading, onSelectUser }) => {
  if (loading) return <div className="h-40 bg-gray-100 rounded-3xl animate-pulse"></div>;

  const renderList = (items: any[], icon: string, color: string, emptyMsg: string, subtextFn: (i: any) => string) => (
    <div className={`bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex-1 min-w-[280px]`}>
      <h4 className={`text-[10px] font-black uppercase tracking-widest ${color} mb-3 flex items-center gap-2`}>
        <span className="material-symbols-outlined text-sm">{icon}</span>
        {emptyMsg}
      </h4>
      <div className="space-y-2">
        {items?.length === 0 && <p className="text-xs text-gray-400 italic">Nada para mostrar.</p>}
        {items?.map((u: any) => (
          <button
            key={u.id}
            onClick={() => onSelectUser(u.id)}
            className="w-full text-left flex justify-between items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors group"
          >
            <div className="overflow-hidden">
              <p className="text-xs font-bold truncate text-gray-700 dark:text-gray-200 group-hover:text-primary transition-colors">
                {u.name || u.email}
              </p>
              <p className="text-[9px] text-gray-400 truncate">{subtextFn(u)}</p>
            </div>
            <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-primary">chevron_right</span>
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-500">priority_high</span>
        Atenção do Gestor
      </h3>
      <div className="flex flex-wrap gap-4">
        {renderList(
          data?.inactive_7d || [],
          'person_off',
          'text-gray-500',
          'Inativos (7d+)',
          (u) => `Visto em: ${new Date(u.last_seen).toLocaleDateString()}`
        )}
        {renderList(
          data?.error_impacted || [],
          'error',
          'text-rose-500',
          'Impactados por Erro',
          (u) => `Erro: ${u.error_message}`
        )}
        {renderList(
          data?.high_usage_free || [],
          'trending_up',
          'text-emerald-500',
          'Free Alto Uso',
          (u) => `${u.activity_count} atividades (30d)`
        )}
      </div>
    </div>
  );
};

export default DashboardAttention;
