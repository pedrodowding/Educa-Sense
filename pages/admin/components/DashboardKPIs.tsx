import React from 'react';

type KpiProps = {
  stats: any;
  loading: boolean;
};

const KpiCard: React.FC<{ title: string; value: string | number; change?: number; unit?: string; inverse?: boolean; loading?: boolean }> = ({ title, value, change, unit, inverse, loading }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800 animate-pulse">
        <div className="h-3 w-20 bg-gray-200 rounded mb-3"></div>
        <div className="h-8 w-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const isPositive = (change || 0) > 0;
  const isNeutral = change === 0;
  // Inverse: "increase is bad" (e.g. error rate)
  const isGood = inverse ? !isPositive : isPositive;
  
  const colorClass = isNeutral ? 'text-gray-400' : isGood ? 'text-emerald-500' : 'text-rose-500';
  const icon = isNeutral ? 'remove' : isPositive ? 'arrow_upward' : 'arrow_downward';

  return (
    <div className="bg-white dark:bg-surface-dark p-5 rounded-[24px] border border-gray-100 dark:border-gray-800 flex flex-col justify-between hover:shadow-sm transition-shadow duration-300 relative overflow-hidden group">
      {/* Decorative background blur for "good" stats */}
      {isGood && !isNeutral && (
         <div className="absolute -right-6 -top-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors"></div>
      )}
      
      <div className="flex items-center gap-1 mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">{title}</p>
        <div className="group/tooltip relative">
           <span className="material-symbols-outlined text-[12px] text-gray-300 cursor-help">info</span>
           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-[10px] rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
             {title} no período selecionado
           </div>
        </div>
      </div>
      
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">{value}<span className="text-lg text-gray-400 font-bold ml-0.5">{unit}</span></span>
        </div>
        
        {change !== undefined && (
            <div className={`flex items-center text-xs font-bold mt-1 ${colorClass}`}>
              <span className="material-symbols-outlined text-[14px] font-black">{icon}</span>
              <span>{Math.abs(change).toFixed(1)}%</span>
              <span className="text-gray-300 dark:text-gray-600 text-[10px] ml-1 font-medium">vs anterior</span>
            </div>
        )}
      </div>
    </div>
  );
};

const DashboardKPIs: React.FC<KpiProps> = ({ stats, loading }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* Featured KPI: Active Children - Highlighted */}
      <div className="col-span-2 md:col-span-1 lg:col-span-2 bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-transparent p-5 rounded-[24px] border border-primary/20 flex flex-col justify-between relative overflow-hidden">
         <div className="absolute right-0 top-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-6xl text-primary">child_care</span>
         </div>
         <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Crianças Ativas</p>
         <div>
            <span className="text-4xl font-black text-gray-900 dark:text-white">{stats?.active_children?.value ?? 0}</span>
            {stats?.active_children?.change !== undefined && (
                <div className={`flex items-center text-xs font-bold mt-1 ${(stats?.active_children?.change || 0) >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                  <span className="material-symbols-outlined text-[14px] font-black">{(stats?.active_children?.change || 0) >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                  <span>{Math.abs(stats?.active_children?.change).toFixed(1)}%</span>
                </div>
            )}
         </div>
      </div>

      <KpiCard title="DAU (Usuários)" value={stats?.dau?.value ?? 0} change={stats?.dau?.change} loading={loading} />
      <KpiCard title="Novos Cadastros" value={stats?.signups?.value ?? 0} change={stats?.signups?.change} loading={loading} />
      <KpiCard title="Exercícios" value={stats?.exercises?.value ?? 0} change={stats?.exercises?.change} loading={loading} />
      <KpiCard title="Taxa de Erro" value={(stats?.api_error_rate?.value ?? 0).toFixed(1)} change={stats?.api_error_rate?.change} unit="%" inverse loading={loading} />
      {/* <KpiCard title="Latência p95" value={Math.round(stats?.api_p95?.value ?? 0)} change={stats?.api_p95?.change} unit="ms" inverse loading={loading} /> */}
    </div>
  );
};

export default DashboardKPIs;
