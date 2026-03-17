import React, { useState, useEffect, useCallback } from 'react';
import { useGameSession } from '../../contexts/GameSessionContext';
import { useGameSound } from '../../hooks/useGameSound';

// Game Constants
const COLORS = [
  { id: 'red', color: 'bg-red-500', ring: 'ring-red-500' },
  { id: 'blue', color: 'bg-blue-500', ring: 'ring-blue-500' },
  { id: 'green', color: 'bg-green-500', ring: 'ring-green-500' },
  { id: 'yellow', color: 'bg-yellow-400', ring: 'ring-yellow-400' },
  { id: 'purple', color: 'bg-purple-500', ring: 'ring-purple-500' },
  { id: 'orange', color: 'bg-orange-500', ring: 'ring-orange-500' },
];

const CODE_LENGTH = 4;
const MAX_ATTEMPTS = 8;

interface Attempt {
  guess: string[]; // Array of color IDs
  feedback: {
    exact: number; // Correct color & position (Green Pin)
    partial: number; // Correct color, wrong position (Yellow Pin)
  };
}

export const CofreGamePage: React.FC = () => {
  const { status } = useGameSession();
  const { playClick, playWin, playGameOver, playSuccess } = useGameSound();
  
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [gameState, setGameState] = useState<'playing' | 'won' | 'lost'>('playing');
  const [showSecret, setShowSecret] = useState(false);

  // Initialize Game
  useEffect(() => {
    startNewGame();
  }, []); // Ensures it runs only once on mount

  const startNewGame = () => {
    // Generate random code (allowing repetitions as per requirement)
    const newCode = Array(CODE_LENGTH).fill(null).map(() => 
      COLORS[Math.floor(Math.random() * COLORS.length)].id
    );
    setSecretCode(newCode);
    setAttempts([]);
    setCurrentGuess(Array(CODE_LENGTH).fill(''));
    setGameState('playing');
    setShowSecret(false);
  };

  const handleColorSelect = (colorId: string) => {
    if (gameState !== 'playing') return;
    
    playClick();

    // Find first empty slot
    const firstEmptyIndex = currentGuess.findIndex(c => c === '');
    if (firstEmptyIndex !== -1) {
      const newGuess = [...currentGuess];
      newGuess[firstEmptyIndex] = colorId;
      setCurrentGuess(newGuess);
    }
  };

  const handleClearSlot = (index: number) => {
    if (gameState !== 'playing') return;
    playClick();
    const newGuess = [...currentGuess];
    newGuess[index] = '';
    setCurrentGuess(newGuess);
  };

  const checkGuess = () => {
    if (currentGuess.some(c => c === '')) return; // Incomplete guess

    // Calculate Feedback
    let exact = 0;
    let partial = 0;
    
    const codeCopy = [...secretCode];
    const guessCopy = [...currentGuess];

    // 1. Check Exact Matches
    guessCopy.forEach((color, i) => {
      if (color === codeCopy[i]) {
        exact++;
        codeCopy[i] = 'MATCHED'; // Mark as used
        guessCopy[i] = 'CHECKED';
      }
    });

    // 2. Check Partial Matches
    guessCopy.forEach((color, i) => {
      if (color === 'CHECKED') return;
      
      const matchIndex = codeCopy.indexOf(color);
      if (matchIndex !== -1) {
        partial++;
        codeCopy[matchIndex] = 'MATCHED_PARTIAL';
      }
    });

    const newAttempt: Attempt = {
      guess: [...currentGuess],
      feedback: { exact, partial }
    };

    const newAttempts = [...attempts, newAttempt];
    setAttempts(newAttempts);
    setCurrentGuess(Array(CODE_LENGTH).fill(''));

    // Check Win/Loss
    if (exact === CODE_LENGTH) {
      setGameState('won');
      setShowSecret(true);
      playWin();
    } else if (newAttempts.length >= MAX_ATTEMPTS) {
      setGameState('lost');
      setShowSecret(true);
      playGameOver();
    } else {
      playSuccess(); // Turn complete sound
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Game Board (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-slate-200 p-4 space-y-3 min-h-[500px]">
           
           {/* Secret Code Reveal Area */}
           <div className="flex justify-center gap-3 mb-6 p-4 bg-slate-100 rounded-xl border-dashed border-2 border-slate-300">
             {secretCode.map((colorId, idx) => (
               <div key={idx} className="size-10 rounded-full flex items-center justify-center bg-slate-200 shadow-inner">
                 {showSecret ? (
                   <div className={`size-full rounded-full ${COLORS.find(c => c.id === colorId)?.color} shadow-lg`} />
                 ) : (
                   <span className="material-symbols-outlined text-slate-400">lock</span>
                 )}
               </div>
             ))}
           </div>

           {/* Past Attempts */}
           <div className="flex flex-col-reverse gap-2">
             {attempts.map((attempt, idx) => (
               <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-100 animate-slide-in">
                 <span className="text-xs font-bold text-slate-400 w-6 text-center">{idx + 1}</span>
                 
                 {/* Guess Colors */}
                 <div className="flex gap-2">
                   {attempt.guess.map((cId, i) => (
                     <div key={i} className={`size-8 rounded-full ${COLORS.find(c => c.id === cId)?.color} shadow-sm border-2 border-white`} />
                   ))}
                 </div>

                 {/* Feedback Pins */}
                 <div className="grid grid-cols-2 gap-1 w-10">
                   {Array(attempt.feedback.exact).fill(0).map((_, i) => (
                     <div key={`exact-${i}`} className="size-3 rounded-full bg-green-500 shadow-sm" />
                   ))}
                   {Array(attempt.feedback.partial).fill(0).map((_, i) => (
                     <div key={`partial-${i}`} className="size-3 rounded-full bg-yellow-400 shadow-sm" />
                   ))}
                 </div>
               </div>
             ))}

             {/* Remaining Slots Placeholder */}
             {Array(Math.max(0, MAX_ATTEMPTS - attempts.length - 1)).fill(0).map((_, idx) => (
                <div key={`empty-${idx}`} className="flex items-center justify-between p-2 opacity-30">
                  <span className="text-xs font-bold text-slate-400 w-6 text-center">
                    {MAX_ATTEMPTS - idx}
                  </span>
                  <div className="flex gap-2">
                    {Array(CODE_LENGTH).fill(0).map((_, i) => (
                      <div key={i} className="size-8 rounded-full bg-slate-200" />
                    ))}
                  </div>
                  <div className="w-10" />
                </div>
             ))}
           </div>

           {/* Current Active Row */}
           {gameState === 'playing' && (
             <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl border-2 border-indigo-100 ring-2 ring-indigo-200/50 shadow-lg my-4 sticky bottom-0">
               <span className="text-xs font-bold text-indigo-400 w-6 text-center">{attempts.length + 1}</span>
               
               <div className="flex gap-2">
                 {currentGuess.map((cId, i) => (
                   <button 
                     key={i} 
                     onClick={() => handleClearSlot(i)}
                     className={`size-10 rounded-full border-2 border-white shadow-sm flex items-center justify-center transition-all ${
                       cId ? COLORS.find(c => c.id === cId)?.color : 'bg-white border-dashed border-indigo-200'
                     }`}
                   >
                     {!cId && <span className="size-2 rounded-full bg-indigo-100" />}
                   </button>
                 ))}
               </div>

               <button 
                 onClick={checkGuess}
                 disabled={currentGuess.some(c => c === '')}
                 className="size-10 rounded-full bg-green-500 text-white flex items-center justify-center disabled:bg-gray-300 disabled:text-gray-400 shadow-md active:scale-95 transition-all"
               >
                 <span className="material-symbols-outlined">check</span>
               </button>
             </div>
           )}

        </div>
      </div>

      {/* Controls / Color Palette */}
      <div className="bg-white p-4 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20">
        {gameState === 'playing' ? (
          <div className="flex justify-center gap-3 max-w-md mx-auto">
             {COLORS.map(color => (
               <button
                 key={color.id}
                 onClick={() => handleColorSelect(color.id)}
                 className={`size-12 rounded-full ${color.color} shadow-md active:scale-90 transition-transform border-4 border-white ring-2 ring-gray-100`}
               />
             ))}
          </div>
        ) : (
          <div className="max-w-md mx-auto text-center animate-fade-in">
             <h2 className={`text-2xl font-black mb-2 ${gameState === 'won' ? 'text-green-500' : 'text-red-500'}`}>
               {gameState === 'won' ? 'Senha Descoberta! 🎉' : 'Não foi dessa vez...'}
             </h2>
             <button 
               onClick={startNewGame}
               className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl active:scale-95"
             >
               Jogar Novamente
             </button>
          </div>
        )}
      </div>

    </div>
  );
};
