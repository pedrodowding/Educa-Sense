import React from 'react';
import { SubjectProgress } from '../../services/progressService';

interface Props {
  data: SubjectProgress[];
  isLocked?: boolean;
  onUnlock?: () => void;
}

export const SubjectProgressCard: React.FC<Props> = ({ data, isLocked = false, onUnlock }) => {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/60 dark:bg-black/60 backdrop-blur-[2px]">
          <span className="material-symbols-outlined text-4xl text-primary mb-2">lock</span>
          <p className="font-black text-gray-900 dark:text-white mb-3">Relatório Exclusivo Pro</p>
          {onUnlock && (
            <button 
              onClick={onUnlock}
              className="px-6 py-2 bg-primary text-white font-bold rounded-xl shadow-lg active:scale-95 transition-transform"
            >
              Desbloquear
            </button>
          )}
        </div>
      )}

      <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-amber-400">school</span>
        Por Matéria
      </h3>
      
      <div className={`space-y-6 ${isLocked ? 'filter blur-sm select-none' : ''}`}>
        {data.map((subject, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-700 dark:text-gray-200">{subject.subject}</span>
              <div className="text-right">
                <span className="text-xs font-black text-primary block">{subject.completion_rate}% Concluído</span>
                <span className="text-[10px] text-gray-400 block">Precisão: {subject.average_accuracy}%</span>
              </div>
            </div>
            
            <div className="h-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-1000 ease-out relative"
                style={{ width: `${subject.completion_rate}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
            
            <div className="flex justify-end">
               <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                 <span className="material-symbols-outlined text-[12px]">bolt</span>
                 +{subject.total_xp} XP
               </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
