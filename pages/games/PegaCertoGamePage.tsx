import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useGameSession } from '../../contexts/GameSessionContext';
import { useGameSound } from '../../hooks/useGameSound';

// Game constants
const GAME_SPEED_BASE = 2; // Pixels per frame
const SPAWN_RATE_BASE = 1000; // ms
// const GRAVITY = 0.05; // Removed unused

interface GameItem {
  id: number;
  x: number;
  y: number;
  type: ItemType;
  speed: number;
  rotation: number;
  scale: number;
}

interface ItemType {
  id: string;
  icon: string;
  color: string;
  isTarget: boolean; // Relative to current mission
}

const ITEM_TYPES = [
  { id: 'star', icon: 'star', color: 'text-yellow-400' },
  { id: 'heart', icon: 'favorite', color: 'text-red-500' },
  { id: 'bolt', icon: 'bolt', color: 'text-blue-400' },
  { id: 'diamond', icon: 'diamond', color: 'text-cyan-300' },
  { id: 'cookie', icon: 'cookie', color: 'text-orange-400' },
  { id: 'apple', icon: 'nutrition', color: 'text-red-600' },
];

const MISSIONS = [
  { targetId: 'star', count: 5, description: 'Colete 5 Estrelas!' },
  { targetId: 'heart', count: 5, description: 'Colete 5 Corações!' },
  { targetId: 'bolt', count: 7, description: 'Colete 7 Raios!' },
  { targetId: 'diamond', count: 8, description: 'Colete 8 Diamantes!' },
];

export const PegaCertoGamePage: React.FC = () => {
  const { status } = useGameSession();
  const { playTone, playError, playWin } = useGameSound();
  const [items, setItems] = useState<GameItem[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [feedback, setFeedback] = useState<{ x: number; y: number; text: string; color: string } | null>(null);
  
  // Refs for game loop to avoid dependency cycles
  const requestRef = useRef<number | undefined>(undefined);
  const lastSpawnTime = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<GameItem[]>([]);
  const scoreRef = useRef(0);
  const levelRef = useRef(0);
  
  // Initialize refs - Only update level ref from state, items/score are managed by loop -> state
  useEffect(() => {
    // itemsRef.current = items; // REMOVED: Causes race condition resetting loop state
    // scoreRef.current = score; // REMOVED
    levelRef.current = level;
  }, [level]);

  // Initial Sync (Mount only)
  useEffect(() => {
     console.log('[PegaCerto] Game Mounted');
     itemsRef.current = [];
     scoreRef.current = 0;
  }, []);

  const currentMission = MISSIONS[level % MISSIONS.length];

  const spawnItem = useCallback(() => {
    // If container not ready, try fallback width
    const width = containerRef.current?.clientWidth || window.innerWidth;
    
    // Ensure we don't spawn too close to edges
    const isMobile = width < 640;
    const padding = isMobile ? 40 : 60;
    const x = Math.random() * (width - padding * 2) + padding; 
    
    // Spawn Y position: Start below HUD on mobile
    // HUD takes roughly 120-140px on mobile
    const startY = isMobile ? -140 : -50;
    
    // Determine type: 40% chance of being the target
    const isTargetSpawn = Math.random() < 0.4;
    let typeDef: typeof ITEM_TYPES[0];
    
    if (isTargetSpawn) {
      typeDef = ITEM_TYPES.find(t => t.id === currentMission.targetId)!;
    } else {
      const distractors = ITEM_TYPES.filter(t => t.id !== currentMission.targetId);
      typeDef = distractors[Math.floor(Math.random() * distractors.length)];
    }

    const scaleBase = isMobile ? 0.7 : 0.8;
    const scaleVar = isMobile ? 0.3 : 0.4;

    const newItem: GameItem = {
      id: Date.now() + Math.random(),
      x,
      y: startY,
      type: { ...typeDef, isTarget: typeDef.id === currentMission.targetId },
      speed: (GAME_SPEED_BASE + (level * 0.5) + (Math.random() * 2)) * (isMobile ? 0.8 : 1), // Slower on mobile
      rotation: Math.random() * 360,
      scale: scaleBase + Math.random() * scaleVar
    };

    console.log('[PegaCerto] Spawning item', newItem);
    itemsRef.current = [...itemsRef.current, newItem];
    // setItems handled in updateGame loop
  }, [currentMission, level]);

  const updateGame = useCallback((time: number) => {
    if (status !== 'active' || gameOver) {
       // Se pausado ou game over, apenas mantém o loop rodando sem atualizar lógica (ou para)
       // Se quiser parar totalmente, não chame requestAnimationFrame aqui.
       // Mas para garantir reinicio suave, vamos parar se gameOver.
       if (!gameOver && status === 'active') requestRef.current = requestAnimationFrame(updateGame);
       return;
    }

    // First run init
    if (lastSpawnTime.current === 0) lastSpawnTime.current = time;

    // Spawn logic
    if (time - lastSpawnTime.current > Math.max(400, SPAWN_RATE_BASE - (level * 100))) {
      spawnItem();
      lastSpawnTime.current = time;
    }

    // Move items
    const height = containerRef.current?.clientHeight || window.innerHeight;
    
    // Update REF directly
    itemsRef.current = itemsRef.current
      .map(item => ({
        ...item,
        y: item.y + item.speed,
        rotation: item.rotation + 1
      }))
      .filter(item => item.y < height + 50); // Remove items that fell off

    // IMPORTANT: Force re-render without full state dependency cycle if possible
    // But since we render from 'items' state, we MUST update it.
    // The previous fix removed the dependency cycle, but the setState triggers re-render
    // which triggers useEffect re-attach.
    // Let's use a functional update to avoid dependency on 'items' state in the callback if possible,
    // but here we are using ref as source of truth.
    setItems([...itemsRef.current]);

    requestRef.current = requestAnimationFrame(updateGame);
  }, [status, gameOver, level, spawnItem]);

  // Start/Stop Loop
  useEffect(() => {
    let animationFrameId: number;

    const loop = (time: number) => {
       updateGame(time);
       // The updateGame function handles the next frame request internally via requestRef,
       // but we need to ensure the loop continues if updateGame changes.
       // Actually, the previous implementation had a flaw: requestAnimationFrame calls updateGame,
       // which calls requestAnimationFrame with updateGame.
       // If updateGame is recreated (due to deps change), the old closure finishes and the new one starts via useEffect.
       // However, the `requestRef.current = requestAnimationFrame(updateGame)` inside updateGame uses the *current closure's* updateGame.
       // This is fine as long as the loop isn't broken.
    };

    if (status === 'active') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [status, updateGame]);

  const handleItemClick = (item: GameItem) => {
    // Permite clique mesmo se game over for false, desde que status seja active
    // O game over é só visual entre níveis
    if (status !== 'active') return;

    // Remove item
    itemsRef.current = itemsRef.current.filter(i => i.id !== item.id);
    setItems(itemsRef.current);

    if (item.type.isTarget) {
      // Success
      playTone(880, 'sine', 0.1); // High ping
      const newScore = score + 1;
      setScore(newScore);
      showFeedback(item.x, item.y, '+1', 'text-green-500');

      // Check Mission Complete
      if (newScore >= currentMission.count) {
        handleLevelComplete();
      }
    } else {
      // Mistake
      playError();
      showFeedback(item.x, item.y, 'Ops!', 'text-red-500');
      // Optional: Penalty logic
    }
  };

  const showFeedback = (x: number, y: number, text: string, color: string) => {
    setFeedback({ x, y, text, color });
    setTimeout(() => setFeedback(null), 800);
  };

  const handleLevelComplete = () => {
    setGameOver(true);
    playWin();
    // Brief pause before next level
    setTimeout(() => {
      setLevel(l => l + 1);
      setScore(0);
      setItems([]);
      itemsRef.current = [];
      setGameOver(false);
    }, 2000);
  };

  return (
    <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-sky-200 to-indigo-200 overflow-hidden" ref={containerRef}>
      
      {/* HUD Top: Mission & Level */}
      <div className="absolute top-0 left-0 right-0 p-3 pointer-events-none z-20 flex justify-center">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl px-4 py-2 shadow-xl border-2 border-indigo-100 animate-slide-down flex items-center gap-3">
           
           {/* Mission Target */}
           <div className={`size-8 rounded-full bg-indigo-100 flex-shrink-0 flex items-center justify-center ${ITEM_TYPES.find(t => t.id === currentMission.targetId)?.color}`}>
              <span className="material-symbols-outlined text-xl">
                {ITEM_TYPES.find(t => t.id === currentMission.targetId)?.icon}
              </span>
           </div>

           {/* Info */}
           <div className="flex items-center gap-3">
               <p className="font-black text-indigo-900 text-sm">
                 {currentMission.description}
               </p>
               <div className="h-4 w-[1px] bg-indigo-200"></div>
               <span className="text-xs font-bold text-indigo-500 whitespace-nowrap">Nível {level + 1}</span>
           </div>
        </div>
      </div>

      {/* HUD Bottom: Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none z-20 flex justify-center bg-gradient-to-t from-indigo-900/20 to-transparent">
         <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border-2 border-indigo-100 w-full max-w-md flex items-center gap-3 animate-slide-up">
            <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-green-500 transition-all duration-300 rounded-full flex items-center justify-end pr-2"
                style={{ width: `${(score / currentMission.count) * 100}%` }}
              >
                 {score > 0 && <div className="h-full w-1 bg-white/30 rounded-full animate-pulse"></div>}
              </div>
            </div>
            <span className="text-sm font-black text-indigo-600 w-12 text-center bg-indigo-50 rounded-lg py-1">
               {score}/{currentMission.count}
            </span>
         </div>
      </div>

      {/* Level Complete Overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50 animate-fade-in">
           <div className="bg-white rounded-3xl p-8 text-center shadow-2xl animate-bounce-in max-w-sm mx-4">
             <span className="text-6xl mb-4 block">🎉</span>
             <h2 className="text-3xl font-black text-indigo-900 mb-2">Muito Bem!</h2>
             <p className="text-indigo-600 font-bold mb-6">Você completou a missão!</p>
             <div className="animate-pulse text-sm font-bold text-gray-400 uppercase tracking-widest">
               Próximo Nível em instantes...
             </div>
           </div>
        </div>
      )}

      {/* Game Items */}
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => handleItemClick(item)}
          className={`absolute transform active:scale-90 transition-transform cursor-pointer touch-manipulation outline-none focus:outline-none z-10`}
          style={{
            left: 0,
            top: 0,
            transform: `translate(${item.x}px, ${item.y}px) rotate(${item.rotation}deg) scale(${item.scale})`
          }}
        >
          <div className={`size-16 rounded-full bg-white shadow-lg flex items-center justify-center border-4 border-white ${item.type.color}`}>
             <span className="material-symbols-outlined text-4xl select-none pointer-events-none">
               {item.type.icon}
             </span>
          </div>
        </button>
      ))}

      {/* Feedback Popup */}
      {feedback && (
        <div 
          className={`absolute font-black text-2xl ${feedback.color} animate-float-up pointer-events-none z-20`}
          style={{ left: feedback.x, top: feedback.y - 40 }}
        >
          {feedback.text}
        </div>
      )}
      
      {/* Instructions Overlay (Only at start of level 0) */}
      {level === 0 && score === 0 && items.length < 1 && (
         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-white/80 font-black text-2xl bg-black/20 px-6 py-2 rounded-full backdrop-blur">
              Toque nos itens da missão!
            </p>
         </div>
      )}

    </div>
  );
};
