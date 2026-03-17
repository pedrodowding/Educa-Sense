
import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Exercise } from '../types';
import HistorySwipeRow from './components/HistorySwipeRow';

interface Props {
  history: Exercise[];
  onDeleteExercise: (id: string) => Promise<boolean>;
}

const HistoryPage: React.FC<Props> = ({ history, onDeleteExercise }) => {
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const deletingRef = useRef<Set<string>>(new Set());

  const sortedHistory = useMemo(() => {
    const next = [...history];
    next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return next;
  }, [history]);

  const requestDelete = async (id: string) => {
    if (deletingRef.current.has(id)) return;
    const ok = window.confirm('Apagar esta atividade do histórico?');
    if (!ok) return;
    deletingRef.current.add(id);
    try {
      await onDeleteExercise(id);
    } finally {
      deletingRef.current.delete(id);
      if (openId === id) setOpenId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Histórico</h2>
      </header>

      <main className="p-4 pb-24">
        {sortedHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <span className="material-symbols-outlined text-4xl">history</span>
            </div>
            <p className="text-text-sub">Você ainda não criou atividades.</p>
            <button 
              onClick={() => navigate('/exercicio-facil/criar')}
              className="bg-primary text-black px-6 py-2 rounded-full font-bold"
            >
              Criar agora
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xs font-bold uppercase text-text-sub tracking-widest">Suas atividades recentes</h3>
            <div className="flex flex-col gap-4">
              {sortedHistory.map(item => (
                <HistorySwipeRow
                  key={item.id}
                  item={item}
                  onNavigate={() => navigate(`/exercicio-facil/resultado/${item.id}`)}
                  onDelete={() => requestDelete(item.id)}
                  isAnyOpen={!!openId}
                  onOpen={() => setOpenId(item.id)}
                  onClose={() => setOpenId(cur => (cur === item.id ? null : cur))}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
