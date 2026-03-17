import React from 'react';
import InteractivePartsAnimator from './InteractivePartsAnimator';

interface AnimatedResultImageProps {
  imageUrl: string;
  onClose: () => void;
}

const AnimatedResultImage: React.FC<AnimatedResultImageProps> = ({ imageUrl, onClose }) => {
  // Generate random background sparkles
  const sparkles = Array.from({ length: 12 }).map((_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    scale: 0.5 + Math.random() * 0.5
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in p-4 touch-none">
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        .sparkle {
          animation: sparkle 2s ease-in-out infinite;
        }
      `}</style>

      <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[80vh] max-h-[600px]">
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-white z-20 shrink-0">
          <h3 className="font-black text-purple-600 text-lg flex items-center gap-2">
            <span className="material-symbols-outlined">auto_awesome</span>
            Brinque com seu personagem
          </h3>
          <button 
            onClick={onClose}
            className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Interactive Container */}
        <div className="relative flex-1 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden flex items-center justify-center p-4">
          {/* Background Sparkles */}
          {sparkles.map((s) => (
            <div
              key={s.id}
              className="absolute sparkle text-yellow-400 pointer-events-none"
              style={{
                left: s.left,
                top: s.top,
                animationDelay: s.delay,
                transform: `scale(${s.scale})`
              }}
            >
              <span className="material-symbols-outlined text-xl">star</span>
            </div>
          ))}

          {/* Interactive Parts Animator Component */}
          <InteractivePartsAnimator imageUrl={imageUrl} />
        </div>

        {/* Actions */}
        <div className="p-6 bg-white space-y-3 z-20 shrink-0">
           <button 
             onClick={onClose} 
             className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
           >
             <span className="material-symbols-outlined">check</span>
             Ficou Lindo!
           </button>
        </div>
      </div>
    </div>
  );
};

export default AnimatedResultImage;
