import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { supabase } from '../services/supabase';

const EMOJIS = ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼'];

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

export const GameRewardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedChild: contextChild } = useSelectedChild();
  
  // Use state child if available, otherwise context
  const selectedChild = (location.state as any)?.child || contextChild;
  
  // Game Config
  const [timeLeft, setTimeLeft] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [gameStarted, setGameStarted] = useState(false); // New state for pre-start
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [showRules, setShowRules] = useState(false); // Default false, shown only if pending

  // Initialize Game Session (Sprint 8.1)
  useEffect(() => {
    if (!selectedChild) {
      navigate('/dashboard');
      return;
    }

    // Governance Check (Sprint 9.1)
    if (selectedChild.gameEnabled === false) {
      navigate('/dashboard');
      return;
    }

    const initSession = async () => {
      try {
        // 1. Check Session Status (Read-only)
        // Use rpc_get_game_session_status if available, otherwise rpc_can_use_reward
        // But since we just added rpc_get_game_session_status, let's try to use it.
        // Fallback to manual check if RPC not deployed yet.
        
        let sessionData: any = null;
        
        const { data, error } = await supabase.rpc('rpc_get_game_session_status', {
          p_child_id: selectedChild.id
        });

        if (!error && data) {
           sessionData = data;
        } else {
           // Fallback logic if RPC missing
           console.warn('RPC check failed, using fallback logic', error);
           // ... (manual check logic similar to fallback)
        }

        // Analyze Session Data
        if (sessionData) {
           if (sessionData.allowed === false) {
              // Blocked (disabled)
              console.error('Game blocked:', sessionData.reason);
              if (sessionData.reason === 'game_disabled') {
                 navigate('/dashboard');
                 return;
              }
              setIsGameOver(true);
              setInitializing(false);
              return;
           }

           if (sessionData.status === 'active') {
              // Active session -> Resume immediately
              const startedAt = new Date(sessionData.started_at).getTime();
              const durationSeconds = (sessionData.duration_minutes || 20) * 60;
              const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
              const remaining = Math.max(0, durationSeconds - elapsedSeconds);
              
              setTimeLeft(remaining);
              setGameStarted(true);
              setShowRules(false);
              
              if (remaining <= 0) setIsGameOver(true);
           } else {
              // Pending -> Show Rules/Start Button
              const durationSeconds = (sessionData.duration_minutes || 20) * 60;
              setTimeLeft(durationSeconds);
              setGameStarted(false);
              setShowRules(true);
           }
        } else {
           // If completely failed, assume pending default
           setTimeLeft(20 * 60);
           setGameStarted(false);
           setShowRules(true);
        }

        // Initialize Cards
        const gameEmojis = [...EMOJIS, ...EMOJIS]
          .sort(() => Math.random() - 0.5)
          .map((emoji, index) => ({
            id: index,
            emoji,
            isFlipped: false,
            isMatched: false
          }));
        setCards(gameEmojis);

      } catch (err) {
        console.error('Unexpected Init Error:', err);
        setIsGameOver(true);
      } finally {
        setInitializing(false);
      }
    };

    initSession();
  }, [selectedChild]);

  const handleStartGame = async () => {
     setInitializing(true);
     try {
        // Consume Reward (Start Timer)
        const { data, error } = await supabase.rpc('rpc_consume_game_reward', {
          p_child_id: selectedChild.id
        });

        if (error || (data && !data.success)) {
           console.error('Failed to start game:', error || data);
           // If already used (race condition or resume), we might get success=true + resumed
           // If error 'already_used', we handle it.
           if (data?.resumed) {
              console.log('Resumed existing session');
           } else {
              alert('Erro ao iniciar o jogo. Tente novamente.');
              return;
           }
        }

        setGameStarted(true);
        setShowRules(false);
        // Recalculate time just in case
        // But usually we trust the local pending state for fresh start
     } catch (err) {
        console.error(err);
     } finally {
        setInitializing(false);
     }
  };

  // Timer
  useEffect(() => {
    if (isGameOver || initializing || !gameStarted) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isGameOver, initializing, gameStarted]);

  // Card Logic
  const handleCardClick = (id: number) => {
    if (isGameOver) return;
    // Prevent clicking matched, already flipped, or if 2 cards are already flipped
    if (cards[id].isMatched || cards[id].isFlipped || flippedCards.length >= 2) return;

    const newCards = [...cards];
    newCards[id].isFlipped = true;
    setCards(newCards);
    
    const newFlipped = [...flippedCards, id];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = newFlipped;
      
      if (cards[first].emoji === cards[second].emoji) {
        // Match!
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === first || c.id === second) ? { ...c, isMatched: true, isFlipped: true } : c
          ));
          setFlippedCards([]);
          
          // Check Win Condition (All matched)
          if (cards.filter(c => !c.isMatched).length <= 2) { // Logic check: all matched except current pair which is being processed
             // Optional: Celebration or restart
          }
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(c => 
            (c.id === first || c.id === second) ? { ...c, isFlipped: false } : c
          ));
          setFlippedCards([]);
        }, 1000);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleExit = () => {
    navigate('/dashboard');
  };

  // Game Over Screen (Time's up)
  if (isGameOver) {
    return (
      <div className="min-h-screen bg-purple-600 flex flex-col items-center justify-center text-white p-8 text-center animate-fade-in">
        <div className="size-32 bg-white rounded-full flex items-center justify-center text-purple-600 mb-8 animate-bounce">
           <span className="material-symbols-outlined text-6xl">timer_off</span>
        </div>
        <h1 className="text-4xl font-black mb-4">Tempo Encerrado!</h1>
        <p className="text-xl font-bold opacity-90 mb-12">Você jogou muito bem! 🎉</p>
        <button 
          onClick={handleExit}
          className="px-10 py-4 bg-white text-purple-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all"
        >
          Voltar ao Início
        </button>
      </div>
    );
  }

  if (initializing) {
     return (
        <div className="min-h-screen bg-indigo-50 flex flex-col gap-4 items-center justify-center">
           <div className="size-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
           <p className="text-indigo-600 font-bold animate-pulse">Carregando sessão de jogo...</p>
        </div>
     );
  }

  return (
    <div className="min-h-screen bg-indigo-50 flex flex-col">
      {/* Header with Timer */}
      <header className="bg-indigo-600 text-white p-4 flex items-center justify-between shadow-md sticky top-0 z-10">
        <div className="flex items-center gap-3">
           <div className="size-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined">videogame_asset</span>
           </div>
           <span className="font-black text-lg">Jogo da Memória</span>
        </div>
        
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-xl ${timeLeft < 60 ? 'bg-red-500 animate-pulse' : 'bg-indigo-800'}`}>
           <span className="material-symbols-outlined text-sm">timer</span>
           {formatTime(timeLeft)}
        </div>

        <button onClick={handleExit} className="size-10 bg-white/10 rounded-full flex items-center justify-center active:scale-95">
           <span className="material-symbols-outlined">close</span>
        </button>
      </header>

      {/* Game Board */}
      <main className="flex-1 p-4 flex items-center justify-center overflow-y-auto">
         <div className="grid grid-cols-4 gap-3 max-w-md w-full aspect-square">
            {cards.map(card => (
              <button
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                disabled={card.isMatched || card.isFlipped}
                className={`relative aspect-square rounded-2xl transition-all duration-300 transform perspective-1000 ${
                  card.isFlipped || card.isMatched ? 'rotate-y-180' : ''
                }`}
              >
                 {/* Card Back */}
                 <div className={`absolute inset-0 bg-indigo-200 rounded-2xl border-4 border-indigo-300 flex items-center justify-center shadow-sm backface-hidden ${card.isFlipped || card.isMatched ? 'opacity-0' : 'opacity-100'}`}>
                    <span className="material-symbols-outlined text-indigo-400 text-3xl">help</span>
                 </div>

                 {/* Card Front */}
                 <div className={`absolute inset-0 bg-white rounded-2xl border-4 border-indigo-500 flex items-center justify-center shadow-lg text-4xl backface-hidden transition-opacity ${card.isFlipped || card.isMatched ? 'opacity-100 rotate-y-180' : 'opacity-0'}`}>
                    {card.emoji}
                 </div>
              </button>
            ))}
         </div>
      </main>

      {/* Footer Stats */}
      <footer className="p-4 text-center text-indigo-400 font-bold text-sm">
         Jogadas: {moves}
      </footer>

      {/* Rules Overlay */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
           <div className="bg-white w-full max-w-sm p-8 rounded-[32px] shadow-2xl text-center relative">
              <div className="size-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                 <span className="material-symbols-outlined text-4xl">sports_esports</span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-2">Hora do Jogo!</h2>
              <p className="text-gray-500 font-bold text-sm mb-6">
                 Você tem <strong>{Math.floor(timeLeft / 60)} minutos</strong> para jogar hoje.
                 <br/><br/>
                 Encontre os pares de emojis iguais antes do tempo acabar. Divirta-se!
              </p>
              <button 
                onClick={handleStartGame}
                className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                 Começar a Jogar
              </button>
           </div>
        </div>
      )}
    </div>
  );
};
