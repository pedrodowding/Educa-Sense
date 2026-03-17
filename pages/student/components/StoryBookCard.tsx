import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Child } from '../../../types';

interface Props {
  child: Child;
}

export const StoryBookCard: React.FC<Props> = ({ child }) => {
  const navigate = useNavigate();

  if (child.storyEnabled === false) return null;

  return (
    <div 
      onClick={() => navigate('/student/stories', { state: { child } })}
      className="bg-amber-100 rounded-3xl p-5 shadow-sm border border-amber-200 relative overflow-hidden active:scale-95 transition-all cursor-pointer group mb-6"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-bl-full -mr-6 -mt-6 group-hover:bg-amber-300 transition-colors opacity-50" />
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="size-14 bg-white text-amber-600 rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-3xl">menu_book</span>
          </div>
          <div>
            <h3 className="font-black text-xl text-amber-900 leading-tight">Meu Livro</h3>
            <p className="text-xs text-amber-800 font-bold mt-1">
              Abrir minha coleção de histórias 📖
            </p>
          </div>
        </div>

        <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-amber-800 group-hover:bg-amber-500 group-hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_forward</span>
        </div>
      </div>
    </div>
  );
};
