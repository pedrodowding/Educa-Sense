
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, DailyCheckIn, BehaviorGoal } from '../types';

interface Props {
  children: Child[];
  checkIns: DailyCheckIn[];
  goals: BehaviorGoal[];
}

const BehaviorDashboardPage: React.FC<Props> = ({ children, checkIns, goals }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child>(children[0]);

  const childCheckIns = checkIns.filter(c => c.childId === selectedChild.id);
  const childGoals = goals.filter(g => g.childId === selectedChild.id);
  const lastCheckIn = childCheckIns[0];

  const moodEmojis = {
    feliz: '😊',
    calmo: '😌',
    agitado: '🏃',
    triste: '😢',
    bravo: '😠'
  };

  return (
    <div className="flex flex-col min-h-full pb-32">
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
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shrink-0 transition-all ${selectedChild.id === child.id ? 'border-primary bg-primary/10' : 'border-gray-100 bg-white dark:bg-surface-dark opacity-50'}`}
            >
              <img src={child.avatar} alt={child.name} className="size-6 rounded-full" />
              <span className="text-sm font-bold">{child.name}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Status Card */}
        <section className="bg-white dark:bg-surface-dark rounded-[40px] p-6 border border-gray-100 dark:border-gray-800 shadow-soft">
           <div className="flex justify-between items-start mb-6">
              <div>
                 <h3 className="text-xl font-black">Status de Hoje</h3>
                 <p className="text-xs text-text-sub">Última atualização: {lastCheckIn ? new Date(lastCheckIn.date).toLocaleDateString() : 'Sem registros'}</p>
              </div>
              <button 
                onClick={() => navigate('/rotina/checkin')}
                className="bg-primary text-black text-[10px] font-black px-4 py-2 rounded-xl uppercase shadow-glow"
              >
                Fazer Check-in
              </button>
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl flex items-center gap-3">
                 <span className="text-3xl">{lastCheckIn ? moodEmojis[lastCheckIn.mood] : '❓'}</span>
                 <div>
                    <p className="text-[10px] font-black text-text-sub uppercase">Humor</p>
                    <p className="font-bold capitalize">{lastCheckIn?.mood || 'Pendente'}</p>
                 </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-3xl flex items-center gap-3">
                 <span className="material-symbols-outlined text-blue-400">bedtime</span>
                 <div>
                    <p className="text-[10px] font-black text-text-sub uppercase">Sono</p>
                    <p className="font-bold">{lastCheckIn ? `${lastCheckIn.sleepQuality}/5` : '--'}</p>
                 </div>
              </div>
           </div>
        </section>

        {/* AI Action Plan Banner */}
        <section 
          onClick={() => navigate('/rotina/plano')}
          className="bg-background-dark text-white rounded-[40px] p-6 relative overflow-hidden active:scale-95 transition-transform cursor-pointer"
        >
           <div className="relative z-10 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-primary">
                 <span className="material-symbols-outlined">psychology</span>
                 <span className="text-[10px] font-black uppercase tracking-widest">IA Insight</span>
              </div>
              <h4 className="text-lg font-black leading-tight">Seu Plano de Ação de 7 dias está pronto!</h4>
              <p className="text-xs text-gray-400">Baseado no comportamento de {selectedChild.name} esta semana.</p>
           </div>
           <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/5 text-[120px] rotate-12">assignment</span>
        </section>

        {/* Weekly Goals */}
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-black">Metas da Semana</h3>
              <button className="text-[10px] font-black text-primary uppercase">Gerenciar</button>
           </div>
           <div className="space-y-3">
              {childGoals.length > 0 ? childGoals.map(goal => (
                <div key={goal.id} className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center gap-4">
                   <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined">verified</span>
                   </div>
                   <div className="flex-1">
                      <p className="text-sm font-bold">{goal.title}</p>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full mt-2 overflow-hidden">
                         <div 
                           className="h-full bg-primary" 
                           style={{ width: `${(goal.completedDays.length / goal.targetDays) * 100}%` }}
                         ></div>
                      </div>
                   </div>
                   <span className="text-xs font-black">{goal.completedDays.length}/{goal.targetDays}</span>
                </div>
              )) : (
                <p className="text-center text-sm text-text-sub italic py-4">Nenhuma meta ativa para esta semana.</p>
              )}
           </div>
        </section>
      </main>
    </div>
  );
};

export default BehaviorDashboardPage;
