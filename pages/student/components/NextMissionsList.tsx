import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Exercise } from '../../../types';

interface Props {
  exercises: Exercise[];
}

export const NextMissionsList: React.FC<Props> = ({ exercises }) => {
  const navigate = useNavigate();
  const pending = exercises.filter(e => !e.completed);

  // Sorting logic: prioritize unfinished, then by date? 
  // Requirement: "Ordenar por recomendação (mais relevante primeiro)". 
  // Let's assume recent ones are more relevant.
  const sorted = [...pending].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (sorted.length === 0) {
      return (
        <section className="mx-6 mb-8 p-8 text-center bg-gray-50 dark:bg-surface-dark rounded-[32px] border-4 border-dashed border-gray-100 dark:border-gray-800">
            <span className="material-symbols-outlined text-4xl text-gray-200 mb-2">check_circle</span>
            <p className="text-sm font-bold text-gray-400">Sem missões pendentes!</p>
        </section>
      );
  }

  return (
    <section className="mx-6 mb-20 space-y-4">
      <h3 className="text-xl font-black flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">explore</span>
        Próximas Missões
      </h3>
      
      <div className="space-y-4">
        {sorted.map(ex => (
          <button 
            key={ex.id}
            onClick={() => navigate(`/exercicio-facil/quiz/${ex.id}`)}
            className="w-full text-left bg-white dark:bg-surface-dark p-5 rounded-[32px] border-4 border-gray-50 dark:border-gray-800 shadow-sm flex items-center gap-4 active:scale-95 transition-all group"
          >
            <div className={`size-14 rounded-[24px] flex items-center justify-center text-white shadow-lg shrink-0 ${
              ex.subject === 'Matemática' ? 'bg-blue-400' : 'bg-green-400'
            }`}>
              <span className="material-symbols-outlined text-2xl">
                {ex.subject === 'Matemática' ? 'calculate' : 'menu_book'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <p className="text-[10px] font-black uppercase text-primary tracking-widest truncate">{ex.subject} • +15 XP</p>
                {new Date().getTime() - new Date(ex.createdAt).getTime() < 86400000 && (
                  <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-wide animate-pulse shrink-0">Novo</span>
                )}
              </div>
              <h4 className="font-black text-lg group-hover:text-primary transition-colors truncate">{ex.title}</h4>
              <p className="text-xs text-gray-400 mt-1 font-medium truncate">
                {new Date(ex.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            </div>
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-black transition-colors">
               <span className="material-symbols-outlined">play_arrow</span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};
