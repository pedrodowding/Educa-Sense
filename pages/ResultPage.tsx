import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exercise, Subject } from '../types';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';

interface Props {
  history: Exercise[];
}

const ResultPage: React.FC<Props> = ({ history }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exercise = history.find(e => e.id === id);
  const [showPaywall, setShowPaywall] = useState(false);

  // Debug Logs
  useEffect(() => {
    if (exercise) {
      console.log('[ResultPage] Loading exercise:', {
        id: exercise.id,
        type: exercise.type,
        selectedFormat: exercise.selectedFormat,
        subject: exercise.subject,
        hasQuestions: exercise.questions?.length
      });
    }
  }, [exercise]);

  if (!exercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50 dark:bg-background-dark">
        <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-bold">Carregando atividade...</p>
        <button onClick={() => navigate(-1)} className="mt-8 text-primary font-bold hover:underline">
          Voltar
        </button>
      </div>
    );
  }

  // Error if Leitura Guiada (Should use ReadingResultPage)
  if (exercise.type === 'leitura_guiada' || exercise.selectedFormat === 'leitura_guiada') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-red-50 dark:bg-red-900/10">
        <div className="size-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-3xl">error_outline</span>
        </div>
        <h2 className="text-xl font-black text-red-700 dark:text-red-400 mb-2">Formato Inválido</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-xs mb-6">
          Este exercício é uma Leitura Guiada e não deveria aparecer aqui. Por favor, gere novamente.
        </p>
        <button 
          onClick={() => navigate('/exercicio-facil/criar')}
          className="px-6 py-3 bg-red-500 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all"
        >
          Gerar Novamente
        </button>
      </div>
    );
  }

  // ART Subject Special Handling (Keep as is)
  if (exercise.subject === Subject.ART && exercise.imageUrl) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
        {/* Header fixo no topo */}
        <header className="p-6 pt-10 flex items-center justify-between no-print border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md sticky top-0 z-40">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 font-bold text-sm active:scale-95 transition-all">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar
          </button>
          <h2 className="text-lg font-black text-purple-400">Desenho Salvo</h2>
          <div className="size-10"></div>
        </header>

        <main className="p-6 flex flex-col items-center flex-1 overflow-y-auto no-scrollbar pb-40 animate-fade-in">
           <div className="w-full max-w-sm bg-white border-4 border-purple-50 dark:border-gray-800 p-4 rounded-[48px] shadow-soft mb-4">
              <img src={exercise.imageUrl} alt="Desenho gerado" className="w-full h-auto rounded-[32px] shadow-sm" />
              <div className="mt-6 text-center">
                 <p className="text-[10px] font-black uppercase text-purple-300 tracking-[3px]">Atividade de Colorir</p>
                 <p className="text-xs text-text-sub mt-1">{exercise.title}</p>
              </div>
           </div>
        </main>

        {/* Footer Fixo com Ações */}
        <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/95 dark:bg-background-dark/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-50 no-print flex justify-center pb-8">
           <div className="w-full max-w-sm">
             <button 
              onClick={() => window.print()}
              className="w-full h-14 bg-purple-500 text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-glow active:scale-95 transition-all"
             >
                <span className="material-symbols-outlined text-xl">print</span>
                <span className="text-xs uppercase">Imprimir Desenho</span>
             </button>
           </div>
        </footer>

        {/* Layout Otimizado para Impressão (Igual ao ArtesCriativasPage) */}
        <div className="print-only fixed inset-0 bg-white z-[1000] p-10 flex flex-col items-center justify-between">
           <div className="w-full flex justify-between items-center border-b-2 border-gray-100 pb-4">
              <div>
                 <h1 className="text-xl font-black uppercase text-purple-400 tracking-widest">Atividade de Artes</h1>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Educa Sense - Artes Criativas</p>
              </div>
              <div className="size-12 bg-black text-white flex items-center justify-center font-black rounded-xl">ES</div>
           </div>

           <img src={exercise.imageUrl} alt="Desenho para Colorir" className="w-full h-auto max-h-[75vh] object-contain" />

           <div className="w-full grid grid-cols-2 gap-8 pt-8 border-t-2 border-gray-100">
              <div className="border-b border-gray-400 pb-1">
                 <span className="text-[8px] font-black uppercase text-gray-400">Aluno(a):</span>
                 <p className="font-bold text-sm ml-2">{exercise.childName}</p>
              </div>
              <div className="border-b border-gray-400 pb-1">
                 <span className="text-[8px] font-black uppercase text-gray-400">Data:</span>
                 <p className="font-bold text-sm ml-2">____ / ____ / 2025</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  // --- NEW PREVIEW UI FOR QUIZ ---
  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Header */}
      <header className="p-6 pt-10 flex items-center justify-between bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800 sticky top-0 z-40">
        <button onClick={() => navigate('/exercicio-facil/criar')} className="size-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-text-main active:scale-95 transition-all">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-lg font-black text-center">Atividade Pronta!</h1>
        <div className="size-10"></div>
      </header>

      <main className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto pb-32">
        {/* Card de Resumo */}
        <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="size-16 rounded-2xl bg-primary/20 flex items-center justify-center text-primary">
               <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <div>
              <p className="text-xs font-bold text-text-sub uppercase tracking-wider">Matéria</p>
              <h2 className="text-xl font-black text-text-main">{exercise.subject}</h2>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black/20 rounded-2xl">
                <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-gray-400">signal_cellular_alt</span>
                   <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Dificuldade</span>
                </div>
                <span className="px-3 py-1 bg-white dark:bg-surface-dark rounded-lg text-xs font-black uppercase shadow-sm border border-gray-100 dark:border-gray-700">
                  {exercise.difficulty}
                </span>
             </div>

             <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-black/20 rounded-2xl">
                <div className="flex items-center gap-3">
                   <span className="material-symbols-outlined text-gray-400">quiz</span>
                   <span className="text-sm font-bold text-gray-600 dark:text-gray-300">Questões</span>
                </div>
                <span className="text-sm font-black">{exercise.questions?.length || 0}</span>
             </div>

             <div className="p-4 bg-gray-50 dark:bg-black/20 rounded-2xl">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Objetivo Pedagógico</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{exercise.pedagogicalObjective}"</p>
             </div>
          </div>
        </div>
      </main>

      {/* Footer com CTAs */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-background-dark/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-50 pb-8">
        <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
          <button 
            onClick={() => navigate(`/exercicio-facil/quiz/${exercise.id}`)}
            className="w-full h-14 bg-primary text-black rounded-2xl font-black text-lg shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">play_circle</span>
            Iniciar Quiz
          </button>
          
          <button 
            onClick={() => {
              if (Entitlements.isFeatureAllowed('can_print_activities')) {
                navigate(`/exercicio-facil/print/${exercise.id}`);
              } else {
                setShowPaywall(true);
              }
            }}
            className="w-full h-14 bg-white dark:bg-surface-dark text-text-main border-2 border-gray-100 dark:border-gray-700 rounded-2xl font-bold text-sm active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined">print</span>
            Imprimir Atividade
            {!Entitlements.isFeatureAllowed('can_print_activities') && (
               <span className="material-symbols-outlined text-gray-400 text-sm">lock</span>
            )}
          </button>
        </div>
      </footer>
      
      <PaywallModal 
        isOpen={showPaywall} 
        onClose={() => setShowPaywall(false)} 
        featureName="Impressão de Atividades"
      />
    </div>
  );
};

export default ResultPage;
