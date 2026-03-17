import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useGameSession } from '../../contexts/GameSessionContext';
import { useGameSound } from '../../hooks/useGameSound';

// Types
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type CellType = 'empty' | 'wall' | 'start' | 'goal';

interface Position {
  x: number;
  y: number;
}

interface GameState {
  grid: CellType[][];
  robotPos: Position;
  goalPos: Position;
  startPos: Position;
}

const GRID_SIZE = 5;
const MAX_COMMANDS = 20;

export const RobotGamePage: React.FC = () => {
  const { status } = useGameSession();
  const { playClick, playTone, playError, playWin } = useGameSound();
  
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [commands, setCommands] = useState<Direction[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [gameStatus, setGameStatus] = useState<'planning' | 'running' | 'won' | 'lost'>('planning');
  
  // Visual robot position (can be different from grid logic during animation)
  const [visualRobotPos, setVisualRobotPos] = useState<Position>({ x: 0, y: 0 });
  const [robotRotation, setRobotRotation] = useState(0);

  const generateLevel = useCallback((currentLevel: number) => {
    // Basic BFS to check path existence
    const hasPath = (grid: CellType[][], start: Position, goal: Position): boolean => {
      const queue: Position[] = [start];
      const visited = new Set<string>();
      visited.add(`${start.x},${start.y}`);
      
      const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
      
      while (queue.length > 0) {
        const curr = queue.shift()!;
        if (curr.x === goal.x && curr.y === goal.y) return true;
        
        for (const [dx, dy] of dirs) {
          const nx = curr.x + dx;
          const ny = curr.y + dy;
          
          if (
            nx >= 0 && nx < GRID_SIZE && 
            ny >= 0 && ny < GRID_SIZE && 
            grid[ny][nx] !== 'wall' &&
            !visited.has(`${nx},${ny}`)
          ) {
            visited.add(`${nx},${ny}`);
            queue.push({ x: nx, y: ny });
          }
        }
      }
      return false;
    };

    let isValid = false;
    let newGrid: CellType[][] = [];
    let start: Position = { x: 0, y: 0 };
    let goal: Position = { x: 4, y: 4 };

    // Try to generate a valid level
    while (!isValid) {
      // 1. Initialize empty grid
      newGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill('empty'));
      
      // 2. Place Start (Edges usually better)
      start = { x: 0, y: 0 }; // Fixed start for simplicity or random
      
      // 3. Place Goal (Far from start)
      do {
        goal = {
          x: Math.floor(Math.random() * GRID_SIZE),
          y: Math.floor(Math.random() * GRID_SIZE)
        };
      } while (Math.abs(goal.x - start.x) + Math.abs(goal.y - start.y) < 3);

      // 4. Place Obstacles based on level
      const obstacleCount = Math.min(3 + Math.floor(currentLevel / 2), 10);
      let placed = 0;
      while (placed < obstacleCount) {
        const x = Math.floor(Math.random() * GRID_SIZE);
        const y = Math.floor(Math.random() * GRID_SIZE);
        
        if ((x !== start.x || y !== start.y) && (x !== goal.x || y !== goal.y) && newGrid[y][x] !== 'wall') {
          newGrid[y][x] = 'wall';
          placed++;
        }
      }

      // 5. Verify Path
      if (hasPath(newGrid, start, goal)) {
        isValid = true;
      }
    }

    setGameState({
      grid: newGrid,
      robotPos: start,
      startPos: start,
      goalPos: goal
    });
    setVisualRobotPos(start);
    setRobotRotation(0);
    setCommands([]);
    setGameStatus('planning');
    setCurrentStep(0);
    setIsRunning(false);
  }, []);

  // Initial Level Load
  useEffect(() => {
    generateLevel(level);
  }, [level, generateLevel]);

  const addCommand = (cmd: Direction) => {
    if (gameStatus !== 'planning' || commands.length >= MAX_COMMANDS) return;
    playClick();
    setCommands(prev => [...prev, cmd]);
  };

  const removeLastCommand = () => {
    if (gameStatus !== 'planning') return;
    playClick();
    setCommands(prev => prev.slice(0, -1));
  };

  const clearCommands = () => {
    if (gameStatus !== 'planning') return;
    playClick();
    setCommands([]);
  };

  const runCommands = async () => {
    if (gameStatus !== 'planning' || commands.length === 0 || !gameState) return;
    
    setGameStatus('running');
    setIsRunning(true);
    setCurrentStep(0);

    let currentPos = { ...gameState.startPos };
    let failed = false;

    // Execute steps with delay
    for (let i = 0; i < commands.length; i++) {
      setCurrentStep(i);
      const cmd = commands[i];
      playTone(440, 'square', 0.05, 0.05); // Step sound
      
      // Rotate Robot Visual
      switch(cmd) {
        case 'UP': setRobotRotation(270); break;
        case 'DOWN': setRobotRotation(90); break;
        case 'LEFT': setRobotRotation(180); break;
        case 'RIGHT': setRobotRotation(0); break;
      }

      // Calculate next pos
      let nextPos = { ...currentPos };
      if (cmd === 'UP') nextPos.y -= 1;
      if (cmd === 'DOWN') nextPos.y += 1;
      if (cmd === 'LEFT') nextPos.x -= 1;
      if (cmd === 'RIGHT') nextPos.x += 1;

      // Check bounds
      if (
        nextPos.x < 0 || nextPos.x >= GRID_SIZE ||
        nextPos.y < 0 || nextPos.y >= GRID_SIZE
      ) {
        failed = true;
      } else if (gameState.grid[nextPos.y][nextPos.x] === 'wall') {
        failed = true;
      }

      // Wait for animation
      await new Promise(r => setTimeout(r, 500));

      if (failed) {
        // Bump animation or shake could go here
        playError();
        setGameStatus('lost');
        setIsRunning(false);
        return;
      }

      // Update Position
      currentPos = nextPos;
      setVisualRobotPos(currentPos);
      
      // Check Win
      if (currentPos.x === gameState.goalPos.x && currentPos.y === gameState.goalPos.y) {
        await new Promise(r => setTimeout(r, 300));
        playWin();
        setGameStatus('won');
        setIsRunning(false);
        return;
      }
    }

    // If commands finished but goal not reached
    setGameStatus('lost');
    setIsRunning(false);
  };

  const handleNextLevel = () => {
    setLevel(l => l + 1);
  };

  const handleRetry = () => {
    if (!gameState) return;
    setVisualRobotPos(gameState.startPos);
    setGameStatus('planning');
    setCurrentStep(0);
    setIsRunning(false);
    // Keep commands? Maybe clear them is better for retry logic usually, but children might want to fix just one.
    // Let's keep them so they can debug.
  };

  if (!gameState) return <div className="p-8 text-center">Carregando...</div>;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-0">
        
        {/* Header Info */}
        <div className="flex justify-between w-full max-w-md mb-4 px-2">
           <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
             <span className="text-xs font-bold text-slate-400 uppercase block">Nível</span>
             <span className="text-xl font-black text-indigo-600">{level}</span>
           </div>
           <div className="bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-200">
             <span className="text-xs font-bold text-slate-400 uppercase block">Comandos</span>
             <span className={`text-xl font-black ${commands.length >= MAX_COMMANDS ? 'text-red-500' : 'text-indigo-600'}`}>
               {commands.length}/{MAX_COMMANDS}
             </span>
           </div>
        </div>

        {/* Grid */}
        <div 
          className="relative bg-white p-2 rounded-xl shadow-lg border-4 border-slate-200"
          style={{ 
            width: 'min(90vw, 350px)', 
            height: 'min(90vw, 350px)',
            display: 'grid',
            gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
            gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`,
            gap: '4px'
          }}
        >
           {/* Cells */}
           {gameState.grid.map((row, y) => (
             row.map((cell, x) => (
               <div 
                 key={`${x}-${y}`} 
                 className={`
                   rounded-lg flex items-center justify-center relative
                   ${cell === 'wall' ? 'bg-slate-700 shadow-inner' : 'bg-slate-100'}
                   ${gameState.goalPos.x === x && gameState.goalPos.y === y ? 'bg-yellow-100 ring-2 ring-yellow-400' : ''}
                   ${gameState.startPos.x === x && gameState.startPos.y === y ? 'ring-2 ring-indigo-100' : ''}
                 `}
               >
                 {/* Goal Icon */}
                 {gameState.goalPos.x === x && gameState.goalPos.y === y && (
                   <span className="material-symbols-outlined text-yellow-500 text-3xl animate-bounce">star</span>
                 )}
                 {/* Wall Icon */}
                 {cell === 'wall' && (
                   <span className="material-symbols-outlined text-slate-500/50 text-2xl">grid_view</span>
                 )}
               </div>
             ))
           ))}

           {/* Robot Overlay */}
           <div 
             className="absolute transition-all duration-500 ease-in-out flex items-center justify-center z-10"
             style={{
               width: `calc((100% - ${(GRID_SIZE-1)*4}px) / ${GRID_SIZE})`,
               height: `calc((100% - ${(GRID_SIZE-1)*4}px) / ${GRID_SIZE})`,
               left: `calc(${visualRobotPos.x} * ((100% - ${(GRID_SIZE-1)*4}px) / ${GRID_SIZE}) + ${visualRobotPos.x * 4}px + 8px)`,
               top: `calc(${visualRobotPos.y} * ((100% - ${(GRID_SIZE-1)*4}px) / ${GRID_SIZE}) + ${visualRobotPos.y * 4}px + 8px)`,
               transform: `rotate(${robotRotation}deg)`
             }}
           >
              <div className="size-10 bg-indigo-600 rounded-xl shadow-lg flex items-center justify-center text-white">
                 <span className="material-symbols-outlined">smart_toy</span>
              </div>
           </div>
        </div>

        {/* Command Queue Preview */}
        <div className="w-full max-w-md mt-4 h-12 bg-white rounded-xl shadow-inner overflow-x-auto flex items-center px-2 gap-1 border border-slate-200">
           {commands.length === 0 && (
             <span className="text-slate-400 text-sm italic mx-auto">Adicione comandos para mover o robô...</span>
           )}
           {commands.map((cmd, idx) => (
             <div 
                key={idx} 
                className={`
                  min-w-[32px] h-8 rounded-lg flex items-center justify-center text-white shrink-0
                  ${idx === currentStep && isRunning ? 'bg-orange-500 scale-110 shadow-lg' : 'bg-indigo-400'}
                `}
             >
                <span className="material-symbols-outlined text-sm">
                  {cmd === 'UP' && 'arrow_upward'}
                  {cmd === 'DOWN' && 'arrow_downward'}
                  {cmd === 'LEFT' && 'arrow_back'}
                  {cmd === 'RIGHT' && 'arrow_forward'}
                </span>
             </div>
           ))}
        </div>

      </div>

      {/* Controls Area - Sticky Bottom */}
      <div className="bg-white p-4 pb-8 rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20">
        
        {gameStatus === 'planning' ? (
          <div className="flex flex-col gap-4 max-w-md mx-auto">
            {/* D-Pad & Actions */}
            <div className="flex items-center justify-between gap-4">
              
              {/* D-Pad Grid */}
              <div className="grid grid-cols-3 gap-2">
                 <div />
                 <button onClick={() => addCommand('UP')} className="size-14 bg-indigo-100 rounded-xl text-indigo-600 active:bg-indigo-200 flex items-center justify-center shadow-sm active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">arrow_upward</span>
                 </button>
                 <div />
                 
                 <button onClick={() => addCommand('LEFT')} className="size-14 bg-indigo-100 rounded-xl text-indigo-600 active:bg-indigo-200 flex items-center justify-center shadow-sm active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">arrow_back</span>
                 </button>
                 <button onClick={() => addCommand('DOWN')} className="size-14 bg-indigo-100 rounded-xl text-indigo-600 active:bg-indigo-200 flex items-center justify-center shadow-sm active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">arrow_downward</span>
                 </button>
                 <button onClick={() => addCommand('RIGHT')} className="size-14 bg-indigo-100 rounded-xl text-indigo-600 active:bg-indigo-200 flex items-center justify-center shadow-sm active:scale-95 transition-all">
                    <span className="material-symbols-outlined text-3xl">arrow_forward</span>
                 </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 flex-1">
                 <button 
                   onClick={runCommands}
                   disabled={commands.length === 0}
                   className="w-full h-14 bg-green-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-green-500/30 active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                 >
                    <span className="material-symbols-outlined">play_circle</span>
                    EXECUTAR
                 </button>
                 
                 <div className="flex gap-2">
                   <button onClick={removeLastCommand} className="flex-1 h-12 bg-gray-100 text-gray-600 rounded-xl font-bold active:scale-95 flex items-center justify-center">
                      <span className="material-symbols-outlined">backspace</span>
                   </button>
                   <button onClick={clearCommands} className="flex-1 h-12 bg-red-100 text-red-500 rounded-xl font-bold active:scale-95 flex items-center justify-center">
                      <span className="material-symbols-outlined">delete</span>
                   </button>
                 </div>
              </div>

            </div>
          </div>
        ) : (
          /* Result States */
          <div className="max-w-md mx-auto text-center py-4">
             {gameStatus === 'running' && (
               <div className="flex flex-col items-center gap-2">
                 <div className="size-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                 <p className="font-bold text-indigo-900">Robô em movimento...</p>
               </div>
             )}

             {gameStatus === 'won' && (
               <div className="animate-fade-in">
                 <h2 className="text-2xl font-black text-green-600 mb-4 flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-3xl">emoji_events</span>
                   Nível Completado!
                 </h2>
                 <button 
                   onClick={handleNextLevel}
                   className="w-full py-4 bg-green-500 text-white rounded-2xl font-black text-xl shadow-xl active:scale-95"
                 >
                   Próximo Nível
                 </button>
               </div>
             )}

             {gameStatus === 'lost' && (
               <div className="animate-fade-in">
                 <h2 className="text-2xl font-black text-red-500 mb-4 flex items-center justify-center gap-2">
                   <span className="material-symbols-outlined text-3xl">cancel</span>
                   Algo deu errado!
                 </h2>
                 <p className="text-gray-500 mb-6 text-sm">O robô bateu ou não chegou ao destino.</p>
                 <div className="flex gap-3">
                   <button 
                     onClick={handleRetry}
                     className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black active:scale-95"
                   >
                     Tentar Novamente
                   </button>
                   <button 
                     onClick={clearCommands}
                     className="px-4 py-3 bg-red-100 text-red-500 rounded-xl font-black active:scale-95"
                   >
                     Limpar
                   </button>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

    </div>
  );
};
