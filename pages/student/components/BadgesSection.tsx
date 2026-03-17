import React from 'react';
import { Badge } from '../../../types';

interface Props {
  badges: Badge[];
}

export const BadgesSection: React.FC<Props> = ({ badges }) => {
  const defaultBadges = [
    { id: 'math-master', icon: 'calculate', name: 'Gênio dos Números', color: 'bg-blue-400' },
    { id: 'reader-star', icon: 'menu_book', name: 'Estrela da Leitura', color: 'bg-green-400' },
    { id: 'artist', icon: 'palette', name: 'Pequeno Da Vinci', color: 'bg-purple-400' },
    { id: 'english', icon: 'language', name: 'Poliglota Mirim', color: 'bg-orange-400' }
  ];

  const earnedIds = badges.map(b => b.id);
  const nextBadge = defaultBadges.find(b => !earnedIds.includes(b.id));

  // Sprint 7: Medalhas com Proximidade (Apenas "quase lá")
  return (
    <section className="mx-6 mb-8 space-y-4">
       <h3 className="text-xl font-black flex items-center gap-2">
          <span className="material-symbols-outlined text-yellow-500 filled">workspace_premium</span>
          Conquistas
       </h3>
       <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
          {/* Badges Reais (Últimas 2 ganhas para reforço positivo) */}
          {badges.slice(0, 2).map(badge => (
            <div key={badge.id} className="flex flex-col items-center gap-2 shrink-0 p-4 rounded-3xl border-2 bg-white border-primary shadow-soft min-w-[100px]">
               <div className="size-14 rounded-2xl flex items-center justify-center text-white shadow-md bg-yellow-400">
                  <span className="material-symbols-outlined text-2xl">{badge.icon}</span>
               </div>
               <span className="text-[10px] font-black uppercase text-center w-24 leading-tight">{badge.name}</span>
            </div>
          ))}

          {/* Próxima Medalha (Foco na Proximidade) */}
          {nextBadge ? (
            <div className="flex flex-col items-center gap-2 shrink-0 p-4 rounded-3xl border-2 border-dashed border-gray-300 bg-gray-50 min-w-[140px] relative group animate-pulse-slow">
               <div className={`size-14 rounded-2xl flex items-center justify-center text-white shadow-sm ${nextBadge.color} opacity-50 grayscale`}>
                  <span className="material-symbols-outlined text-2xl">{nextBadge.icon}</span>
               </div>
               <div className="text-center">
                 <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">{nextBadge.name}</span>
                 <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-1 rounded-full whitespace-nowrap">
                    Falta pouco! 🚀
                 </span>
               </div>
            </div>
          ) : (
            // Se já ganhou todas
             <div className="flex items-center gap-2 p-4 rounded-3xl bg-yellow-50 border-2 border-yellow-200">
                <span className="material-symbols-outlined text-yellow-500">emoji_events</span>
                <span className="text-xs font-bold text-yellow-700">Você completou todas! Uau!</span>
             </div>
          )}
       </div>
    </section>
  );
};
