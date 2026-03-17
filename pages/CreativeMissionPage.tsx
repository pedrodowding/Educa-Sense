import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { useHistory } from '../hooks/useHistory';
import { Subject, Difficulty, Exercise } from '../types';
import { bringDrawingToLifeAI, generateAudioAI, generateStoryAI } from '../services/geminiService';
import { compressAndResizeImage } from '../services/imageProcessing';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';
import { historyService } from '../services/historyService';
import { storyService } from '../services/storyService';
import { supabase } from '../services/supabase';

// Types
type ViewState = 'selection' | 'drawing_life' | 'story_day' | 'done' | 'locked';
type DrawingStep = 'intro' | 'upload' | 'processing' | 'result';
type StoryStep = 'wizard' | 'generating' | 'reading';

interface StoryChoices {
  hero: string;
  theme: string;
  scenario: string;
  challenge: string;
  ending: string;
}

const CreativeMissionPage: React.FC = () => {
  const navigate = useNavigate();
  const { selectedChild } = useSelectedChild();
  const { dailyState, loading: dailyLoading } = useDailyProgress();
  const { saveToHistory } = useHistory();
  
  // Global State
  const [view, setView] = useState<ViewState>('locked');
  const [showPaywall, setShowPaywall] = useState(false);
  const isPro = Entitlements.getUserTier() === 'PRO';

  // Drawing Module State
  const [drawingStep, setDrawingStep] = useState<DrawingStep>('intro');
  const [uploadedImage, setUploadedImage] = useState<{data: string, mime: string, size?: number, width?: number, height?: number, previewUrl?: string} | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [resultStory, setResultStory] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<{message: string, code?: string, canRetry?: boolean} | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Clean up object URLs when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (uploadedImage?.previewUrl) {
        URL.revokeObjectURL(uploadedImage.previewUrl);
      }
    };
  }, [uploadedImage]);

  // Story Module State
  const [storyStep, setStoryStep] = useState<StoryStep>('wizard');
  const [storyContent, setStoryContent] = useState<string | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const [choices, setChoices] = useState<StoryChoices>({
    hero: '',
    theme: '',
    scenario: '',
    challenge: '',
    ending: ''
  });

  const WIZARD_STEPS = [
    {
      id: 1,
      title: 'Quem será o herói?',
      field: 'hero',
      options: [selectedChild?.name || 'Eu', 'Esther', 'Samuel']
    },
    {
      id: 2,
      title: 'Sobre o que é a história?',
      field: 'theme',
      options: ['Curiosidade', 'Amizade', 'Coragem']
    },
    {
      id: 3,
      title: 'Onde vai acontecer?',
      field: 'scenario',
      options: ['Floresta Mágica', 'Castelo nas Nuvens', 'Espaço Sideral']
    },
    {
      id: 4,
      title: 'Qual é o desafio?',
      field: 'challenge',
      options: ['Resolver um Enigma', 'Ajudar um Amigo', 'Encontrar um Tesouro']
    },
    {
      id: 5,
      title: 'Como termina?',
      field: 'ending',
      options: ['Final Feliz', 'Grande Surpresa', 'Festa']
    }
  ];

  // Initialization & Security Check
  useEffect(() => {
    if (dailyLoading || !selectedChild) return;

    const checkStatus = async () => {
      // 1. Check if Daily Plan is done (Unlock condition)
      const isUnlocked = dailyState?.status === 'done';
      
      if (!isUnlocked) {
        setView('locked');
        return;
      }

      // 2. Check if reward already used (Story or Drawing)
      const today = new Date().toISOString().split('T')[0];
      
      // Sprint 8.1: Check via RPC
      let isRewardUsed = false;

      // Check Drawing/Story used state via RPC or activity_completions
      // Since rpc_can_use_reward checks child_daily_rewards, we can use it to check availability
      
      // Check for 'game' specifically to toggle button
      // But for 'story' and 'drawing', we currently use activity_completions
      // To unify, we should ideally use rpc_can_use_reward for all.
      // However, to keep backward compatibility with existing stories, we check DB as before.

      const { data: existingStory } = await supabase
        .from('activity_completions')
        .select('*')
        .eq('child_id', selectedChild.id)
        .eq('completed_date', today)
        .eq('activity_type', 'story_of_the_day')
        .maybeSingle();

      if (existingStory) {
        setChoices(existingStory.metadata.choices);
        setStoryContent(existingStory.metadata.story);
        setView('story_day');
        setStoryStep('reading');
        return;
      }

      // Check if any reward was used via child_daily_rewards (Sprint 8.1)
      // This table now tracks ANY reward usage if we implement it so.
      // For now, we only strictly enforce it for 'game'.
      // But the requirement says "Remover dependência de localStorage".
      
      // We'll check if ANY reward type exists for today in child_daily_rewards?
      // Or check specific types.
      // Let's check 'story', 'drawing', 'game'.
      
      const { data: rewards } = await supabase
        .from('child_daily_rewards')
        .select('reward_type')
        .eq('child_id', selectedChild.id)
        .eq('reward_date', today);

      if (rewards && rewards.length > 0) {
         // If any reward used, we show 'done' (unless it's story/game re-entry?)
         // If story was used, we handled it above via activity_completions (legacy/rich data).
         // If game was used, we might block re-entry.
         // If drawing was used, block.
         const hasDrawing = rewards.some(r => r.reward_type === 'drawing');
         const hasGame = rewards.some(r => r.reward_type === 'game');
         const hasStory = rewards.some(r => r.reward_type === 'story');

         if (hasDrawing || hasGame || (hasStory && !existingStory)) {
             setView('done');
             return;
         }
      }

      setView('selection');
    };

    checkStatus();
  }, [dailyState, dailyLoading, selectedChild]);

  const markAsUsed = async (type: 'drawing' | 'story' | 'game' = 'drawing') => {
    if (selectedChild) {
      // Call RPC to persist (Sprint 8.1)
      await supabase.rpc('rpc_mark_reward_used', {
        p_child_id: selectedChild.id,
        p_reward_type: type
      });
      
      // Keep localStorage as fallback/cache
      const today = new Date().toISOString().split('T')[0];
      const key = `creative_reward_used_${selectedChild.id}_${today}`;
      localStorage.setItem(key, 'true');
    }
  };

  // --- DRAWING MODULE HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setProcessingError({ message: 'Formato não suportado. Use JPG ou PNG.', code: 'INVALID_TYPE', canRetry: true });
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { 
        setProcessingError({ message: 'Imagem muito grande (>10MB).', code: 'FILE_TOO_LARGE', canRetry: true });
        return;
    }

    setProcessingError(null);
    setDrawingStep('processing'); // Show generic processing (compression)

    // Create object URL for immediate preview and processing
    const previewUrl = URL.createObjectURL(file);

    try {
      console.log(`[Upload] Original: ${file.size} bytes, type: ${file.type}`);
      
      // 2. Compression
      let finalData = '';
      let finalMime = file.type;
      let finalSize = file.size;
      let finalWidth = 0;
      let finalHeight = 0;

      try {
         // Pass object URL to compressor instead of file for better reliability
         // Note: compressAndResizeImage needs to support object URL or File
         // Current implementation takes File, so we pass File, but we could optimize.
         // For now, let's keep passing File as it works if implemented correctly with FileReader/Image
         const compressed = await compressAndResizeImage(file, 1600, 0.8);
         console.log(`[Upload] Compressed: ${compressed.sizeBytes} bytes, ${compressed.width}x${compressed.height}, mime: ${compressed.mime}`);
         finalData = compressed.dataUrl.split(',')[1];
         finalMime = compressed.mime;
         finalSize = compressed.sizeBytes;
         finalWidth = compressed.width;
         finalHeight = compressed.height;
      } catch (compressionError) {
         console.warn("[Upload] Compression failed, attempting fallback...", compressionError);
         
         // Fallback strategy: Use original if < 5MB, else abort
         if (file.size < 5 * 1024 * 1024) {
            console.log("[Upload] Using original file as fallback (Size OK).");
            // Read file as base64 for upload
            const reader = new FileReader();
            finalData = await new Promise<string>((resolve, reject) => {
               reader.onload = () => resolve((reader.result as string).split(',')[1]);
               reader.onerror = reject;
               reader.readAsDataURL(file);
            });
            finalMime = file.type;
            finalSize = file.size;
            // Width/Height unknown without loading image, but acceptable for fallback
         } else {
            throw new Error("Imagem original muito grande e falha na compressão.");
         }
      }

      setUploadedImage({
        data: finalData,
        mime: finalMime,
        size: finalSize,
        width: finalWidth,
        height: finalHeight,
        previewUrl: previewUrl // Use this for <img> src
      });
      setDrawingStep('upload'); // Ready to send
    } catch (e: any) {
      console.error("Image preparation failed", e);
      // Revoke preview URL if we failed completely
      URL.revokeObjectURL(previewUrl);
      
      const msg = e.message || 'Não conseguimos preparar essa foto. Tente outra imagem ou tire uma nova foto.';
      setProcessingError({ message: msg, code: 'PREP_FAIL', canRetry: true });
      setDrawingStep('intro');
    }
  };

  const handleProcessDrawing = async () => {
    if (!uploadedImage) return;
    setDrawingStep('processing');
    setProcessingError(null);

    try {
      console.log(`[Process] Sending to AI... Size: ${uploadedImage.size} bytes`);
      const result = await bringDrawingToLifeAI(uploadedImage.data, uploadedImage.mime, isPro);
      
      if (result.mode === 'story_only' && result.story) {
        setResultStory(result.story);
        setResultImage(null);
        setDrawingStep('result');
      } else if (result.url) {
        setResultImage(result.url);
        setResultStory(null);
        setDrawingStep('result');
      } else if (result.error) {
        throw result.error;
      } else {
        throw new Error('Falha desconhecida ao dar vida ao desenho.');
      }
    } catch (e: any) {
      console.error("[Process] Error:", e);
      const code = e.code || 'UNKNOWN';
      const msg = e.message || 'Ocorreu um erro ao processar. Tente novamente ou use outra foto.';
      const retry = e.canRetry !== undefined ? e.canRetry : true;
      
      setProcessingError({ message: msg, code, canRetry: retry });
      setDrawingStep('upload');
    }
  };

  const finishDrawingModule = () => {
    markAsUsed('drawing');
    setView('done');
  };

  const handleSaveToGallery = async () => {
    if (!resultImage || isSaved || !selectedChild) return;

    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      title: "Desenho que Ganhou Vida ✨",
      childId: selectedChild.id,
      childName: selectedChild.name,
      childAge: selectedChild.age,
      grade: selectedChild.grade,
      subject: Subject.ART,
      difficulty: Difficulty.EASY,
      pedagogicalObjective: "Atividade de criatividade e imaginação: Desenho que ganha vida.",
      questions: [],
      createdAt: new Date().toISOString(),
      imageUrl: resultImage,
      completed: true,
      score: 100
    };

    try {
      await saveToHistory(newExercise);
      setIsSaved(true);
    } catch (e) {
      console.error(e);
      alert('Erro ao salvar no histórico.');
    }
  };

  // --- STORY MODULE HANDLERS ---
  const handleChoice = (field: string, value: string) => {
    setChoices(prev => ({ ...prev, [field]: value }));
    if (wizardStep < 5) {
      setWizardStep(prev => prev + 1);
    }
  };

  const finalizeWizard = async () => {
    setStoryStep('generating');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !selectedChild) throw new Error('Usuário não autenticado');

      const story = await generateStoryAI({
        ...choices,
        childName: selectedChild?.name || 'Criança'
      });
      
      if (story) {
        // Auto-save to ensure persistence (1 call/day rule)
        const today = new Date().toISOString().split('T')[0];
        
        const { error } = await supabase.from('activity_completions').insert({
          parent_id: user.id,
          child_id: selectedChild.id,
          activity_id: crypto.randomUUID(),
          activity_type: 'story_of_the_day',
          completed_at: new Date(),
          completed_date: today,
          metadata: {
            type: 'story',
            completed: true,
            choices: choices,
            story: story,
            title: `A Aventura de ${choices.hero}`
          }
        });

        if (error) throw error;

        // Sprint 8A: Persist Story in StoryBook (The Book)
        await storyService.saveStory({
          child_id: selectedChild.id,
          title: `A Aventura de ${choices.hero}`,
          content: story,
          theme: choices.theme,
          metadata: choices
        });

        // Log Central de Histórico
        await historyService.logCreativeMission({
          title: `A Aventura de ${choices.hero}`,
          summary: `História sobre ${choices.theme} em ${choices.scenario}`,
          xp: 20,
          child_id: selectedChild.id,
          result_json: { story, choices },
          status: 'completed'
        });

        markAsUsed('story'); // Mark RPC and local storage
        setStoryContent(story);
        setStoryStep('reading');
      } else {
        throw new Error('Falha ao gerar história');
      }
    } catch (e) {
      console.error(e);
      alert('Ocorreu um erro mágico. Tente novamente!');
      setStoryStep('wizard');
    }
  };

  const handleBack = () => {
    if (wizardStep > 1) {
      setWizardStep(prev => prev - 1);
    } else {
      setView('selection');
    }
  };

  const finishStoryModule = () => {
    navigate('/dashboard');
  };

  // --- RENDERERS ---

  if (dailyLoading || !selectedChild) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="size-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-bold">Carregando Espaço Criativo...</p>
        </div>
      </div>
    );
  }

  if (view === 'locked') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="size-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
          <span className="material-symbols-outlined text-5xl">lock</span>
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900">Espaço Bloqueado</h1>
          <p className="text-gray-500 mt-2">Complete o Plano de Hoje para desbloquear sua recompensa!</p>
        </div>
        <button onClick={() => navigate('/plano-hoje')} className="px-8 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all">
          Ir para o Plano
        </button>
      </div>
    );
  }

  if (view === 'done') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
          <div className="size-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
              <span className="material-symbols-outlined text-5xl">check_circle</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 mb-2">Recompensa Resgatada!</h1>
          <p className="text-gray-500 mb-8">Você já usou sua recompensa de hoje. Amanhã tem mais 😊</p>
          <button 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-gray-100 rounded-xl font-bold text-gray-700 active:scale-95 transition-all"
          >
              Voltar ao Início
          </button>
      </div>
    );
  }

  // --- SELECTION VIEW ---
  if (view === 'selection') {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col">
        <header className="p-6 pt-8 flex items-center gap-4 border-b border-gray-100">
          <button onClick={() => navigate('/dashboard')} className="size-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-all">
             <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="font-black text-xl text-purple-600 uppercase tracking-wide">Espaço Criativo</h1>
        </header>

        <main className="flex-1 p-6 flex flex-col items-center max-w-md mx-auto w-full animate-fade-in">
          <div className="text-center mb-8">
             <h2 className="text-2xl font-black text-gray-900 mb-2">Parabéns! 🎉</h2>
             <p className="text-gray-600">Você desbloqueou o Espaço Criativo. Escolha <span className="font-bold text-purple-600">uma</span> recompensa para hoje:</p>
          </div>

          <div className="w-full space-y-4">
             {/* Module 1: Drawing */}
             <button 
               onClick={() => setView('drawing_life')}
               className="w-full bg-gradient-to-br from-purple-500 to-indigo-600 p-1 rounded-[2rem] shadow-xl group active:scale-95 transition-all"
             >
               <div className="bg-white dark:bg-surface-dark p-6 rounded-[1.8rem] h-full flex items-center gap-5">
                  <div className="size-16 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                     <span className="material-symbols-outlined text-3xl">auto_awesome</span>
                  </div>
                  <div className="text-left flex-1">
                     <h3 className="font-black text-lg text-gray-900">Dar Vida ao Desenho</h3>
                     <p className="text-xs text-gray-500 mt-1">Transforme seu desenho em um personagem digital mágico.</p>
                  </div>
               </div>
             </button>

             {/* Module 2: Story */}
             <button 
               onClick={() => {
                 setView('story_day');
                 setStoryStep('wizard');
                 setWizardStep(1);
                 setChoices({ hero: '', theme: '', scenario: '', challenge: '', ending: '' });
               }}
               className="w-full bg-gradient-to-br from-orange-400 to-pink-500 p-1 rounded-[2rem] shadow-xl group active:scale-95 transition-all"
             >
               <div className="bg-white dark:bg-surface-dark p-6 rounded-[1.8rem] h-full flex items-center gap-5">
                  <div className="size-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 group-hover:scale-110 transition-transform">
                     <span className="material-symbols-outlined text-3xl">menu_book</span>
                  </div>
                  <div className="text-left flex-1">
                     <h3 className="font-black text-lg text-gray-900">História do Dia</h3>
                     <p className="text-xs text-gray-500 mt-1">Uma história curta e especial criada para você.</p>
                  </div>
               </div>
             </button>

             {/* Module 3: Game Reward (Sprint 8B) */}
             {selectedChild.gameEnabled && (
               <button 
                 onClick={() => {
                   markAsUsed('game');
                   navigate('/hora-do-jogo');
                 }}
                 className="w-full bg-gradient-to-br from-green-400 to-teal-500 p-1 rounded-[2rem] shadow-xl group active:scale-95 transition-all"
               >
                 <div className="bg-white dark:bg-surface-dark p-6 rounded-[1.8rem] h-full flex items-center gap-5">
                    <div className="size-16 bg-green-100 rounded-2xl flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform">
                       <span className="material-symbols-outlined text-3xl">videogame_asset</span>
                    </div>
                    <div className="text-left flex-1">
                       <h3 className="font-black text-lg text-gray-900">Hora do Jogo</h3>
                       <p className="text-xs text-gray-500 mt-1">
                          Jogue por {selectedChild.gameTimeLimit || 5} minutos!
                       </p>
                    </div>
                 </div>
               </button>
             )}
          </div>
        </main>
      </div>
    );
  }

  // --- MODULE: DRAWING TO LIFE ---
  if (view === 'drawing_life') {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col">
        <header className="p-6 pt-8 flex items-center gap-4 border-b border-gray-100">
           <button onClick={() => setView('selection')} className="size-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-all">
             <span className="material-symbols-outlined">arrow_back</span>
           </button>
           <h1 className="font-black text-lg text-purple-600">Dar Vida ao Desenho</h1>
        </header>

        <main className="flex-1 p-6 flex flex-col items-center justify-center max-w-md mx-auto w-full">
           {drawingStep === 'intro' && (
              <div className="text-center space-y-8 animate-fade-in">
                 <img src="https://cdn-icons-png.flaticon.com/512/3081/3081329.png" alt="Criatividade" className="w-40 h-40 object-contain mx-auto" />
                 <div>
                    <h2 className="text-2xl font-black text-gray-900 mb-3">Prepare seu desenho</h2>
                    <p className="text-gray-600">Desenhe algo no papel, tire uma foto e veja a mágica acontecer!</p>
                 </div>
                 <button 
                   onClick={() => setDrawingStep('upload')}
                   className="w-full h-16 bg-purple-600 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                   <span className="material-symbols-outlined">photo_camera</span>
                   Começar
                 </button>
              </div>
           )}

           {drawingStep === 'upload' && (
              <div className="w-full space-y-6 animate-fade-in">
                 <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">Tire a foto</h2>
                 </div>
                 <label className={`w-full aspect-square border-4 border-dashed rounded-[3rem] flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden ${uploadedImage ? 'border-purple-500' : 'border-gray-200'}`}>
                    {uploadedImage ? (
                       <img 
                          src={uploadedImage.previewUrl} 
                          className="w-full h-full object-cover" 
                          alt="Preview"
                       />
                    ) : (
                       <span className="material-symbols-outlined text-6xl text-gray-300">add_a_photo</span>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                 </label>
                 
                 {processingError && (
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center mb-4 animate-fade-in">
                       <p className="text-red-600 font-bold mb-2">{processingError.message}</p>
                       <div className="flex justify-center gap-4">
                           {processingError.canRetry && (
                              <button 
                                 onClick={handleProcessDrawing}
                                 className="text-sm text-red-700 underline font-bold"
                              >
                                 Tentar Novamente
                              </button>
                           )}
                           <button 
                             onClick={() => { setUploadedImage(null); setProcessingError(null); }}
                             className="text-sm text-gray-500 underline"
                           >
                             Escolher outra foto
                           </button>
                       </div>
                    </div>
                 )}

                 <button 
                   onClick={handleProcessDrawing}
                   disabled={!uploadedImage}
                   className="w-full h-14 bg-purple-600 disabled:bg-gray-300 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all"
                 >
                   Dar Vida! ✨
                 </button>
              </div>
           )}

           {drawingStep === 'processing' && (
              <div className="text-center space-y-4 animate-pulse">
                 <div className="size-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto text-purple-500">
                    <span className="material-symbols-outlined text-4xl animate-spin">auto_awesome</span>
                 </div>
                 <p className="font-bold text-gray-600">Criando mágica...</p>
              </div>
           )}

           {drawingStep === 'result' && (resultImage || resultStory) && (
              <div className="w-full space-y-6 animate-fade-in text-center">
                 {resultImage ? (
                    <>
                        <h2 className="text-2xl font-black text-purple-600">Ficou Incrível!</h2>
                        <img src={resultImage} className="w-full rounded-[2rem] shadow-2xl border-4 border-white" alt="Resultado" />
                    </>
                 ) : (
                    <div className="bg-purple-50 p-6 rounded-[2rem] border-4 border-purple-100">
                        <div className="size-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-purple-500 shadow-sm">
                            <span className="material-symbols-outlined text-4xl">auto_stories</span>
                        </div>
                        <h2 className="text-xl font-black text-purple-600 mb-2">Desenho Mágico!</h2>
                        <p className="text-gray-600 mb-4">Hoje a mágica virou uma história especial do seu desenho ✨</p>
                        <p className="text-gray-800 font-medium text-lg italic">"{resultStory}"</p>
                    </div>
                 )}
                 
                 {!isPro && resultImage && (
                    <p className="text-xs text-gray-400 italic">
                        <span className="text-purple-500 font-bold cursor-pointer" onClick={() => setShowPaywall(true)}>Seja PRO</span> para ver em 3D!
                    </p>
                 )}

                 {resultImage && (
                    <p className="text-sm text-gray-500 font-bold animate-pulse">
                        Salve e compartilhe com a família ✨
                    </p>
                 )}

                 <div className="w-full">
                    <button 
                      onClick={finishDrawingModule}
                      className="w-full h-16 bg-green-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                    >
                      Concluir
                    </button>
                 </div>
              </div>
           )}
        </main>
        {showPaywall && <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />}
      </div>
    );
  }

  // --- MODULE: STORY OF THE DAY ---
   if (view === 'story_day') {
      const currentWizardStep = WIZARD_STEPS.find(s => s.id === wizardStep);

      return (
         <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col">
            <header className="p-6 pt-8 flex items-center gap-4 border-b border-gray-100">
              <button onClick={handleBack} className="size-10 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-all">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
              <h1 className="font-black text-lg text-orange-500">História do Dia</h1>
            </header>

            <main className="flex-1 p-6 flex flex-col max-w-md mx-auto w-full">
               {storyStep === 'wizard' && currentWizardStep && (
                  <div className="flex-1 flex flex-col animate-fade-in">
                     {/* Progress Bar */}
                     <div className="w-full h-2 bg-gray-100 rounded-full mb-8">
                        <div 
                           className="h-full bg-orange-500 rounded-full transition-all duration-500" 
                           style={{ width: `${(wizardStep / 5) * 100}%` }}
                        ></div>
                     </div>

                     <h2 className="text-2xl font-black text-gray-900 mb-6 text-center">{currentWizardStep.title}</h2>

                     <div className="flex-1 space-y-3">
                        {currentWizardStep.options.map((opt) => (
                           <button
                              key={opt}
                              onClick={() => handleChoice(currentWizardStep.field, opt)}
                              className={`w-full p-4 rounded-2xl border-2 font-bold text-left transition-all active:scale-95 ${
                                 // Highlight selection if we wanted to show it before auto-advance, but we auto-advance here.
                                 'border-gray-100 hover:border-orange-200 hover:bg-orange-50 text-gray-700'
                              }`}
                           >
                              {opt}
                           </button>
                        ))}
                     </div>

                     {wizardStep === 5 && (choices.ending) && (
                        <div className="mt-6">
                           <button 
                              onClick={finalizeWizard}
                              className="w-full h-16 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                           >
                              <span className="material-symbols-outlined">auto_awesome</span>
                              Gerar Minha História
                           </button>
                        </div>
                     )}
                  </div>
               )}

               {storyStep === 'generating' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 animate-pulse">
                     <div className="size-32 bg-orange-100 rounded-full flex items-center justify-center text-orange-500">
                        <span className="material-symbols-outlined text-6xl animate-spin">auto_awesome</span>
                     </div>
                     <div>
                        <h3 className="text-xl font-black text-orange-600">Escrevendo sua aventura...</h3>
                        <p className="text-gray-500">Juntando suas escolhas mágicas!</p>
                     </div>
                  </div>
               )}

               {storyStep === 'reading' && (
                  <div className="flex-1 flex flex-col animate-fade-in">
                     <div className="bg-orange-50 p-6 rounded-[2rem] space-y-4 shadow-inner flex-1 overflow-y-auto mb-4">
                        <div className="flex flex-wrap gap-2 justify-center mb-4">
                           {Object.values(choices).map((c, i) => (
                              <span key={i} className="px-2 py-1 bg-white/50 rounded-lg text-[10px] font-bold text-orange-800 uppercase tracking-wide">
                                 {c}
                              </span>
                           ))}
                        </div>
                        <h2 className="text-xl font-black text-orange-800 text-center">A Aventura de {choices.hero}</h2>
                        <p className="text-gray-700 leading-relaxed font-medium whitespace-pre-line text-lg">
                           {storyContent}
                        </p>
                     </div>
                     
                     <div className="flex flex-col gap-3">
                        <button 
                           disabled
                           className="w-full h-14 bg-orange-100 text-orange-400 font-bold rounded-2xl border-2 border-orange-200 flex items-center justify-center gap-2 cursor-default"
                        >
                           <span className="material-symbols-outlined">bookmark_added</span>
                           Sua história agora faz parte do seu livro 📖
                        </button>
                        <button 
                           onClick={finishStoryModule}
                           className="w-full h-16 bg-green-500 text-white font-black rounded-2xl shadow-lg active:scale-95 transition-all"
                        >
                           Concluir Leitura
                        </button>
                     </div>
                  </div>
               )}
            </main>
         </div>
      );
   }

  return null;
};

export default CreativeMissionPage;