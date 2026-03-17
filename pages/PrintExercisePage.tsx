import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exercise } from '../types';

interface Props {
  history: Exercise[];
}

const PrintExercisePage: React.FC<Props> = ({ history }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exercise = history.find(e => e.id === id);

  useEffect(() => {
    if (exercise) {
      // Pequeno delay para garantir renderização antes de abrir o diálogo
      const timer = setTimeout(() => {
        window.print();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [exercise]);

  if (!exercise) {
    return (
      <div className="p-8 text-center">
        <p>Exercício não encontrado.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 underline">Voltar</button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen text-black p-8 md:p-12 print:p-0">
      {/* Cabeçalho da Folha */}
      <header className="flex justify-between items-start border-b-2 border-black pb-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="size-16 bg-black text-white rounded-xl flex items-center justify-center font-black text-2xl">ES</div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest">Educa Sense</h1>
            <p className="text-sm font-bold uppercase text-gray-500">Atividade de {exercise.subject}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2 min-w-[300px]">
          <div className="flex items-end gap-2">
            <span className="text-xs font-black uppercase min-w-[60px]">Aluno(a):</span>
            <div className="flex-1 border-b border-black border-dashed h-4"></div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-xs font-black uppercase min-w-[60px]">Data:</span>
            <div className="flex-1 border-b border-black border-dashed h-4"></div>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-xs font-black uppercase min-w-[60px]">Nota:</span>
            <div className="flex-1 border-b border-black border-dashed h-4"></div>
          </div>
        </div>
      </header>

      {/* Título e Info */}
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-black mb-2">{exercise.title}</h2>
        <p className="text-gray-600 italic px-8">{exercise.pedagogicalObjective}</p>
      </div>

      {/* Questões */}
      <div className="space-y-10">
        {exercise.questions.map((q, idx) => (
          <div key={q.id} className="break-inside-avoid">
            <div className="flex gap-3">
              <span className="text-xl font-black">{idx + 1}.</span>
              <div className="flex-1">
                <p className="text-lg font-bold mb-4">{q.text}</p>
                
                {q.type === 'multiple' && q.options && (
                  <div className="space-y-3 pl-2">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-1 size-5 border-2 border-black rounded-full shrink-0"></div>
                        <span className="text-lg">{opt}</span>
                      </div>
                    ))}
                  </div>
                )}

                {(q.type === 'open') && (
                  <div className="w-full">
                    <div className="w-full border-b border-gray-300 h-8"></div>
                    <div className="w-full border-b border-gray-300 h-8"></div>
                    <div className="w-full border-b border-gray-300 h-8"></div>
                    <div className="w-full border-b border-gray-300 h-8"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <footer className="mt-16 pt-8 border-t border-gray-200 text-center text-xs text-gray-400 uppercase tracking-widest">
        Gerado por Educa Sense AI • educasense.com
      </footer>

      {/* Botões de Ação (Hidden on Print) */}
      <div className="fixed bottom-6 right-6 flex gap-3 print:hidden">
        <button 
          onClick={() => navigate(-1)} 
          className="px-6 py-3 bg-white text-gray-700 font-bold rounded-xl shadow-lg border border-gray-200 active:scale-95 transition-all"
        >
          Voltar
        </button>
        <button 
          onClick={() => window.print()} 
          className="px-6 py-3 bg-black text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined">print</span>
          Imprimir
        </button>
      </div>
    </div>
  );
};

export default PrintExercisePage;
