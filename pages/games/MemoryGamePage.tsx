import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameSession } from '../../contexts/GameSessionContext';
import { useGameSound } from '../../hooks/useGameSound';

const COLORS = [
  { id: 'green', color: 'bg-green-500', activeColor: 'bg-green-400', shadow: 'shadow-[0_0_20px_rgba(34,197,94,0.6)]', icon: 'eco', freq: 329.63 }, // E4
  { id: 'red', color: 'bg-red-500', activeColor: 'bg-red-400', shadow: 'shadow-[0_0_20px_rgba(239,68,68,0.6)]', icon: 'local_fire_department', freq: 261.63 }, // C4
  { id: 'yellow', color: 'bg-yellow-400', activeColor: 'bg-yellow-300', shadow: 'shadow-[0_0_20px_rgba(250,204,21,0.6)]', icon: 'lightbulb', freq: 220.00 }, // A3
  { id: 'blue', color: 'bg-blue-500', activeColor: 'bg-blue-400', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]', icon: 'water_drop', freq: 164.81 } // E3
];

const TIMEOUT_MS = 5000; // 5s to make a move

export const MemoryGamePage: React.FC = () => {
  const { status } = useGameSession();
  
  const [sequence, setSequence] = useState<number[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [isPlayingSequence, setIsPlayingSequence] = useState(false);
  const [activeButton, setActiveButton] = useState<number | null>(null);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'gameover'>('idle');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { playTone: playSoundTone, playGameOver: playSoundGameOver } = useGameSound();

  // Sound effects
  const playTone = (index: number) => {
    setActiveButton(index);
    playSoundTone(COLORS[index].freq, 'sine', 0.3);
    setTimeout(() => setActiveButton(null), 300);
  };

  const startNewGame = () => {
    setSequence([]);
    setPlayerSequence([]);
    setScore(0);
    setGameState('playing');
    addToSequence([]);
  };

  const addToSequence = (currentSeq: number[]) => {
    const nextColor = Math.floor(Math.random() * 4);
    const newSeq = [...currentSeq, nextColor];
    setSequence(newSeq);
    setPlayerSequence([]);
    setIsPlayingSequence(true);
    
    // Play sequence
    let i = 0;
    const interval = setInterval(() => {
      if (i >= newSeq.length) {
        clearInterval(interval);
        setIsPlayingSequence(false);
        startTurnTimer();
        return;
      }
      playTone(newSeq[i]);
      i++;
    }, 800);
  };

  const startTurnTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      handleGameOver();
    }, TIMEOUT_MS);
  };

  const handlePadClick = (index: number) => {
    if (status !== 'active' || isPlayingSequence || gameState !== 'playing') return;

    // Reset timer on input
    startTurnTimer();
    
    playTone(index);
    
    const newPlayerSeq = [...playerSequence, index];
    setPlayerSequence(newPlayerSeq);

    // Check correctness
    if (newPlayerSeq[newPlayerSeq.length - 1] !== sequence[newPlayerSeq.length - 1]) {
      handleGameOver();
      return;
    }

    // Check if turn complete
    if (newPlayerSeq.length === sequence.length) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setScore(s => s + 1);
      if (score + 1 > highScore) setHighScore(score + 1);
      setTimeout(() => addToSequence(sequence), 1000);
    }
  };

  const handleGameOver = () => {
    setGameState('gameover');
    playSoundGameOver();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (gameState === 'gameover') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="size-32 bg-red-100 rounded-full flex items-center justify-center text-red-500 mb-8 animate-shake">
           <span className="material-symbols-outlined text-6xl">error</span>
        </div>
        <h2 className="text-3xl font-black text-indigo-900 mb-2">Ops!</h2>
        <p className="text-lg text-indigo-600 font-bold mb-8">
           Você acertou {score} sequências!
        </p>
        <button 
          onClick={startNewGame}
          className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl active:scale-95 transition-all"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      
      {/* HUD */}
      <div className="mb-8 text-center">
         <h2 className="text-4xl font-black text-indigo-900 mb-1">{score}</h2>
         <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Sequência</p>
      </div>

      {/* Game Board */}
      <div className="relative size-72 sm:size-96 rounded-full bg-gray-800 p-4 shadow-2xl border-8 border-gray-700">
         <div className="grid grid-cols-2 grid-rows-2 gap-4 size-full">
            {COLORS.map((btn, idx) => (
              <button
                key={btn.id}
                onClick={() => handlePadClick(idx)}
                className={`rounded-2xl transition-all duration-200 transform active:scale-95 flex items-center justify-center
                  ${activeButton === idx ? `${btn.activeColor} ${btn.shadow} scale-105 z-10 brightness-125` : `${btn.color} opacity-80`}
                  ${gameState !== 'playing' && 'opacity-50 cursor-not-allowed'}
                `}
              >
                 <span className={`material-symbols-outlined text-4xl text-white/50 transition-opacity ${activeButton === idx ? 'opacity-100' : 'opacity-0'}`}>
                    {btn.icon}
                 </span>
              </button>
            ))}
         </div>
         
         {/* Center Start Button */}
         {gameState === 'idle' && (
           <div className="absolute inset-0 flex items-center justify-center">
             <button
               onClick={startNewGame}
               className="size-24 bg-white rounded-full shadow-xl flex items-center justify-center z-20 animate-pulse hover:scale-110 transition-transform"
             >
                <span className="material-symbols-outlined text-4xl text-indigo-600">play_arrow</span>
             </button>
           </div>
         )}
      </div>

      <div className="mt-8 text-center h-8">
         {isPlayingSequence ? (
           <p className="text-indigo-500 font-bold animate-pulse">Observe a sequência...</p>
         ) : gameState === 'playing' ? (
           <p className="text-green-500 font-bold">Sua vez!</p>
         ) : (
            <p className="text-gray-400 font-bold">Toque no play para começar</p>
         )}
      </div>

    </div>
  );
};
