import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDailyProgress } from '../../../hooks/useDailyProgress';
import { Child } from '../../../types';

interface Props {
  child: Child;
}

export const TodayPlanCard: React.FC<Props> = ({ child }) => {
  const navigate = useNavigate();
  const { dailyState, loading, refresh } = useDailyProgress(child.id);
  
  // Refresh daily progress when childId changes or mount
  useEffect(() => {
    refresh();
  }, [child.id]);

  if (loading) {
    return <div className="h-40 bg-gray-100 rounded-[32px] animate-pulse mx-6" />;
  }

  const stepsCount = dailyState?.stepsCount || 0;
  const isComplete = dailyState?.status === 'done';
  const steps = dailyState?.steps_completed || [false, false, false];
  const drawingEnabled = child.drawingEnabled !== false;

  // Sprint 7: Narrativa Diária
  const narrativeItems = [
    { label: 'Fazer seu check-in', done: steps[0] },
    { label: 'Completar uma missão', done: steps[1] },
    { label: 'Ganhar +1 estrela ⭐', done: steps[2] }
  ];

  const handleAction = () => {
    if (isComplete) {
      navigate('/resumo-hoje'); // Or maybe just stay here and celebrate? User said "Concluído" with celebration state.
      // But button action logic: 0/3 -> Start, 1-2/3 -> Continue.
      return;
    }
    
    // Determine next step
    if (!steps[0]) navigate('/plano-hoje'); // Check-in
    else if (!steps[1]) navigate('/plano-hoje'); // Exercise (usually managed by DailyPlanPage logic)
    else navigate('/plano-hoje'); // Creative/Extra
  };

  return (
    <section className="mx-6 mt-2 mb-6 bg-primary text-black p-6 rounded-[32px] shadow-glow relative overflow-hidden">
      <div className="relative z-10">
         <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 opacity-80">
              <span className="material-symbols-outlined text-sm">event_note</span>
              <span className="text-[10px] font-black uppercase tracking-widest">Missão de hoje</span>
            </div>
            <div className="bg-black/10 px-2 py-1 rounded-lg text-xs font-black">
              {stepsCount}/3
            </div>
         </div>

         <h2 className="text-2xl font-black mb-4 leading-tight">
            {isComplete ? 'Você mandou bem hoje! 🎉' : 'Vamos completar sua missão?'}
         </h2>

         {/* Sprint 7: Bloco "Hoje você vai..." (Narrativa) */}
         {!isComplete && (
           <div className="bg-black/5 rounded-2xl p-4 mb-6 backdrop-blur-sm border border-black/5">
              <h3 className="text-sm font-black mb-2 flex items-center gap-2 opacity-80">
                 <span className="material-symbols-outlined text-lg">target</span>
                 Hoje você vai:
              </h3>
              <ul className="space-y-2">
                 {narrativeItems.map((item, idx) => (
                    <li key={idx} className={`text-sm font-bold flex items-center gap-2 transition-all ${item.done ? 'opacity-40 line-through decoration-2' : ''}`}>
                       <span className={`size-4 rounded-full border-2 flex items-center justify-center ${item.done ? 'border-black bg-black text-white' : 'border-black/30'}`}>
                          {item.done && <span className="material-symbols-outlined text-[10px]">check</span>}
                       </span>
                       {item.label}
                    </li>
                 ))}
              </ul>
           </div>
         )}

         {/* Visual List (Mantido mas simplificado ou removido se a narrativa substitui? A spec diz "Adicionar um bloco leve... Criança entende o plano sem ler a lista técnica". A lista visual antiga (steps) talvez seja redundante ou "técnica". A spec diz "Adicionar um bloco leve, integrado ao Plano". Vou manter a lista visual antiga escondida ou remover, já que a narrativa substitui visualmente o "checklist". Vou comentar a lista antiga para limpar a UI conforme "Home não fica mais carregada") */}
         
         {/* 
         <div className="space-y-2 mb-6">
            ... (Lista antiga removida para evitar duplicação visual com a narrativa)
         </div> 
         */}

         <button 
           onClick={handleAction}
           disabled={isComplete}
           className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
             isComplete 
               ? 'bg-black/10 text-black/50 cursor-default hidden' // Hide main CTA when complete to show Reward CTA
               : 'bg-black text-white active:scale-95 shadow-black/20'
           }`}
         >
             <>
                <span className="material-symbols-outlined">{stepsCount === 0 ? 'play_circle' : 'resume'}</span>
                {stepsCount === 0 ? 'Começar Missão' : 'Continuar'}
             </>
         </button>

         {/* Sprint 7: CTA de Recompensa (Estado Pós-Conclusão) */}
         {isComplete && drawingEnabled && (
           <div className="mt-2 bg-white/90 backdrop-blur text-black p-5 rounded-2xl animate-fade-in-up shadow-lg border-2 border-white">
              <h4 className="font-black text-lg flex items-center gap-2 mb-1">
                 🎁 Recompensa disponível!
              </h4>
              <p className="text-xs font-bold text-gray-600 mb-3">Você completou tudo. Hora de celebrar!</p>
              <button 
                onClick={() => navigate('/missao-criativa')} // Ou '/meu-album'
                className="bg-black text-white px-4 py-3 rounded-xl text-sm font-black w-full shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2"
              >
                 <span className="material-symbols-outlined text-yellow-400">star</span>
                 Criar minha história
              </button>
           </div>
         )}

      </div>
      <span className="material-symbols-outlined absolute -right-8 -bottom-12 text-black/5 text-[180px] rotate-12 pointer-events-none">rocket_launch</span>
    </section>
  );
};
