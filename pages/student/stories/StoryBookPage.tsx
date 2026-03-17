import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Child } from '../../../types';
import { useStories } from '../../../hooks/useStories';
import { Story } from '../../../services/storyService';

export const StoryBookPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const child = (location.state as any)?.child as Child;
  const { stories, loading } = useStories(child?.id);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);

  if (!child) {
    // If we have children loaded in context but no child in state, 
    // we might need to fetch or redirect.
    // Better to show loading or empty state rather than null if it's just a refresh issue.
    // But for now, let's keep redirect but ensure it returns properly.
    navigate('/student');
    return null;
  }

  return (
    <div className="min-h-screen bg-amber-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-amber-100 px-6 py-6 border-b-4 border-amber-200 sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-amber-700 shadow-sm active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
             <h1 className="text-2xl font-black text-amber-800 tracking-tight">Meu Livro de Histórias 📖</h1>
             <p className="text-amber-700 font-bold text-sm">Coleção de {child.name.split(' ')[0]}</p>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-4xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
             <div className="size-16 border-4 border-amber-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : stories.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] shadow-sm border-2 border-amber-100 border-dashed px-6">
             <div className="size-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-500 animate-bounce">
                <span className="material-symbols-outlined text-5xl">menu_book</span>
             </div>
             <h2 className="text-xl font-black text-amber-900 mb-2">Sua estante está vazia 📚</h2>
             <p className="text-amber-700 mb-6 max-w-md mx-auto">
               Você ainda não escreveu nenhuma história. Complete suas missões diárias para desbloquear a <strong>Missão Criativa</strong> e se tornar um autor!
             </p>
             <button 
               onClick={() => navigate('/missao-criativa', { state: { child } })}
               className="px-6 py-3 bg-amber-500 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all hover:bg-amber-600 flex items-center gap-2 mx-auto"
             >
               <span className="material-symbols-outlined">edit_note</span>
               Escrever Minha Primeira História
             </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {stories.map((story, index) => (
                <div 
                  key={story.id}
                  onClick={() => setSelectedStory(story)}
                  className="bg-white rounded-[2rem] p-6 shadow-sm border-b-4 border-amber-200 hover:border-amber-400 hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden"
                >
                   {/* Decorative ribbon */}
                   <div className="absolute top-0 right-0 bg-amber-100 px-4 py-2 rounded-bl-2xl font-bold text-amber-700 text-xs">
                      Capítulo {stories.length - index}
                   </div>

                   <div className="flex items-start gap-4">
                      <div className="size-16 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0 group-hover:bg-amber-200 transition-colors">
                         <span className="material-symbols-outlined text-3xl">auto_stories</span>
                      </div>
                      <div className="flex-1 min-w-0">
                         <h3 className="text-lg font-black text-gray-800 leading-tight mb-1 group-hover:text-amber-700 transition-colors line-clamp-2">
                            {story.title}
                         </h3>
                         <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                            {story.content}
                         </p>
                         <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wide">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            {new Date(story.created_at).toLocaleDateString('pt-BR')}
                         </div>
                      </div>
                   </div>
                </div>
             ))}
          </div>
        )}
      </main>

      {/* Reader Modal */}
      {selectedStory && (
         <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-scale-up">
               {/* Reader Header */}
               <div className="bg-amber-100 p-6 flex items-center justify-between shrink-0">
                  <h2 className="font-black text-xl text-amber-900 truncate pr-4">{selectedStory.title}</h2>
                  <button 
                    onClick={() => setSelectedStory(null)}
                    className="size-10 bg-white rounded-full flex items-center justify-center text-amber-800 shadow-sm active:scale-90 transition-transform"
                  >
                     <span className="material-symbols-outlined">close</span>
                  </button>
               </div>
               
               {/* Reader Content */}
               <div className="p-8 overflow-y-auto font-serif text-lg leading-relaxed text-gray-800 bg-amber-50/30 flex-1">
                  <p className="whitespace-pre-line first-letter:text-5xl first-letter:font-black first-letter:text-amber-600 first-letter:mr-1 first-letter:float-left">
                     {selectedStory.content}
                  </p>
                  
                  <div className="mt-12 flex justify-center">
                     <span className="text-amber-300 text-2xl">❦</span>
                  </div>
               </div>

               {/* Footer */}
               <div className="p-4 bg-white border-t border-gray-100 text-center shrink-0">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Fim do Capítulo</p>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
