
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exercise } from '../types';
import { generateAudioAI } from '../services/geminiService';

interface Props {
  history: Exercise[];
}

const ResultPage: React.FC<Props> = ({ history }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exercise = history.find(e => e.id === id);
  const [playing, setPlaying] = useState(false);

  if (!exercise) return null;

  const parts = exercise.pedagogicalObjective.split('|||');
  const storyContent = parts.length > 1 ? parts[0] : null;
  const objectiveText = parts.length > 1 ? parts[1] : parts[0];

  const handlePrint = () => {
    // Comando direto sem atrasos para evitar bloqueios de popup/print no mobile
    if (window.print) {
      window.print();
    } else {
      alert("Seu navegador não suporta a função de impressão.");
    }
  };

  const handlePlayAudio = async () => {
    if (playing) return;
    setPlaying(true);
    const textToRead = storyContent || exercise.title;
    const audioBase64 = await generateAudioAI(textToRead);
    
    if (audioBase64) {
      const audio = new Audio(`data:audio/pcm;base64,${audioBase64}`);
      audio.onended = () => setPlaying(false);
      audio.play().catch(() => setPlaying(false));
    } else {
      setPlaying(false);
      alert("Não foi possível gerar o áudio agora.");
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-background-dark">
      {/* Header Interativo (Sempre Oculto na Impressão) */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 no-print border-b border-gray-100 dark:border-gray-800">
        <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 transition-colors hover:bg-gray-200">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="text-center">
           <h1 className="text-xs font-black uppercase tracking-widest text-primary">Folha de Atividade</h1>
           <p className="text-[10px] text-text-sub font-bold">{exercise.subject}</p>
        </div>
        <button 
          onClick={handlePrint} 
          className="size-10 flex items-center justify-center rounded-full bg-primary text-black shadow-glow active:scale-90 transition-transform"
          title="Imprimir ou Salvar PDF"
        >
          <span className="material-symbols-outlined">print</span>
        </button>
      </header>

      {/* ÁREA IMPRESSÍVEL (CONTAINER PRINCIPAL) */}
      <main className="worksheet-container p-5 md:p-10 pb-40 space-y-6">
        
        {/* Cabeçalho Escolar (Visível APENAS na Impressão) */}
        <div className="print-only mb-8 border-b-2 border-black pb-4">
           <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                 <div className="size-12 bg-black text-white flex items-center justify-center font-black rounded-lg">ES</div>
                 <div>
                    <h2 className="text-xl font-black">Educa Sense</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Programa Exercício Fácil</p>
                 </div>
              </div>
              <div className="text-right text-[10px] font-bold uppercase">
                 Matéria: {exercise.subject}<br/>
                 Nível: {exercise.difficulty}
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="border-b border-black pb-1">
                 <span className="text-[8px] font-black uppercase">Aluno(a):</span>
                 <span className="ml-2 font-bold">{exercise.childName}</span>
              </div>
              <div className="border-b border-black pb-1">
                 <span className="text-[8px] font-black uppercase">Data:</span>
                 <span className="ml-2">____/____/2025</span>
              </div>
           </div>
        </div>

        {/* Banner com Imagem da IA */}
        {exercise.imageUrl && (
          <div className="w-full h-56 rounded-[40px] overflow-hidden border-4 border-white dark:border-gray-800 shadow-xl no-print">
             <img src={exercise.imageUrl} alt="Ilustração" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Imagem para Impressão */}
        {exercise.imageUrl && (
          <div className="print-only w-full mb-6">
             <img src={exercise.imageUrl} alt="Ilustração Atividade" className="w-full h-auto rounded-xl border border-gray-200" />
          </div>
        )}

        {/* Título e Texto */}
        <section className="bg-white dark:bg-surface-dark p-6 md:p-10 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-soft space-y-4 print:shadow-none print:border-none print:p-0">
           <h2 className="text-3xl font-black leading-tight text-center print:text-left print:text-2xl">{exercise.title}</h2>
           
           {storyContent && (
             <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl relative print:bg-gray-50 print:border print:border-gray-100">
                <button 
                  onClick={handlePlayAudio}
                  className={`absolute -top-4 -right-2 size-12 rounded-2xl flex items-center justify-center shadow-lg transition-all no-print ${playing ? 'bg-orange-400 animate-pulse' : 'bg-primary text-black'}`}
                >
                  <span className="material-symbols-outlined">{playing ? 'stop' : 'volume_up'}</span>
                </button>
                <p className="text-lg font-medium leading-relaxed italic text-blue-900 dark:text-blue-200 print:text-black print:text-sm">
                  {storyContent}
                </p>
             </div>
           )}

           <div className="flex flex-wrap justify-center gap-2 no-print">
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full text-[10px] font-black uppercase tracking-widest">{exercise.grade}</span>
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest">{exercise.difficulty}</span>
           </div>

           <p className="text-center text-xs text-text-sub font-medium px-4 print:text-left print:px-0 print:italic">{objectiveText}</p>
        </section>

        {/* Questões */}
        <div className="space-y-4">
          <h3 className="text-lg font-black print-only mb-4">Questões:</h3>
          {exercise.questions.map((q, idx) => (
            <div key={idx} className="question-box bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 print:rounded-none print:border-b print:p-4">
               <div className="flex gap-4 items-start">
                  <span className="size-8 rounded-xl bg-primary text-black flex items-center justify-center font-black shrink-0 print:bg-black print:text-white">{idx + 1}</span>
                  <div className="space-y-4 flex-1">
                    <p className="text-lg font-bold print:text-sm">{q.text}</p>
                    {q.options ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {q.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <div className="size-5 rounded-full border-2 border-gray-200 print:border-black"></div>
                            <span className="text-sm font-medium print:text-xs">{opt}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-24 w-full border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-2xl print:border-black print:h-32"></div>
                    )}
                  </div>
               </div>
            </div>
          ))}
        </div>

        {/* Rodapé da Folha (Apenas Impressão) */}
        <div className="print-only mt-20 text-center border-t border-gray-200 pt-4 text-[8px] text-gray-400">
           Gerado automaticamente pelo Educa Sense - IA Educacional. © 2025
        </div>
      </main>

      {/* Botões Flutuantes (Ocultos na Impressão) */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-background-dark via-white dark:via-background-dark to-transparent z-40 no-print">
        <div className="max-w-md mx-auto flex gap-3">
           <button 
             onClick={handlePrint}
             className="flex-1 h-16 bg-white dark:bg-gray-800 text-black dark:text-white border-2 border-gray-100 dark:border-gray-700 font-black rounded-2xl shadow-soft flex items-center justify-center gap-3 active:scale-95 transition-transform"
           >
             <span className="material-symbols-outlined">print</span>
             Imprimir
           </button>
           <button 
             onClick={() => navigate(`/exercicio-facil/quiz/${exercise.id}`)}
             className="flex-[2] h-16 bg-primary text-black font-black text-xl rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
           >
             <span className="material-symbols-outlined">rocket_launch</span>
             Modo Quiz
           </button>
        </div>
      </div>
    </div>
  );
};

export default ResultPage;
