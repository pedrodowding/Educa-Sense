import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useGameSession } from '../contexts/GameSessionContext';
import { useStudent } from '../contexts/StudentContext';

export const GameLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, timeLeft, isLoading, error } = useGameSession();
  const { student } = useStudent();
  // @ts-ignore
  const providerId = (useGameSession() as any).providerId;

  // Instrumentation
  React.useEffect(() => {
    console.log('[GameLayout] render', { isLoading, status, error, providerId, t: Date.now() });
  }, [isLoading, status, error, providerId]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isHub = location.pathname === '/hora-do-jogo';

  const handleExit = () => {
    if (student) {
      navigate('/student');
    } else {
      navigate('/dashboard');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center">
        <div className="size-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        {/* Visual feedback only, logic handled in context */}
      </div>
    );
  }

  if (status === 'blocked' || error) {
    return (
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="size-20 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-4xl">block</span>
        </div>
        <h2 className="text-xl font-black text-indigo-900 mb-2">Acesso Indisponível</h2>
        <p className="text-indigo-600 mb-8">{error || 'Você não tem permissão para acessar os jogos agora.'}</p>
        <button onClick={handleExit} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black">
          Voltar
        </button>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen bg-purple-600 flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in">
        <div className="size-32 bg-white rounded-full flex items-center justify-center text-purple-600 mb-8 animate-bounce">
           <span className="material-symbols-outlined text-6xl">timer_off</span>
        </div>
        <h1 className="text-4xl font-black mb-4">Tempo Encerrado!</h1>
        <p className="text-xl font-bold opacity-90 mb-12">Você jogou muito bem hoje! 🎉</p>
        <button 
          onClick={handleExit}
          className="px-10 py-4 bg-white text-purple-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col">
      {/* Global Game Header */}
      <header className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
           {!isHub ? (
             <button onClick={() => navigate('/hora-do-jogo')} className="size-10 bg-white/20 rounded-full flex items-center justify-center active:scale-95">
                <span className="material-symbols-outlined">arrow_back</span>
             </button>
           ) : (
             <div className="size-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined">sports_esports</span>
             </div>
           )}
           <span className="font-black text-lg truncate">
             {isHub ? 'Hora do Jogo' : 'Jogando...'}
           </span>
        </div>
        
        <div className="flex items-center gap-3">
            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-xl transition-colors ${timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-indigo-800'}`}>
            <span className="material-symbols-outlined text-sm">timer</span>
            {formatTime(timeLeft)}
            </div>

            {/* Close */}
            <button onClick={handleExit} className="size-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95 text-white/80 hover:bg-red-500 hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
            </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
};
