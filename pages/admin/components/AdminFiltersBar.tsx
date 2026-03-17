import React from 'react';
import { TabKey } from '../adminUi';

type Props = {
  tab: TabKey;
  q: string;
  from: string;
  to: string;
  activityDays?: number;
  selectedUserId: string;
  users: any[];
  loading: boolean;
  error: string | null;
  onChangeQ: (v: string) => void;
  onChangeFrom: (v: string) => void;
  onChangeTo: (v: string) => void;
  onChangeActivityDays?: (v: number) => void;
  onChangeSelectedUserId: (v: string) => void;
  onApply: () => void;
  onExportUsers: (mode: 'csv' | 'xls') => void;
  onExportUsage: (mode: 'csv' | 'xls') => void;
  onExportAudit: (mode: 'csv' | 'xls') => void;
};

const AdminFiltersBar: React.FC<Props> = ({
  tab,
  q,
  from,
  to,
  activityDays,
  selectedUserId,
  users,
  loading,
  error,
  onChangeQ,
  onChangeFrom,
  onChangeTo,
  onChangeActivityDays,
  onChangeSelectedUserId,
  onApply,
  onExportUsers,
  onExportUsage,
  onExportAudit
}) => {
  return (
    <section className="bg-white dark:bg-surface-dark p-4 rounded-[28px] border border-gray-100 dark:border-gray-800 space-y-3">
      <div className="flex gap-2">
        <input
          value={q}
          onChange={e => onChangeQ(e.target.value)}
          placeholder="Buscar por e-mail ou nome"
          className="flex-1 h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 font-bold text-xs focus:ring-2 focus:ring-primary"
        />
        <select
          value={selectedUserId}
          onChange={e => onChangeSelectedUserId(e.target.value)}
          className="h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-3 font-bold text-xs focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos</option>
          {users.slice(0, 200).map(u => (
            <option key={u.id} value={u.id}>
              {(u.email || u.name || u.id).slice(0, 30)}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          type="datetime-local"
          value={from}
          onChange={e => onChangeFrom(e.target.value)}
          className="h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 font-bold text-xs focus:ring-2 focus:ring-primary"
        />
        <input
          type="datetime-local"
          value={to}
          onChange={e => onChangeTo(e.target.value)}
          className="h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 font-bold text-xs focus:ring-2 focus:ring-primary"
        />
      </div>

      {tab === 'users' && onChangeActivityDays && (
        <div className="grid grid-cols-2 gap-2">
          <div className="h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">Ativo (dias)</span>
            <input
              type="number"
              min={0}
              max={365}
              value={String(activityDays ?? 0)}
              onChange={e => onChangeActivityDays(Number(e.target.value || 0))}
              className="w-20 bg-transparent text-right font-black text-xs outline-none"
            />
          </div>
          <div className="h-12 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-4 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">Export</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-text-sub">CSV/XLS</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onApply}
          disabled={loading}
          className="flex-1 h-12 bg-primary text-black font-black rounded-2xl active:scale-95 transition-all text-xs"
        >
          {loading ? 'Carregando...' : 'Aplicar filtros'}
        </button>
        {tab === 'users' && (
          <>
            <button onClick={() => onExportUsers('csv')} className="h-12 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 font-black text-xs">
              CSV
            </button>
            <button onClick={() => onExportUsers('xls')} className="h-12 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 font-black text-xs">
              Excel
            </button>
          </>
        )}
        {tab === 'api' && (
          <>
            <button onClick={() => onExportUsage('csv')} className="h-12 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 font-black text-xs">
              CSV
            </button>
            <button onClick={() => onExportUsage('xls')} className="h-12 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 font-black text-xs">
              Excel
            </button>
          </>
        )}
        {tab === 'logs' && (
          <>
            <button onClick={() => onExportAudit('csv')} className="h-12 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 font-black text-xs">
              CSV
            </button>
            <button onClick={() => onExportAudit('xls')} className="h-12 px-4 rounded-2xl bg-gray-100 dark:bg-gray-800 font-black text-xs">
              Excel
            </button>
          </>
        )}
      </div>

      {error && <div className="text-red-500 text-xs font-bold">{error}</div>}
    </section>
  );
};

export default AdminFiltersBar;
