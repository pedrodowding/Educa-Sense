import React from 'react';
import { Child } from '../../../types';
import { calculateLevel, calculateNextLevelXp } from '../../../services/gamificationService';

interface Props {
  child: Child;
  onLogout: () => void;
}

export const StudentHeader: React.FC<Props> = ({ child, onLogout }) => {
  // Guard Clause: Se child for null/undefined, renderiza um skeleton ou null
  if (!child) {
      return (
        <header className="p-6 pb-2 flex flex-col gap-6 bg-white dark:bg-background-dark animate-pulse">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="size-16 rounded-3xl bg-gray-200"></div>
                    <div>
                        <div className="h-6 w-32 bg-gray-200 rounded mb-2"></div>
                        <div className="h-4 w-48 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        </header>
      );
  }

  // Safe access to properties
  const xp = child.xp || 0;
  const name = child.name || 'Aluno';
  const firstName = child?.name?.split(' ')?.[0] ?? 'Aluno';

  const currentLevel = calculateLevel(xp);
  const nextLevelXp = calculateNextLevelXp(currentLevel);
  const prevLevelXp = calculateNextLevelXp(currentLevel - 1);
  const xpInLevel = xp - prevLevelXp;
  const xpRequiredForNext = nextLevelXp - prevLevelXp;
  const progressPercent = Math.min(100, Math.max(0, (xpInLevel / xpRequiredForNext) * 100));
  const xpRemaining = nextLevelXp - xp;

  // Sprint 7: Progresso Simplificado
  // Mensagem motivacional baseada na proximidade do nível
  const getProgressMessage = () => {
     if (progressPercent > 80) return "Falta pouquinho para o próximo nível! 🚀";
     if (progressPercent > 50) return "Você já passou da metade! Continue assim! ⭐";
     return "Vamos conquistar mais estrelas hoje?";
  };

  return (
    <header className="p-6 pb-2 flex flex-col gap-6 bg-white dark:bg-background-dark">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
           <div className="size-16 rounded-3xl bg-white border-2 border-primary overflow-hidden shadow-lg">
              <img 
                src={child.avatar || `https://api.dicebear.com/9.x/avataaars/svg?seed=${name}`} 
                alt={name} 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = `https://ui-avatars.com/api/?name=${name}&background=random`;
                }}
              />
           </div>
           <div>
              <h1 className="text-2xl font-black leading-none">Oi, {firstName}!</h1>
              <p className="text-sm font-bold text-gray-400 mt-1">Vamos aprender brincando?</p>
           </div>
        </div>
        <button
          onClick={onLogout}
          className="size-12 rounded-2xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center shadow-sm text-gray-400 active:scale-95 transition-all"
        >
           <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      {/* Sprint 7: Barra única de progresso (menos números, mais intenção) */}
      <div className="bg-gray-50 dark:bg-surface-dark rounded-[24px] p-5 border border-gray-100 dark:border-gray-800">
         <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-black text-primary flex items-center gap-2">
               <span className="material-symbols-outlined text-lg filled">bolt</span>
               Nível {currentLevel}
            </span>
            <span className="text-xs font-bold text-gray-400">
               {getProgressMessage()}
            </span>
         </div>
         <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
             <div 
               className="h-full bg-gradient-to-r from-primary to-yellow-400 transition-all duration-1000 ease-out relative" 
               style={{ width: `${progressPercent}%` }}
             >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
             </div>
         </div>
      </div>
    </header>
  );
};
