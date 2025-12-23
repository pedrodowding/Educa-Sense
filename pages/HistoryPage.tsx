
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Exercise } from '../types';

interface Props {
  history: Exercise[];
}

const HistoryPage: React.FC<Props> = ({ history }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h2 className="text-lg font-bold flex-1 text-center pr-10">Histórico</h2>
      </header>

      <main className="p-4 pb-24">
        {history.length === 0 ? (
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
              {history.map(item => (
                <div 
                  key={item.id}
                  onClick={() => navigate(`/exercicio-facil/resultado/${item.id}`)}
                  className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-3">
                      <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">
                          {item.subject === 'Matemática' ? 'calculate' : 'menu_book'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-primary mb-1 block">{item.subject}</span>
                        <h4 className="font-bold">{item.title}</h4>
                      </div>
                    </div>
                    {item.score !== undefined && (
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-black text-primary">{item.score.toFixed(1)}</span>
                        <span className="text-[10px] font-bold uppercase text-text-sub">Pontos</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-text-sub font-medium">
                      <span>{item.childName}</span>
                      <span>•</span>
                      <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                    </div>
                    <button className="text-xs font-bold text-primary flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">visibility</span>
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default HistoryPage;
