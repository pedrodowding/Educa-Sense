import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exercise } from '../types';
import { generateAudioAI } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  history: Exercise[];
}

import { supabase } from '../services/supabase';

const ReadingResultPage: React.FC<Props> = ({ history }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const exercise = history.find(e => e.id === id);
  const [playing, setPlaying] = useState(false);
  
  // Guided Reading State
  const [currentStep, setCurrentStep] = useState(0);
  const [showCompletion, setShowCompletion] = useState(false);
  const [mediationAnswer, setMediationAnswer] = useState<string | null>(null);

  useEffect(() => {
    // Reset state when exercise changes
    setCurrentStep(0);
    setShowCompletion(false);
    setMediationAnswer(null);
  }, [id]);

  const handleCompletion = async () => {
    setShowCompletion(true);
    if (exercise?.id) {
       // Mark as completed in DB to trigger XP/Progress
       try {
         await supabase.from('exercises').update({ 
           completed: true,
           // Score is optional for reading, but we can set 10 (max) to indicate success if needed, 
           // or leave null to not affect avg_score. User rule says "score >= 8 -> +10 xp". 
           // Reading rule is fixed 10xp. So score doesn't matter for XP.
           // But let's leave score null to avoid skewing average with "easy" reading scores?
           // Or set 10 to encourage? Let's leave null/undefined for now as it's not an exam.
         }).eq('id', exercise.id);
       } catch (e) {
         console.error("Error marking reading as complete:", e);
       }
    }
  };

  if (!exercise) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-gray-50 dark:bg-background-dark">
        <div className="size-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 font-bold">Carregando história...</p>
        <button onClick={() => navigate(-1)} className="mt-8 text-primary font-bold hover:underline">
          Voltar
        </button>
      </div>
    );
  }

  const parts = (exercise.pedagogicalObjective || 'Prática Geral').split('|||');
  const storyContent = parts.length > 1 ? parts[0] : null;
  
  // Split content into steps
  const steps = useMemo(() => {
    if (!storyContent) return [exercise.title]; // Fallback if no content
    
    // Split by double newlines (paragraphs)
    let chunks = storyContent.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    // If only one chunk but long, try splitting by sentences roughly
    if (chunks.length <= 1 && storyContent.length > 300) {
      const sentences = storyContent.match(/[^.!?]+[.!?]+["']?|[\s\S]+$/g) || [storyContent];
      chunks = [];
      let currentChunk = "";
      let sentenceCount = 0;
      
      sentences.forEach((s) => {
        currentChunk += s;
        sentenceCount++;
        // Break every 3 sentences or if chunk gets too long
        if (sentenceCount >= 3 || currentChunk.length > 250) {
          chunks.push(currentChunk);
          currentChunk = "";
          sentenceCount = 0;
        }
      });
      if (currentChunk.trim()) chunks.push(currentChunk);
    }
    
    // Safety check to ensure at least one step exists
    if (chunks.length === 0) return [storyContent || exercise.title];

    return chunks;
  }, [storyContent, exercise.title]);

  const progress = Math.min(100, ((currentStep + 1) / steps.length) * 100);

  // Mediation Questions (Mock/Generic)
  const getMediation = (index: number) => {
    const questions = [
      { q: "Quem apareceu nessa parte?", options: ["Um personagem", "O narrador", "Ninguém"] },
      { q: "O que você imaginou agora?", options: ["Uma cena feliz", "Algo misterioso", "Uma confusão"] },
      { q: "Como você acha que eles se sentem?", options: ["Felizes", "Preocupados", "Animados"] },
      { q: "O que deve acontecer depois?", options: ["Uma surpresa", "Um problema", "Uma festa"] }
    ];
    return questions[index % questions.length];
  };

  const currentMediation = getMediation(currentStep);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      setMediationAnswer(null); // Reset mediation answer for next step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      handleCompletion();
    }
  };

  const handlePrint = () => {
    if (window.print) window.print();
  };

  const handlePlayAudio = async () => {
    if (playing) return;
    setPlaying(true);
    
    try {
      // Read only current step text
      const textToRead = steps[currentStep];
      console.log('Solicitando áudio para:', textToRead?.substring(0, 50) + '...');
      
      const audioBase64 = await generateAudioAI(textToRead);
      
      if (audioBase64) {
        // Basic detection: MP3 starts with ID3 (SUQz) or FF F3/F2 (///), WAV starts with RIFF (UklGR)
        let mimeType = 'audio/mp3'; // Default for modern TTS
        if (audioBase64.startsWith('UklGR')) {
          mimeType = 'audio/wav';
        } else if (audioBase64.startsWith('SUQz') || audioBase64.startsWith('//')) {
          mimeType = 'audio/mpeg';
        }

        const audio = new Audio(`data:${mimeType};base64,${audioBase64}`);
        
        audio.onended = () => setPlaying(false);
        audio.onerror = (e) => {
          console.error("Erro no player de áudio:", e);
          setPlaying(false);
          alert("Não foi possível reproduzir o áudio.");
        };
        
        await audio.play();
      } else {
        setPlaying(false);
        alert("Não foi possível gerar o áudio agora.");
      }
    } catch (error) {
      console.error("Erro ao gerar/tocar áudio:", error);
      setPlaying(false);
      alert("Erro ao processar o áudio.");
    }
  };

  // --- COMPLETION SCREEN ---
  if (showCompletion) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark items-center justify-center p-8 animate-fade-in">
        <div className="text-center space-y-6 max-w-sm">
          <div className="size-24 bg-green-100 dark:bg-green-900/30 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
            <span className="material-symbols-outlined text-5xl">emoji_events</span>
          </div>
          
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">Leitura Concluída! 🎉</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            Parabéns! Você leu "{exercise.title}" com muita atenção.
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-xs font-black uppercase tracking-wider">Leitura Feita</span>
            <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-black uppercase tracking-wider">Compreensão</span>
          </div>

          <div className="pt-8 space-y-3 w-full">
            <button 
              onClick={() => navigate('/plano-hoje')}
              className="w-full h-14 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 transition-all"
            >
              Voltar para o Plano
            </button>
            <button 
              onClick={() => navigate('/programas')}
              className="w-full h-14 bg-gray-100 dark:bg-gray-800 font-black rounded-2xl active:scale-95 transition-all"
            >
              Ir para Programas
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-background-dark">
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 no-print">
        <div className="flex items-center justify-between p-4">
          <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          
          <div className="text-center">
             <h1 className="text-sm font-black text-gray-900 dark:text-white">Leitura Guiada</h1>
             <p className="text-[10px] text-text-sub font-medium">Passo a passo</p>
          </div>
          
          <div className="size-10"></div> {/* Spacer for balance */}
        </div>

        {/* Progress Bar */}
        <div className="px-6 pb-4">
           <div className="flex justify-between text-[10px] font-bold text-text-sub uppercase mb-2">
              <span>Etapa {currentStep + 1} de {steps.length}</span>
              <span>{Math.round(progress)}%</span>
           </div>
           <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
           </div>
        </div>
      </header>

      {/* --- MAIN CONTENT (Reading Step) --- */}
      <main className="flex-1 p-6 pb-40 max-w-2xl mx-auto w-full space-y-8 animate-fade-in key={currentStep}">
        
        {/* Text Card */}
        <div className="bg-white dark:bg-surface-dark rounded-[32px] p-6 md:p-10 border border-gray-100 dark:border-gray-800 shadow-soft relative overflow-hidden">
           {/* Decoration */}
           <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-purple-400 to-primary opacity-50"></div>
           
           <h2 className="text-xl font-black mb-6 text-gray-900 dark:text-white leading-tight">{exercise.title}</h2>
           
           <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg md:text-xl text-gray-700 dark:text-gray-200 leading-relaxed font-medium">
                {steps[currentStep]}
              </p>
           </div>

           {/* Audio Button */}
           <button 
             onClick={handlePlayAudio}
             className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${playing ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
           >
             <span className="material-symbols-outlined text-lg">{playing ? 'stop_circle' : 'volume_up'}</span>
             {playing ? 'Parar Leitura' : 'Ouvir Texto'}
           </button>
        </div>

        {/* Mediation Block */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-[24px] p-6 border border-blue-100 dark:border-blue-800/30">
           <div className="flex items-center gap-3 mb-4">
              <div className="size-8 bg-blue-500 text-white rounded-full flex items-center justify-center">
                 <span className="material-symbols-outlined text-lg">psychology</span>
              </div>
              <h3 className="font-bold text-blue-800 dark:text-blue-300 text-sm">Vamos pensar um pouco?</h3>
           </div>
           
           <p className="text-lg font-bold text-gray-800 dark:text-white mb-6 leading-tight">
             {currentMediation.q}
           </p>

           <div className="grid grid-cols-1 gap-3">
              {currentMediation.options.map((opt, i) => (
                <button 
                  key={i}
                  onClick={() => setMediationAnswer(opt)}
                  className={`w-full p-4 rounded-xl text-left font-medium transition-all border-2 ${
                    mediationAnswer === opt 
                      ? 'bg-blue-500 border-blue-500 text-white shadow-md scale-[1.02]' 
                      : 'bg-white dark:bg-gray-800 border-transparent hover:border-blue-200 dark:hover:border-blue-800'
                  }`}
                >
                  {opt}
                </button>
              ))}
           </div>
        </div>

      </main>

      {/* --- FOOTER ACTIONS --- */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 z-40 no-print">
         <div className="max-w-2xl mx-auto flex flex-col gap-3">
            <button 
              onClick={handleNext}
              disabled={!mediationAnswer && false} // Optional: require answer? User said "light mediation", maybe optional. keeping enabled.
              className="w-full h-14 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>{currentStep === steps.length - 1 ? 'Concluir Leitura' : 'Continuar Leitura'}</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            
            <button 
              onClick={handlePrint}
              className="w-full py-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">print</span>
              Imprimir para ler offline
            </button>
         </div>
      </footer>

      {/* --- PRINT LAYOUT (Hidden from screen) --- */}
      <div className="print-only hidden print:block fixed inset-0 bg-white z-[1000] p-10">
           {/* Same print layout as before, showing full content */}
           <div className="mb-8 border-b-2 border-black pb-4">
              <div className="flex justify-between items-start mb-6">
                 <div>
                    <h2 className="text-xl font-black">Educa Sense</h2>
                    <p className="text-[10px] font-bold uppercase tracking-widest">Leitura Guiada</p>
                 </div>
                 <div className="text-right text-[10px] font-bold uppercase">
                    Matéria: {exercise.subject}
                 </div>
              </div>
           </div>
           
           <h1 className="text-2xl font-black mb-6">{exercise.title}</h1>
           
           <div className="space-y-4 text-sm leading-relaxed text-justify font-serif">
              {steps.map((step, i) => (
                <p key={i}>{step}</p>
              ))}
           </div>
           
           <div className="mt-20 text-center border-t border-black pt-4 text-[8px]">
              Educa Sense - Leitura Guiada
           </div>
      </div>

    </div>
  );
};

export default ReadingResultPage;
