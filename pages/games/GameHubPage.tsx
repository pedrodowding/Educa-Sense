import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameSession } from '../../contexts/GameSessionContext';
import { useStudent } from '../../contexts/StudentContext';
import { GAMES_CATALOG } from '../../data/gamesCatalog';
import { hasActiveStudentSession } from '../../services/studentSession';

type HubState = 'loading' | 'blocked' | 'empty' | 'active' | 'ready' | 'error';

export const GameHubPage: React.FC = () => {
  console.log("[hub] GameHubPage render", { t: Date.now() });
  const navigate = useNavigate();
  const { status: sessionStatus, startSession, duration, isLoading: isSessionLoading } = useGameSession();
  const { student, loading: studentLoading } = useStudent();
  
  const [hubState, setHubState] = useState<HubState>('loading');

  useEffect(() => {
    // Only run logic when both session AND student loading finish
    if (isSessionLoading || studentLoading) {
      return;
    }

    console.log('hub: load start', { student: !!student });

    // 1. Determine Final State based on Session + Catalog
    // Priority: Error > Blocked (Server) > Active > Empty Catalog > Ready
    let nextState: HubState = 'ready';

    if (sessionStatus === 'error') {
      nextState = 'error';
    } else if (sessionStatus === 'blocked') {
      nextState = 'blocked';
    } else if (sessionStatus === 'active') {
      nextState = 'active';
    } else if (GAMES_CATALOG.length === 0) {
      nextState = 'empty';
    } else {
      nextState = 'ready'; // Pending start
    }

    setHubState(nextState);
    console.log('hub: load end', { nextState });

  }, [isSessionLoading, studentLoading, student, sessionStatus]);

  // --- Renders ---

  if (isSessionLoading || hubState === 'loading' || studentLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="size-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 font-bold animate-pulse">Carregando jogos...</p>
      </div>
    );
  }

  // Se não houver aluno carregado (mas parou de carregar), mostra erro amigável em vez de redirecionar
  if (!student) {
      // Verifica se estamos em contexto de login (localStorage existe)
      if (hasActiveStudentSession()) {
          // Se tem sessão mas não carregou o aluno, pode ser delay.
          // Tenta redirecionar para o dashboard do aluno para forçar o carregamento lá
          console.warn('hub: session exists but student not loaded, redirecting to student dashboard');
          // Use setTimeout to avoid immediate render loop
          setTimeout(() => navigate('/student'), 100);
          
          return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
                <div className="size-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-indigo-600 font-bold animate-pulse">Redirecionando para seu perfil...</p>
            </div>
          );
      }

      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
            <div className="size-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-4xl">person_off</span>
            </div>
            <h2 className="text-xl font-black text-indigo-900 mb-2">Acesso pelo Perfil</h2>
            <p className="text-indigo-600 mb-8">Acesse pelo perfil do aluno para iniciar o jogo.</p>
            <button onClick={() => navigate('/login')} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black active:scale-95">
            Voltar para Login
            </button>
        </div>
      );
  }

  if (hubState === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="size-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl">error</span>
        </div>
        <h2 className="text-xl font-black text-indigo-900 mb-2">Ops! Algo deu errado</h2>
        <p className="text-indigo-600 mb-8">Não foi possível carregar a sessão de jogos.</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black active:scale-95">
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (hubState === 'blocked') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="size-20 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl">lock</span>
        </div>
        <h2 className="text-xl font-black text-indigo-900 mb-2">Acesso Indisponível</h2>
        <p className="text-indigo-600 mb-8">
          {!student ? 'Selecione um aluno para continuar.' : 'Complete suas tarefas para liberar os jogos!'}
        </p>
        <button onClick={() => navigate('/student')} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black active:scale-95">
          Voltar ao Início
        </button>
      </div>
    );
  }

  if (hubState === 'empty') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="size-20 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl">sentiment_dissatisfied</span>
        </div>
        <h2 className="text-xl font-black text-indigo-900 mb-2">Nenhum jogo disponível</h2>
        <p className="text-indigo-600 mb-8">O catálogo de jogos está vazio no momento.</p>
        <button onClick={() => navigate('/student')} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black active:scale-95">
          Voltar
        </button>
      </div>
    );
  }

  // Active or Ready state - Show Start Screen or Game List?
  // User Requirements:
  // "active: sessão ativa existe"
  // "ready: catálogo pronto e sem sessão ativa (mostra lista e botão iniciar)"
  
  // Wait, if active, we probably want to show the games directly?
  // Or show the timer and games?
  // Let's look at previous implementation.
  // It showed "Hora do Jogo!" with "Iniciar Sessão" button if status was 'pending' (which maps to 'ready' here).
  // And if active, it showed the list.

  if (hubState === 'ready') {
     return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="size-32 bg-white rounded-full flex items-center justify-center text-indigo-600 mb-8 shadow-xl animate-bounce">
           <span className="material-symbols-outlined text-6xl">sports_esports</span>
        </div>
        <h1 className="text-3xl font-black text-indigo-900 mb-4">Hora do Jogo!</h1>
        <p className="text-lg text-indigo-700 font-bold mb-8 max-w-xs mx-auto">
           Você tem {duration} minutos para se divertir com todos os jogos.
        </p>
        <button 
          onClick={() => startSession()}
          className="w-full max-w-sm py-5 bg-indigo-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-indigo-500/30 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
           <span className="material-symbols-outlined text-3xl">play_circle</span>
           Iniciar Sessão
        </button>
      </div>
    );
  }

  // hubState === 'active'
  return (
    <div className="p-6">
      <h2 className="text-xl font-black text-indigo-900 mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined">category</span>
        Escolha um jogo
      </h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES_CATALOG.map(game => (
          <button
            key={game.id}
            onClick={() => game.available && navigate(game.path)}
            disabled={!game.available}
            className={`relative overflow-hidden p-6 rounded-3xl text-left shadow-md transition-all ${
              game.available 
                ? 'bg-white hover:shadow-lg active:scale-95 cursor-pointer' 
                : 'bg-gray-100 opacity-80 cursor-not-allowed grayscale-[0.5]'
            }`}
          >
            <div className={`size-14 rounded-2xl ${game.color} text-white flex items-center justify-center mb-4 shadow-sm`}>
               <span className="material-symbols-outlined text-3xl">{game.icon}</span>
            </div>
            
            <h3 className="text-lg font-black text-gray-900 mb-1">{game.name}</h3>
            <p className="text-sm font-bold text-gray-500 leading-tight">{game.description}</p>

            {!game.available && (
              <div className="absolute top-4 right-4 bg-gray-200 text-gray-500 text-[10px] font-black px-2 py-1 rounded-lg uppercase">
                Em breve
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
