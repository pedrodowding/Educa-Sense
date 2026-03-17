import React from 'react';

type Props = {
  charts: any;
  loading: boolean;
};

const DashboardCharts: React.FC<Props> = ({ charts, loading }) => {
  if (loading) {
    return <div className="h-64 bg-gray-100 rounded-3xl animate-pulse"></div>;
  }

  const signups = (charts?.signups_by_day || []).map((d: any) => ({
    date: new Date(d.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    count: d.count
  }));

  const modules = (charts?.usage_by_module || []).slice(0, 5);
  const maxModule = Math.max(...modules.map((m: any) => m.count), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Time Series */}
      <div className="lg:col-span-2 bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">bar_chart</span>
            Cadastros (Diário)
        </h3>
        <div className="h-40 flex items-end gap-2 border-b border-gray-50 dark:border-gray-800 pb-2">
          {signups.length === 0 && (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                  <span className="material-symbols-outlined text-4xl mb-2">signal_cellular_nodata</span>
                  <p className="text-xs font-medium">Sem dados no período</p>
              </div>
          )}
          {signups.map((d: any, i: number) => {
             // Dynamic height calculation
             const maxCount = Math.max(...signups.map((s: any) => s.count), 1);
             const percentage = (d.count / maxCount) * 100;
             const minHeight = d.count > 0 ? 4 : 2;
             
             return (
               <div key={i} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                 <div 
                   className="w-full bg-primary/20 rounded-t-sm hover:bg-primary transition-all relative cursor-help"
                   style={{ height: `${Math.max(percentage, minHeight)}%` }}
                 >
                   <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                     <span className="font-bold">{d.count}</span> cadastros<br/>
                     <span className="opacity-70">{d.date}</span>
                   </div>
                 </div>
               </div>
             );
          })}
        </div>
        <div className="flex justify-between mt-2 text-[9px] text-gray-400 font-bold uppercase tracking-widest">
            {signups.length > 0 && <span>{signups[0].date}</span>}
            {signups.length > 0 && <span>{signups[signups.length - 1].date}</span>}
        </div>
      </div>

      {/* Module Usage */}
      <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 flex flex-col">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">pie_chart</span>
            Top Módulos
        </h3>
        <div className="space-y-5 flex-1 overflow-y-auto custom-scrollbar">
           {modules.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                  <span className="material-symbols-outlined text-4xl mb-2">extension_off</span>
                  <p className="text-xs font-medium">Sem atividade</p>
              </div>
           )}
           {modules.map((m: any, i: number) => (
             <div key={i} className="group">
               <div className="flex justify-between text-xs font-bold mb-1.5">
                 <span className="capitalize text-gray-700 dark:text-gray-300 group-hover:text-primary transition-colors">{m.module.replace('_', ' ')}</span>
                 <span className="text-gray-500">{m.count}</span>
               </div>
               <div className="h-2.5 bg-gray-50 dark:bg-gray-800 rounded-full overflow-hidden border border-gray-100 dark:border-gray-700">
                 <div 
                   className="h-full bg-gradient-to-r from-secondary to-secondary/80 rounded-full transition-all duration-1000 ease-out" 
                   style={{ width: `${(m.count / maxModule) * 100}%` }}
                 ></div>
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
