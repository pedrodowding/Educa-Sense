import React from 'react';

type Props = {
  data: any;
  loading: boolean;
};

const DashboardOperations: React.FC<Props> = ({ data, loading }) => {
  if (loading) return <div className="h-40 bg-gray-100 rounded-3xl animate-pulse"></div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Critical Errors */}
      <div className="bg-rose-50 dark:bg-rose-950/20 p-6 rounded-[32px] border border-rose-100 dark:border-rose-900/30">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span>
          Erros Críticos Recentes
        </h3>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
          {data?.recent_errors?.length === 0 && (
             <div className="flex flex-col items-center justify-center py-8 text-rose-300">
                <span className="material-symbols-outlined text-3xl mb-1">check_circle</span>
                <p className="text-xs font-medium">Nenhum erro crítico</p>
             </div>
          )}
          {data?.recent_errors?.map((err: any) => (
            <div key={err.id} className="bg-white dark:bg-surface-dark p-3 rounded-2xl text-xs shadow-sm border border-rose-100 dark:border-rose-900/20">
              <div className="flex justify-between items-center mb-1">
                <span className="font-black text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded-lg text-[10px]">{err.operation}</span>
                <span className="text-[10px] text-gray-400 font-bold">{new Date(err.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300 font-medium truncate mt-1" title={err.error_message}>{err.error_message}</p>
              {err.user_id && <p className="text-[9px] text-gray-400 mt-1 truncate">User: {err.user_id}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Backups & Alerts */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800">
           <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">backup</span>
            Backups Recentes
          </h3>
          <div className="space-y-2">
            {data?.recent_backups?.length === 0 && <p className="text-xs text-gray-400">Nenhum backup registrado.</p>}
            {data?.recent_backups?.map((b: any) => (
              <div key={b.id} className="flex justify-between items-center text-xs p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-xl transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="size-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                        <span className="material-symbols-outlined text-sm">cloud_download</span>
                    </div>
                    <div>
                        <p className="font-bold text-gray-700 dark:text-gray-200">Backup Diário</p>
                        <p className="text-[10px] text-gray-400">{new Date(b.created_at).toLocaleDateString()} • {new Date(b.created_at).toLocaleTimeString()}</p>
                    </div>
                </div>
                <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider">SUCESSO</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardOperations;
