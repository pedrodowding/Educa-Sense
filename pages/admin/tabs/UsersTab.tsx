import React, { useEffect, useState } from 'react';
import { formatDateTime } from '../adminUi';
import { fetchUsersList } from '../adminData';

type Props = {
  users?: any[]; // Legacy prop compatibility if needed, but we'll fetch internally
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  onLog: (action: string, metadata?: Record<string, unknown>) => void;
};

const UsersTab: React.FC<Props> = ({ selectedUserId, onSelectUser, onLog }) => {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, planFilter, statusFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetchUsersList(page, 50, debouncedSearch, planFilter, statusFilter);
      setData(res.data);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page, debouncedSearch, planFilter, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // No need to do anything, debounce handles it. 
    // Maybe force immediate load if Enter pressed?
    setDebouncedSearch(search);
  };

  return (
    <section className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 bg-white dark:bg-surface-dark p-3 rounded-2xl border border-gray-100 dark:border-gray-800">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-10 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 text-xs font-bold focus:ring-2 focus:ring-primary"
          />
        </form>
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="h-10 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 text-xs font-bold focus:ring-2 focus:ring-primary"
        >
          <option value="">Todos Planos</option>
          <option value="Free">Free</option>
          <option value="Pro">Pro</option>
          <option value="Premium">Premium</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="h-10 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-3 text-xs font-bold focus:ring-2 focus:ring-primary"
        >
          <option value="">Status</option>
          <option value="active">Ativo (7d)</option>
          <option value="inactive">Inativo</option>
        </select>
        <button onClick={loadUsers} className="h-10 px-4 bg-black text-white rounded-xl text-xs font-black uppercase tracking-widest hover:opacity-80">
          Filtrar
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-surface-dark rounded-[24px] border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800 text-[10px] font-black uppercase tracking-widest text-gray-400">
                <th className="p-4">Usuário</th>
                <th className="p-4">Plano</th>
                <th className="p-4 text-center">Crianças</th>
                <th className="p-4">Última Atividade</th>
                <th className="p-4">Engajamento</th>
                <th className="p-4">Alertas</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading && (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td className="p-4"><div className="h-4 w-32 bg-gray-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-12 bg-gray-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-8 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="p-4"><div className="h-4 w-24 bg-gray-100 rounded"></div></td>
                    <td className="p-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="p-4"></td>
                    <td className="p-4"></td>
                  </tr>
                ))
              )}
              {!loading && data.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 text-xs italic">
                    Nenhum usuário encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
              {!loading && data.map((u) => (
                <tr key={u.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-gray-900 dark:text-white">{u.name || 'Sem nome'}</div>
                    <div className="text-xs text-gray-500">{u.email}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${u.plan === 'Pro' || u.plan === 'Premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {u.plan || 'Free'}
                    </span>
                  </td>
                  <td className="p-4 text-center font-bold text-gray-600 dark:text-gray-300">
                    {u.children_count}
                  </td>
                  <td className="p-4 text-xs text-gray-500">
                    {u.last_active_at ? formatDateTime(u.last_active_at) : 'Nunca'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                      u.engagement_score === 'High' ? 'bg-emerald-100 text-emerald-700' : 
                      u.engagement_score === 'Medium' ? 'bg-blue-100 text-blue-700' : 
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {u.engagement_score === 'High' ? 'Alto' : u.engagement_score === 'Medium' ? 'Médio' : 'Baixo'}
                    </span>
                  </td>
                  <td className="p-4">
                    {u.has_recent_error && (
                      <div className="flex items-center gap-1 text-rose-500 text-[10px] font-bold uppercase">
                        <span className="material-symbols-outlined text-sm">error</span>
                        Erro
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => {
                        onSelectUser(u.id);
                        onLog('admin_view_profile', { userId: u.id });
                      }}
                      className="size-8 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center text-gray-400 hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-lg">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <p className="text-[10px] font-bold uppercase text-gray-400">
            Mostrando {data.length} de {total}
          </p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-bold disabled:opacity-50"
            >
              Anterior
            </button>
            <button 
              disabled={data.length < 50} // Rough check, ideal is page * limit >= total
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs font-bold disabled:opacity-50"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default UsersTab;
