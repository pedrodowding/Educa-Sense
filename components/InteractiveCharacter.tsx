import React, { useState, useRef, useEffect } from 'react';

interface InteractiveCharacterProps {
  imageUrl: string;
}

const InteractiveCharacter: React.FC<InteractiveCharacterProps> = ({ imageUrl }) => {
  // State for interaction
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [translateY, setTranslateY] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const [isJumping, setIsJumping] = useState(false);
  const [touchParticles, setTouchParticles] = useState<{id: number, x: number, y: number}[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Refs for logic
  const containerRef = useRef<HTMLDivElement>(null);
  const pressStartTime = useRef<number>(0);
  const isDragging = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsInteracting(true);
    isDragging.current = true;
    pressStartTime.current = Date.now();
    startPos.current = { x: e.clientX, y: e.clientY };
    
    // Add particle at touch point
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addTouchParticle(x, y);
    }

    // Long press detection for breathing/pulse effect
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    longPressTimeout.current = setTimeout(() => {
        if (isDragging.current) {
            setScale(1.05); // Breathing start
        }
    }, 400);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    if (prefersReducedMotion) return;
    
    e.preventDefault();

    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;

    // Limit rotation
    const rotY = Math.min(Math.max(deltaX * 0.1, -20), 20); // Left/Right
    const rotX = Math.min(Math.max(-deltaY * 0.1, -20), 20); // Up/Down (inverted)

    setRotation({ x: rotX, y: rotY });
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (longPressTimeout.current) clearTimeout(longPressTimeout.current);
    
    const pressDuration = Date.now() - pressStartTime.current;

    if (pressDuration < 400) {
      // Tap detected -> Jump!
      triggerJump();
    } else {
      // Release long press -> Reset scale
      setScale(1);
    }

    // Reset rotation
    setRotation({ x: 0, y: 0 });
    
    // Allow idle animation to resume after a short delay
    setTimeout(() => {
        setIsInteracting(false);
    }, 500);
  };

  const triggerJump = () => {
    if (isJumping || prefersReducedMotion) return;
    setIsJumping(true);
    
    // Jump animation sequence
    setScale(1.08);
    setTranslateY(-12);
    
    setTimeout(() => {
      setTranslateY(0);
      setScale(1);
      setTimeout(() => setIsJumping(false), 300);
    }, 200);
  };

  const addTouchParticle = (x: number, y: number) => {
    if (prefersReducedMotion) return;
    const id = Date.now();
    setTouchParticles(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setTouchParticles(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
        <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotateX(0) rotateY(0); }
          50% { transform: translateY(-10px) rotateX(2deg) rotateY(-2deg); }
        }
        @keyframes pop {
           0% { transform: scale(0); opacity: 1; }
           100% { transform: scale(2); opacity: 0; }
        }
        .animate-float-idle {
          animation: float 5s ease-in-out infinite;
        }
        .touch-particle {
          animation: pop 0.6s ease-out forwards;
        }
      `}</style>

       {/* Instruction Overlay (fades out on interaction) */}
       <div className={`absolute top-4 left-0 right-0 text-center pointer-events-none transition-opacity duration-500 z-0 ${isInteracting ? 'opacity-0' : 'opacity-60'}`}>
          <p className="text-xs font-bold text-purple-400 uppercase tracking-widest bg-white/50 inline-block px-3 py-1 rounded-full backdrop-blur-sm shadow-sm">
            Toque ou arraste ✨
          </p>
       </div>

      {/* Touch Particles */}
      {touchParticles.map((p) => (
        <div 
           key={p.id}
           className="absolute touch-particle text-purple-500 pointer-events-none z-20"
           style={{ left: p.x, top: p.y }}
        >
           <span className="material-symbols-outlined text-2xl">magic_button</span>
        </div>
      ))}

      {/* Character Image */}
      <div 
        className={`relative z-10 filter drop-shadow-xl transition-transform duration-300 ease-out ${!isInteracting && !isJumping && !prefersReducedMotion ? 'animate-float-idle' : ''}`}
        style={{
          transform: isInteracting || isJumping
            ? `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg) scale(${scale}) translateY(${translateY}px)` 
            : undefined
        }}
      >
        <img 
          src={imageUrl} 
          alt="Personagem Interativo" 
          className="w-full h-full max-h-[300px] object-contain rounded-xl pointer-events-none"
          draggable={false}
        />
      </div>
    </div>
  );
};

export default InteractiveCharacter;
