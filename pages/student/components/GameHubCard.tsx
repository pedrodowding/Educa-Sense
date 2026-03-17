import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Child } from '../../../types';

interface Props {
  child: Child;
}

export const GameHubCard: React.FC<Props> = ({ child }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate('/hora-do-jogo')}
      className="bg-indigo-100 rounded-3xl p-5 shadow-sm border border-indigo-200 relative overflow-hidden active:scale-95 transition-all cursor-pointer group mb-6"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-200 rounded-bl-full -mr-6 -mt-6 group-hover:bg-indigo-300 transition-colors opacity-50" />
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-14 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">sports_esports</span>
          </div>
          <div>
            <h3 className="font-black text-xl text-indigo-900 leading-tight">Hora do Jogo</h3>
            <p className="text-xs text-indigo-800 font-bold mt-1">
              Divirta-se com jogos educativos! 🎮
            </p>
          </div>
        </div>

        <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-indigo-800 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_forward</span>
        </div>
      </div>
    </div>
  );
};
