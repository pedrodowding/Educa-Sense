
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDailyProgress } from '../hooks/useDailyProgress';

const ProgramsListPage: React.FC = () => {
  const navigate = useNavigate();
  const { dailyState, loading } = useDailyProgress();

  const programs = [
    { 
      id: 'ex-facil', 
      name: 'Exercício Fácil', 
      desc: 'Atividades e quizzes com IA personalizados.',
      roleDesc: 'Usado como aprendizado principal no Plano de hoje',
      time: '⏱ 6–7 min',
      stepIndex: 1, // Corresponds to step 2 in daily plan (0-indexed)
      status: 'Ativo', 
      icon: 'auto_awesome', 
      path: '/exercicio-facil',
      color: 'bg-primary'
    },
    { 
      id: 'leitura', 
      name: 'Leitura Guiada', 
      desc: 'Analise e incentive a leitura do seu filho.', 
      roleDesc: 'Programa complementar',
      time: '⏱ 10 min',
      stepIndex: -1,
      status: 'Ativo', 
      icon: 'menu_book', 
      path: '/leitura-guiada',
      color: 'bg-blue-400'
    },
    { 
      id: 'artes', 
      name: 'Artes Criativas', 
      desc: 'Desafios de desenho e expressão artística.', 
      roleDesc: 'Usado como passo criativo no Plano de hoje',
      time: '⏱ 2–3 min',
      stepIndex: 2, // Corresponds to step 3 in daily plan
      status: 'Ativo', 
      icon: 'palette', 
      path: '/artes-criativas',
      color: 'bg-purple-400'
    },
    { 
      id: 'ingles', 
      name: 'Inglês Todo Dia', 
      desc: 'Vocabulário básico com foco no dia a dia.', 
      roleDesc: 'Programa complementar',
      time: '⏱ 5 min',
      stepIndex: -1,
      status: 'Ativo', 
      icon: 'language', 
      path: '/ingles-todo-dia',
      color: 'bg-orange-400'
    },
    { 
      id: 'missao', 
      name: 'Missão Criativa', 
      desc: 'Dê vida aos seus desenhos com mágica!', 
      roleDesc: 'Recompensa especial do dia',
      time: '✨ Mágica',
      stepIndex: -1,
      status: 'Special', 
      icon: 'auto_awesome', 
      path: '/missao-criativa',
      color: 'bg-pink-500',
      isReward: true
    }
  ];

  const isStepDone = (index: number) => {
    return dailyState?.steps_completed[index] || false;
  };

  const isPlanDone = dailyState?.status === 'done';

  if (loading) {
     return <div className="p-8 text-center text-gray-400">Carregando programas...</div>;
  }

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10">
        <h1 className="text-3xl font-black text-primary leading-none">Programas</h1>
        <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Sua Jornada Educacional</p>
        
        {/* Context Block: Plano de hoje */}
        <div className="mt-6 bg-gradient-to-r from-gray-50 to-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
           <div>
              <div className="flex items-center gap-1.5 mb-1">
                 <span className="material-symbols-outlined text-sm text-primary">event_note</span>
                 <h2 className="text-xs font-black uppercase tracking-wider text-primary">Plano de hoje</h2>
              </div>
              <p className="text-xs text-gray-600 font-medium">
                 O programa principal do dia é: <br/>
                 <span className="font-bold text-gray-900">Exercício Fácil (6–7 min)</span>
              </p>
           </div>
           <button 
             onClick={() => navigate('/plano-hoje')}
             className="bg-black text-white px-3 py-2 rounded-lg text-[10px] font-bold active:scale-95 transition-all whitespace-nowrap"
           >
             Ir para Plano
           </button>
        </div>
      </header>

      <main className="px-6 space-y-4">
        {programs.map(prog => {
          const isLocked = (prog as any).isReward && !isPlanDone;
          
          return (
          <button 
            key={prog.id}
            onClick={() => {
                if (isLocked) {
                    alert('Complete o Plano de Hoje para desbloquear essa missão especial!');
                    return;
                }
                navigate(prog.path);
            }}
            className={`w-full text-left p-6 rounded-[32px] border shadow-soft transition-all active:scale-95 bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-800 relative overflow-hidden ${isLocked ? 'opacity-70 grayscale-[0.5]' : ''}`}
          >
            {/* Badge: Feito hoje */}
            {prog.stepIndex >= 0 && isStepDone(prog.stepIndex) && (
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check</span>
                    Feito hoje
                </div>
            )}
            
            {/* Badge: Bloqueado */}
            {isLocked && (
                <div className="absolute top-4 right-4 bg-gray-100 text-gray-500 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">lock</span>
                    Bloqueado
                </div>
            )}

            <div className="flex items-start gap-4 mb-4">
              <div className={`size-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${prog.color}`}>
                <span className="material-symbols-outlined">{prog.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                 <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-black text-lg truncate">{prog.name}</h3>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                        {prog.time}
                    </span>
                 </div>
                 <p className="text-xs text-text-sub font-medium leading-snug mb-2">{prog.desc}</p>
                 <p className="text-[10px] text-primary font-bold">{prog.roleDesc}</p>
              </div>
            </div>
            <div className="flex items-center justify-end text-primary text-[10px] font-black uppercase tracking-widest gap-2">
               {isLocked ? 'Complete o dia' : 'Começar'} <span className="material-symbols-outlined text-sm">{isLocked ? 'lock' : 'arrow_forward'}</span>
            </div>
          </button>
        )})}
      </main>
    </div>
  );
};

export default ProgramsListPage;
