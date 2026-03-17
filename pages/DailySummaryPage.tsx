import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useSelectedChild } from '../contexts/SelectedChildContext';
import { useChildren } from '../hooks/useChildren';
import { useDailyProgress } from '../hooks/useDailyProgress';

const DailySummaryPage: React.FC = () => {
  const navigate = useNavigate();
  const { children } = useChildren();
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const { dailyState, loading } = useDailyProgress();
  const [missionCompleted, setMissionCompleted] = useState(false);
  
  // Ensure selected child
  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]);
    }
  }, [children, selectedChild]);

  useEffect(() => {
    if (selectedChild) {
      const today = new Date().toISOString().split('T')[0];
      const key = `creative_mission_completed_${selectedChild.id}_${today}`;
      setMissionCompleted(!!localStorage.getItem(key));
    }
  }, [selectedChild]);

  if (loading) {
     return <div className="p-8 text-center text-gray-500">Carregando resumo...</div>;
  }

  if (!selectedChild) {
     return <div className="p-8 text-center">Adicione uma criança primeiro.</div>;
  }

  // State 2: Not completed
  if (!dailyState || dailyState.status !== 'done') {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm space-y-6">
                 <div className="size-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <span className="material-symbols-outlined text-4xl">pending</span>
                 </div>
                 
                 <div>
                    <h1 className="text-xl font-black text-gray-900 mb-2">Quase lá!</h1>
                    <p className="text-gray-500">Complete o Plano de hoje para ver seu resumo.</p>
                 </div>

                 <button 
                    onClick={() => navigate('/plano-hoje')}
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
                 >
                    Voltar para Plano de hoje
                 </button>
            </div>
        </div>
    );
  }

  // State 1: Completed
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
        
        {/* Simple confetti-like decorations */}
        <div className="absolute top-10 left-10 text-4xl animate-bounce delay-100">🎉</div>
        <div className="absolute top-20 right-10 text-4xl animate-bounce delay-700">⭐</div>
        <div className="absolute bottom-20 left-20 text-4xl animate-bounce delay-300">🚀</div>

        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl w-full max-w-sm border border-white space-y-8 relative z-10">
            
            <div className="space-y-4">
                <div className="size-24 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-6 shadow-inner">
                    <span className="material-symbols-outlined text-5xl">emoji_events</span>
                </div>

                <h1 className="text-3xl font-black text-gray-900 leading-tight">
                    Feito!<br/>
                    <span className="text-xl font-medium text-gray-500">Hoje você avançou.</span>
                </h1>
            </div>

            <div className="space-y-3">
                <div className="flex items-center gap-3 bg-white border border-green-100 p-3 rounded-xl shadow-sm">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <span className="font-bold text-gray-700 text-sm">Check-in registrado</span>
                </div>
                 <div className="flex items-center gap-3 bg-white border border-green-100 p-3 rounded-xl shadow-sm">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <span className="font-bold text-gray-700 text-sm">Atividade concluída</span>
                </div>
                 <div className="flex items-center gap-3 bg-white border border-green-100 p-3 rounded-xl shadow-sm">
                    <span className="material-symbols-outlined text-green-500">check_circle</span>
                    <span className="font-bold text-gray-700 text-sm">Criativo feito</span>
                </div>
            </div>

            <div>
                {!missionCompleted ? (
                    <div className="bg-purple-50 border-2 border-purple-100 p-4 rounded-2xl mb-6 text-left relative overflow-hidden">
                        <div className="absolute -right-4 -top-4 text-6xl opacity-20">🎁</div>
                        <h3 className="font-black text-purple-600 mb-1 relative z-10">Missão Criativa do Dia</h3>
                        <p className="text-xs text-gray-600 mb-4 relative z-10 font-medium">Dê vida ao seu desenho! Uma recompensa especial.</p>
                        <button 
                            onClick={() => navigate('/missao-criativa')}
                            className="w-full bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-purple-200 active:scale-95 transition-all flex items-center justify-center gap-2 relative z-10"
                        >
                            <span className="material-symbols-outlined">auto_awesome</span>
                            Abrir Presente
                        </button>
                    </div>
                ) : (
                    <div className="bg-green-50 border-2 border-green-100 p-4 rounded-2xl mb-6 flex items-center gap-3">
                         <span className="material-symbols-outlined text-green-500 text-3xl">auto_awesome</span>
                         <div className="text-left">
                            <h3 className="font-bold text-green-700">Missão Cumprida!</h3>
                            <p className="text-xs text-green-600">Seu desenho ganhou vida hoje.</p>
                         </div>
                    </div>
                )}

                <p className="text-sm font-medium text-gray-400 mb-6">Volte amanhã para manter o ritmo.</p>
                <button 
                    onClick={() => navigate('/dashboard')}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                    <span className="material-symbols-outlined">home</span>
                    Voltar para Home
                </button>
            </div>
        </div>
    </div>
  );
};

export default DailySummaryPage;
