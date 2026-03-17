import React, { useEffect, useState } from 'react';
import { fetchUserDetails, addAdminNote, deleteAdminNote } from '../adminData';
import { formatDateTime } from '../adminUi';

type Props = {
  userId: string | null;
  onClose: () => void;
};

const UserDetailModal: React.FC<Props> = ({ userId, onClose }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);

  const loadData = () => {
    if (!userId) return;
    setLoading(true);
    fetchUserDetails(userId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !noteContent.trim()) return;
    setNoteLoading(true);
    try {
      await addAdminNote(userId, noteContent);
      setNoteContent('');
      // Reload details to show new note (since it's in RPC)
      const newData = await fetchUserDetails(userId);
      setData(newData);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar nota.');
    } finally {
      setNoteLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Apagar nota?')) return;
    try {
      await deleteAdminNote(noteId);
      setData((prev: any) => ({
        ...prev,
        notes: prev.notes.filter((n: any) => n.id !== noteId)
      }));
    } catch (e) {
      console.error(e);
      alert('Erro ao apagar nota.');
    }
  };

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="w-full max-w-2xl h-full bg-white dark:bg-surface-dark shadow-2xl p-6 overflow-y-auto animate-in slide-in-from-right duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className="text-xl font-black">Perfil do Usuário</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-20 bg-gray-100 rounded-2xl"></div>
            <div className="h-40 bg-gray-100 rounded-2xl"></div>
          </div>
        ) : !data ? (
          <p>Erro ao carregar dados.</p>
        ) : (
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-black text-primary">
                {(data.profile.name || data.profile.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold">{data.profile.name}</h3>
                <p className="text-sm text-gray-500">{data.profile.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${data.profile.plan === 'Pro' || data.profile.plan === 'Premium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {data.profile.plan || 'Free'}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-black uppercase">
                    {data.profile.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30">
              <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-500 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">sticky_note_2</span>
                Notas Internas
              </h4>
              
              <div className="space-y-3 mb-4">
                {data.notes?.map((note: any) => (
                  <div key={note.id} className="bg-white dark:bg-surface-dark p-3 rounded-xl text-sm border border-amber-100 dark:border-amber-900/20 shadow-sm group relative">
                    <p className="whitespace-pre-wrap">{note.content}</p>
                    <div className="flex justify-between items-center mt-2">
                        <span className="text-[10px] text-gray-400 font-bold">{formatDateTime(note.created_at)}</span>
                        <button 
                          onClick={() => handleDeleteNote(note.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-rose-400 hover:text-rose-600 p-1"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                  </div>
                ))}
                {(!data.notes || data.notes.length === 0) && (
                  <p className="text-xs text-gray-400 italic">Nenhuma nota adicionada.</p>
                )}
              </div>

              <form onSubmit={handleAddNote} className="flex gap-2">
                <input 
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Adicionar nota interna..."
                  className="flex-1 text-xs p-2 rounded-xl border border-amber-200 dark:border-amber-800 bg-white dark:bg-surface-dark focus:ring-2 focus:ring-amber-400 outline-none"
                />
                <button 
                  type="submit" 
                  disabled={noteLoading || !noteContent.trim()}
                  className="bg-amber-500 text-white p-2 rounded-xl disabled:opacity-50 hover:bg-amber-600 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </form>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                <p className="text-2xl font-black">{data.stats.total_logins}</p>
                <p className="text-[10px] uppercase text-gray-400 font-bold">Logins</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                <p className="text-2xl font-black">{data.stats.total_activities}</p>
                <p className="text-[10px] uppercase text-gray-400 font-bold">Atividades</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                <p className="text-xs font-bold mt-2">{data.stats.last_active ? formatDateTime(data.stats.last_active) : 'Nunca'}</p>
                <p className="text-[10px] uppercase text-gray-400 font-bold">Último Acesso</p>
              </div>
            </div>

            {/* Children */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Crianças ({data.children.length})</h4>
              <div className="space-y-2">
                {data.children.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <div className="size-8 rounded-full bg-gray-200 overflow-hidden">
                       {c.avatar && <img src={c.avatar} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.age} anos • {c.grade}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs font-bold text-primary">{c.xp} XP</p>
                      <p className="text-[10px] text-gray-400">{c.streak} dias ofensiva</p>
                    </div>
                  </div>
                ))}
                {data.children.length === 0 && <p className="text-sm text-gray-400 italic">Nenhuma criança cadastrada.</p>}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Últimas Atividades</h4>
              <div className="space-y-2">
                {data.recent_activity.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between p-2 border-b border-gray-100 dark:border-gray-800 text-sm">
                    <span className="font-medium">{a.subject || a.activity_type}</span>
                    <span className="text-gray-400">{formatDateTime(a.completed_at)}</span>
                  </div>
                ))}
                {data.recent_activity.length === 0 && <p className="text-sm text-gray-400 italic">Sem atividade recente.</p>}
              </div>
            </div>

            {/* Recent Errors */}
            {data.recent_errors.length > 0 && (
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-rose-500 mb-3">Erros Recentes</h4>
                <div className="space-y-2 bg-rose-50 dark:bg-rose-900/10 p-4 rounded-2xl">
                  {data.recent_errors.map((e: any, i: number) => (
                    <div key={i} className="text-xs text-rose-700 dark:text-rose-300 mb-2 pb-2 border-b border-rose-100 last:border-0 last:mb-0 last:pb-0">
                      <p className="font-bold">{e.operation}</p>
                      <p>{e.error_message}</p>
                      <p className="text-[10px] opacity-70 mt-1">{formatDateTime(e.created_at)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserDetailModal;
