
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Child, DailyCheckIn, BehaviorGoal } from '../types';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { useDailyProgress } from '../hooks/useDailyProgress';

interface Props {
  children: Child[];
  checkIns: DailyCheckIn[];
  goals: BehaviorGoal[];
  onUpdateGoal: (id: string, progress: number) => void;
}

const BehaviorDashboardPage: React.FC<Props> = ({ children, checkIns, goals, onUpdateGoal }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const { dailyState } = useDailyProgress();
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [xpAnimation, setXpAnimation] = useState({ show: false, x: 0, y: 0 });

  const handleCheckGoal = (goal: BehaviorGoal, e: React.MouseEvent) => {
    e.stopPropagation();
    if (goal.progress >= goal.target) return;

    // Show animation
    setXpAnimation({ show: true, x: e.clientX, y: e.clientY - 50 });
    setTimeout(() => setXpAnimation(prev => ({ ...prev, show: false })), 1000);

    onUpdateGoal(goal.id, goal.progress + 1);
  };

  // Set initial selected child if none selected
  useEffect(() => {
    if (!selectedChild && children.length > 0) {
      setSelectedChild(children[0]);
    }
  }, [children, selectedChild, setSelectedChild]);

  // Deep-link redirect logic
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromDailyPlan = params.get('from') === 'dailyPlan';

    if (fromDailyPlan && dailyState?.steps_completed[0]) {
      setShowSuccessToast(true);
      const timer = setTimeout(() => {
        navigate('/plano-hoje');
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [dailyState, location.search, navigate]);

  const moodEmojis = {
    feliz: '😊',
    calmo: '😌',
    agitado: '🏃',
    triste: '😢',
    bravo: '😠',
    ok: '😐'
  };

  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-primary/5">
        <h2 className="text-2xl font-black mb-3">Nenhum estudante encontrado</h2>
        <p className="text-text-sub text-sm font-bold mb-10">Cadastre um estudante para acompanhar a rotina.</p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all"
          >
            Ir para Configurações
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full h-14 bg-white/70 dark:bg-gray-800 font-black rounded-2xl active:scale-95 transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const childCheckIns = checkIns.filter(c => c.childId === selectedChild.id);
  const childGoals = goals.filter(g => g.childId === selectedChild.id);
  const lastCheckIn = childCheckIns[0];
  const isTodayDone = dailyState?.steps_completed[0] || false;

  return (
    <div className="flex flex-col min-h-full pb-32 relative">
      {/* XP Animation Popup */}
      {xpAnimation.show && (
        <div 
            className="fixed z-[100] pointer-events-none animate-float-up text-yellow-500 font-black text-xl shadow-sm"
            style={{ left: xpAnimation.x, top: xpAnimation.y }}
        >
            +10 XP
        </div>
      )}

      {/* Toast de Sucesso */}
      {showSuccessToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-green-400">check_circle</span>
          <span className="font-bold text-sm">Check-in concluído!</span>
        </div>
      )}

      <header className="p-6 pt-10 flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-black text-primary leading-none">Rotina & Bem-estar</h1>
          <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Visão Comportamental</p>
        </div>

        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
          {children.map(child => (
            <button 
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shrink-0 transition-all ${selectedChild?.id === child.id ? 'border-primary bg-primary/10' : 'border-gray-100 bg-white dark:bg-surface-dark opacity-50'}`}
            >
              <img src={child.avatar} alt={child.name} className="size-6 rounded-full" />
              <span className="text-sm font-bold">{child.name}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Context Banner */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
           <div>
              <div className="flex items-center gap-1.5 mb-1">
                 <span className="material-symbols-outlined text-sm text-orange-600">event_note</span>
                 <h2 className="text-xs font-black uppercase tracking-wider text-orange-700">Plano de hoje (10 min)</h2>
              </div>
              <p className="text-xs text-orange-800 font-medium">
                 Este é o passo 1: <br/>
                 <span className="font-bold">Check-in rápido (30–45s)</span>
              </p>
           </div>
           <button 
             onClick={() => navigate('/plano-hoje')}
             className="text-orange-700 text-[10px] font-bold underline active:scale-95 transition-all whitespace-nowrap"
           >
             Voltar para Plano
           </button>
        </div>

        {/* Status Card */}
        <section className="bg-white dark:bg-surface-dark rounded-[40px] p-6 border border-gray-100 dark:border-gray-800 shadow-soft">
           <div className="flex justify-between items-start mb-6">
              <div>
                 <h3 className="text-xl font-black">Status de Hoje</h3>
                 <div className="group relative inline-block">
                    <span className="material-symbols-outlined text-gray-300 text-sm cursor-help">info</span>
                    <div className="absolute left-0 bottom-full mb-2 w-48 p-2 bg-black text-white text-[10px] rounded-lg hidden group-hover:block z-50">
                        A verificação é automática ao completar o Check-in e as atividades do Plano Diário.
                    </div>
                 </div>
                 {isTodayDone ? (
                   <div className="flex items-center gap-1 text-green-600 mt-1">
                     <span className="material-symbols-outlined text-sm">check_circle</span>
                     <p className="text-xs font-bold">Check-in de hoje registrado</p>
                   </div>
                 ) : (
                   <p className="text-xs text-text-sub mt-1">Nenhum check-in feito hoje. <br/><span className="text-[10px] opacity-70">Leva menos de 1 minuto</span></p>
                 )}
                 {isTodayDone && <p className="text-[10px] text-gray-400 font-medium mt-1">Passo 1 de 3 concluído</p>}
              </div>
              <button 
                onClick={() => {
                   const params = new URLSearchParams(location.search);
                   const from = params.get('from');
                   navigate(from ? `/rotina/checkin?from=${from}` : '/rotina/checkin');
                }}
                className={`${isTodayDone ? 'bg-green-100 text-green-700' : 'bg-primary text-black'} text-[10px] font-black px-4 py-2 rounded-xl uppercase shadow-glow transition-all active:scale-95`}
              >
                {isTodayDone ? 'Check-in Feito' : 'Concluir check-in (30s)'}
              </button>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl flex items-center gap-3">
                 <span className="text-3xl">
                   {isTodayDone && dailyState?.mood ? moodEmojis[dailyState.mood as keyof typeof moodEmojis] || '😐' : (lastCheckIn ? moodEmojis[lastCheckIn.mood] : '❓')}
                 </span>
                 <div>
                    <p className="text-[10px] font-black text-text-sub uppercase">Humor</p>
                    <p className="font-bold capitalize">
                      {isTodayDone && dailyState?.mood ? dailyState.mood : (lastCheckIn?.mood || 'Pendente')}
                    </p>
                 </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl flex items-center gap-3">
                 <span className="material-symbols-outlined text-blue-400">bedtime</span>
                 <div>
                    <p className="text-[10px] font-black text-text-sub uppercase">Sono</p>
                    <p className="font-bold">
                       {isTodayDone && dailyState?.sleep 
                         ? (dailyState.sleep === 'bom' ? 'Bom' : dailyState.sleep === 'medio' ? 'Médio' : 'Ruim')
                         : (lastCheckIn ? `${lastCheckIn.sleepQuality}/5` : '--')}
                    </p>
                 </div>
              </div>
           </div>
        </section>

        {/* AI Action Plan Banner - Reduced Hierarchy */}
        <section 
          onClick={() => navigate('/rotina/plano')}
          className="bg-gray-50 dark:bg-gray-800/50 rounded-[32px] p-5 border border-gray-100 dark:border-gray-800 relative overflow-hidden active:scale-95 transition-transform cursor-pointer"
        >
           <div className="relative z-10 flex flex-col gap-1">
              <div className="flex items-center gap-2 text-gray-500">
                 <span className="material-symbols-outlined text-sm">psychology</span>
                 <span className="text-[10px] font-bold uppercase tracking-widest">IA Insight</span>
              </div>
              <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 leading-tight">Ver Plano de Ação (7 dias)</h4>
           </div>
           <span className="material-symbols-outlined absolute -right-2 -bottom-2 text-gray-200 dark:text-gray-700/20 text-[60px] rotate-12">assignment</span>
        </section>

        {/* Weekly Goals */}
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-black">Metas da Semana</h3>
              <button 
                onClick={() => navigate('/rotina/metas')}
                className="text-[10px] font-black text-primary uppercase"
              >
                Gerenciar
              </button>
           </div>
           <div className="space-y-3">
              {childGoals.length > 0 ? childGoals.map(goal => {
                const isCompleted = goal.progress >= goal.target;
                const progressPercent = goal.target > 0 ? (goal.progress / goal.target) * 100 : 0;
                
                return (
                <div 
                    key={goal.id} 
                    onClick={(e) => handleCheckGoal(goal, e)}
                    className={`relative p-4 rounded-3xl border transition-all active:scale-95 cursor-pointer select-none flex items-center gap-4 
                        ${isCompleted 
                            ? 'bg-green-50 border-green-200 shadow-sm' 
                            : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-800 hover:border-primary/30'}`}
                >
                   {/* Checkbox / Icon */}
                   <div className={`size-12 shrink-0 rounded-2xl flex items-center justify-center transition-all duration-500
                       ${isCompleted 
                           ? 'bg-green-500 text-white shadow-lg shadow-green-500/30 scale-110' 
                           : 'bg-gray-100 dark:bg-gray-800 text-gray-300'}`}>
                      <span className="material-symbols-outlined text-2xl">
                          {isCompleted ? 'star' : 'check_box_outline_blank'}
                      </span>
                   </div>

                   <div className="flex-1 min-w-0">
                      <p className={`text-base font-bold transition-colors ${isCompleted ? 'text-green-800' : 'text-gray-800 dark:text-white'}`}>
                          {goal.description}
                      </p>
                      
                      {/* Progress Bar */}
                      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
                         <div 
                           className={`h-full transition-all duration-700 ${isCompleted ? 'bg-green-500' : 'bg-primary'}`} 
                           style={{ width: `${Math.min(100, progressPercent)}%` }}
                         ></div>
                      </div>
                   </div>

                   <div className="text-right">
                       <span className={`text-xs font-black ${isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                           {goal.progress}/{goal.target}
                       </span>
                   </div>
                   
                   {/* Confetti effect placeholder or sparkle could go here */}
                </div>
              )}) : (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-dashed border-gray-200">
                    <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">flag</span>
                    <p className="text-sm font-bold text-gray-500">Quando você marca metas,<br/>o progresso aparece aqui.</p>
                </div>
              )}
           </div>
        </section>
      </main>
    </div>
  );
};

export default BehaviorDashboardPage;
