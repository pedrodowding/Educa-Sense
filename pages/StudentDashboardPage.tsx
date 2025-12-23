
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Exercise } from '../types';

interface Props {
  children: Child[];
  history: Exercise[];
  onUpdateChild: (id: string, updates: Partial<Child>) => void;
}

const StudentDashboardPage: React.FC<Props> = ({ children, history, onUpdateChild }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);

  const badges = [
    { id: 'math-master', icon: 'calculate', label: 'Gênio dos Números', color: 'bg-blue-400' },
    { id: 'reader-star', icon: 'menu_book', label: 'Estrela da Leitura', color: 'bg-green-400' },
    { id: 'artist', icon: 'palette', label: 'Pequeno Da Vinci', color: 'bg-purple-400' },
    { id: 'english', icon: 'language', label: 'Poliglota Mirim', color: 'bg-orange-400' }
  ];

  if (!selectedChild) {
    return (
      <div className="flex flex-col min-h-screen bg-primary/5 p-8 items-center justify-center text-center">
        <h1 className="text-3xl font-black mb-10">Quem vai estudar <br/><span className="text-primary italic">brincando</span> hoje?</h1>
        <div className="grid grid-cols-2 gap-6 w-full max-w-sm">
          {children.map(child => (
            <button 
              key={child.id}
              onClick={() => setSelectedChild(child)}
              className="flex flex-col items-center gap-4 group active:scale-95 transition-all"
            >
              <div className="size-32 rounded-[48px] bg-white border-4 border-white shadow-xl group-hover:border-primary overflow-hidden transition-all">
                <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
              </div>
              <span className="text-lg font-black">{child.name}</span>
            </button>
          ))}
        </div>
        <button 
          onClick={() => navigate('/dashboard')}
          className="mt-20 text-[10px] font-black uppercase text-gray-400 tracking-widest flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">settings</span> Voltar ao modo Pais
        </button>
      </div>
    );
  }

  const childExercises = history.filter(ex => ex.childName === selectedChild.name);
  const completedCount = childExercises.filter(e => e.completed).length;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
      <header className="p-6 flex items-center justify-between bg-primary/10 rounded-b-[48px] mb-8 shadow-sm">
        <div className="flex items-center gap-4">
           <div className="size-16 rounded-3xl bg-white border-2 border-primary overflow-hidden shadow-lg">
              <img src={selectedChild.avatar} alt={selectedChild.name} className="w-full h-full object-cover" />
           </div>
           <div>
              <h1 className="text-2xl font-black leading-none">Oi, {selectedChild.name}!</h1>
              <div className="flex items-center gap-3 mt-1">
                 <div className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-orange-500 text-xs filled">local_fire_department</span>
                    <span className="text-[10px] font-black">{selectedChild.streak} Dias</span>
                 </div>
                 <div className="flex items-center gap-1 bg-white/50 px-2 py-0.5 rounded-full">
                    <span className="material-symbols-outlined text-yellow-500 text-xs filled">stars</span>
                    <span className="text-[10px] font-black">{selectedChild.stars}</span>
                 </div>
              </div>
           </div>
        </div>
        <button onClick={() => setSelectedChild(null)} className="size-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-md text-gray-400">
           <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      <main className="px-6 space-y-8 flex-1 pb-10">
        <section className="bg-gradient-to-br from-primary to-primary-dark rounded-[40px] p-6 text-black shadow-xl relative overflow-hidden active:scale-95 transition-transform cursor-pointer">
           <div className="relative z-10 space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70">Nível do Explorador</h3>
              <h2 className="text-3xl font-black">{Math.floor(selectedChild.xp / 100) + 1}</h2>
              <div className="h-2 w-full bg-black/10 rounded-full overflow-hidden">
                 <div className="h-full bg-white" style={{ width: `${selectedChild.xp % 100}%` }}></div>
              </div>
              <p className="text-[10px] font-bold">Faltam {100 - (selectedChild.xp % 100)} XP para o próximo nível!</p>
           </div>
           <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-black/10 text-[180px] rotate-12">rocket_launch</span>
        </section>

        <section className="space-y-4">
           <h3 className="text-xl font-black flex items-center gap-2">
              <span className="material-symbols-outlined text-yellow-500 filled">workspace_premium</span>
              Medalhas
           </h3>
           <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {badges.map(badge => {
                const isUnlocked = selectedChild.xp > 50; 
                return (
                  <div key={badge.id} className={`flex flex-col items-center gap-2 shrink-0 p-4 rounded-3xl border-2 transition-all ${isUnlocked ? 'bg-white border-primary shadow-soft' : 'bg-gray-50 border-transparent opacity-40'}`}>
                     <div className={`size-14 rounded-2xl flex items-center justify-center text-white shadow-md ${isUnlocked ? badge.color : 'bg-gray-300'}`}>
                        <span className="material-symbols-outlined text-2xl">{badge.icon}</span>
                     </div>
                     <span className="text-[10px] font-black uppercase text-center w-20 leading-tight">{badge.label}</span>
                  </div>
                );
              })}
           </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xl font-black flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">explore</span>
            Próximas Missões
          </h3>
          
          <div className="space-y-4">
            {childExercises.length > 0 ? childExercises.filter(e => !e.completed).map(ex => (
              <button 
                key={ex.id}
                onClick={() => navigate(`/exercicio-facil/quiz/${ex.id}`)}
                className="w-full text-left bg-white dark:bg-surface-dark p-5 rounded-[40px] border-4 border-gray-50 dark:border-gray-800 shadow-soft flex items-center gap-4 active:scale-95 transition-all group"
              >
                <div className={`size-14 rounded-[24px] flex items-center justify-center text-white shadow-lg ${
                  ex.subject === 'Matemática' ? 'bg-blue-400' : 'bg-green-400'
                }`}>
                  <span className="material-symbols-outlined text-2xl">
                    {ex.subject === 'Matemática' ? 'calculate' : 'menu_book'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">{ex.subject} • +15 XP</p>
                  <h4 className="font-black text-lg group-hover:text-primary transition-colors">{ex.title}</h4>
                </div>
                <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                   <span className="material-symbols-outlined">play_arrow</span>
                </div>
              </button>
            )) : (
              <div className="p-10 text-center bg-gray-50 dark:bg-surface-dark rounded-[40px] border-4 border-dashed border-gray-100 dark:border-gray-800">
                <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 animate-pulse">check_circle</span>
                <p className="text-text-sub font-bold italic px-4 leading-relaxed">Missões do dia concluídas! Que tal pedir mais uma para o seu responsável?</p>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default StudentDashboardPage;
