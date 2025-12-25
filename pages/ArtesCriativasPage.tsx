
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Exercise, Difficulty, Subject } from '../types';
import { generateArtsExerciseAI, generateColoringPageAI, transformPhotoToColoringAI } from '../services/geminiService';

interface Props {
  children: Child[];
  onSave: (exercise: Exercise) => void;
}

type WorkMode = 'menu' | 'mission' | 'text2color' | 'img2color' | 'result';

const ArtesCriativasPage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<WorkMode>('menu');
  const [selectedChild] = useState<Child>(children[0]);
  
  // States para Missão
  const [theme, setTheme] = useState('Fantasia');
  const [materials, setMaterials] = useState('Papel e lápis');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [questionCount, setQuestionCount] = useState<number>(3);
  
  // States para Colorir
  const [coloringPrompt, setColoringPrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<{data: string, mime: string} | null>(null);
  
  // State de resultado gerado
  const [generatedImg, setGeneratedImg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSavedInGallery, setIsSavedInGallery] = useState(false);

  const checkApiKeyAndRun = async (fn: () => Promise<void>) => {
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    }
    await fn();
  };

  const handleGenerateMission = async () => {
    setLoading(true);
    try {
      const exercise = await generateArtsExerciseAI({
        childName: selectedChild.name,
        age: selectedChild.age,
        grade: selectedChild.grade,
        theme,
        materials,
        difficulty,
        questionCount
      });
      onSave(exercise);
      navigate(`/exercicio-facil/resultado/${exercise.id}`);
    } catch (e) {
      alert('Erro ao gerar missão artística.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromText = async () => {
    if (!coloringPrompt) return alert('Descreva o que quer desenhar!');
    setLoading(true);
    setIsSavedInGallery(false);
    try {
      await checkApiKeyAndRun(async () => {
        const img = await generateColoringPageAI(coloringPrompt);
        if (img) {
          setGeneratedImg(img);
          setMode('result');
        }
      });
    } catch (e) {
      alert('Erro ao gerar desenho.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedImage({
          data: (reader.result as string).split(',')[1],
          mime: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTransformPhoto = async () => {
    if (!uploadedImage) return alert('Selecione uma foto primeiro!');
    setLoading(true);
    setIsSavedInGallery(false);
    try {
      await checkApiKeyAndRun(async () => {
        const img = await transformPhotoToColoringAI(uploadedImage.data, uploadedImage.mime);
        if (img) {
          setGeneratedImg(img);
          setMode('result');
        }
      });
    } catch (e) {
      alert('Erro ao transformar foto.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!generatedImg) return;
    const link = document.createElement('a');
    link.href = generatedImg;
    link.download = `educasense-colorir-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveToGallery = () => {
    if (!generatedImg || isSavedInGallery) return;

    const newExercise: Exercise = {
      id: Math.random().toString(36).substr(2, 9),
      title: coloringPrompt || "Desenho Mágico para Colorir",
      childId: selectedChild.id,
      childName: selectedChild.name,
      childAge: selectedChild.age,
      grade: selectedChild.grade,
      subject: Subject.ART,
      difficulty: Difficulty.EASY,
      pedagogicalObjective: "Atividade de artes e criatividade através do desenho.",
      questions: [],
      createdAt: new Date().toISOString(),
      imageUrl: generatedImg,
      completed: true
    };

    onSave(newExercise);
    setIsSavedInGallery(true);
    alert('Desenho salvo com sucesso! Você pode encontrá-lo no histórico de atividades do aluno.');
  };

  const handleReset = () => {
    setGeneratedImg(null);
    setUploadedImage(null);
    setColoringPrompt('');
    setIsSavedInGallery(false);
    setMode('menu');
  };

  const handleExit = () => {
    navigate('/programas');
  };

  const goToHome = () => {
    navigate('/dashboard');
  };

  if (loading) return <LoadingScreen mode={mode} />;

  if (mode === 'result' && generatedImg) {
    return (
      <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
        {/* Header fixo no topo com botões de navegação claros */}
        <header className="p-6 pt-10 flex items-center justify-between no-print border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-md sticky top-0 z-40">
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-gray-100 dark:bg-gray-800 font-bold text-sm active:scale-95 transition-all">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Novo
          </button>
          <h2 className="text-lg font-black text-purple-400">Desenho Mágico</h2>
          <button onClick={goToHome} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-95">
            <span className="material-symbols-outlined">home</span>
          </button>
        </header>

        {/* Conteúdo Central Rolável */}
        <main className="p-6 flex flex-col items-center flex-1 overflow-y-auto no-scrollbar pb-32 animate-fade-in">
           <div className="w-full max-w-sm bg-white border-4 border-purple-50 dark:border-gray-800 p-4 rounded-[48px] shadow-soft mb-10">
              <img src={generatedImg} alt="Desenho gerado" className="w-full h-auto rounded-[32px] shadow-sm" />
              <div className="mt-6 text-center">
                 <p className="text-[10px] font-black uppercase text-purple-300 tracking-[3px]">Atividade de Colorir</p>
                 <p className="text-xs text-text-sub mt-1">Gere, imprima e divirta-se!</p>
              </div>
           </div>

           {/* Ações da Arte - Integradas no scroll acima do BottomNav */}
           <div className="w-full max-w-sm space-y-4 no-print pb-20">
              <div className="grid grid-cols-2 gap-4">
                 <button 
                  onClick={handleSaveToGallery}
                  className={`h-24 rounded-3xl font-black flex flex-col items-center justify-center gap-1 shadow-soft transition-all active:scale-95 ${isSavedInGallery ? 'bg-green-500 text-white' : 'bg-white border-4 border-purple-50 text-purple-500'}`}
                 >
                    <span className="material-symbols-outlined text-3xl">{isSavedInGallery ? 'cloud_done' : 'bookmark_add'}</span>
                    <span className="text-[10px] uppercase">{isSavedInGallery ? 'Salvo na Galeria' : 'Salvar na Galeria'}</span>
                 </button>
                 
                 <button 
                  onClick={handlePrint}
                  className="h-24 bg-purple-400 text-white rounded-3xl font-black flex flex-col items-center justify-center gap-1 shadow-glow active:scale-95 transition-all"
                 >
                    <span className="material-symbols-outlined text-3xl">print</span>
                    <span className="text-[10px] uppercase">Imprimir Agora</span>
                 </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleDownload}
                  className="h-16 bg-gray-100 dark:bg-gray-800 text-text-sub font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">download</span>
                  <span className="text-[10px] uppercase tracking-widest">Baixar PNG</span>
                </button>
                <button 
                  onClick={handleReset}
                  className="h-16 bg-purple-50 dark:bg-purple-900/10 text-purple-400 font-black rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">auto_fix_high</span>
                  <span className="text-[10px] uppercase tracking-widest">Criar Outro</span>
                </button>
              </div>
           </div>
        </main>

        {/* Layout Otimizado para Impressão */}
        <div className="print-only fixed inset-0 bg-white z-[1000] p-10 flex flex-col items-center justify-between">
           <div className="w-full flex justify-between items-center border-b-2 border-gray-100 pb-4">
              <div>
                 <h1 className="text-xl font-black uppercase text-purple-400 tracking-widest">Atividade de Artes</h1>
                 <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Educa Sense - Artes Criativas</p>
              </div>
              <div className="size-12 bg-black text-white flex items-center justify-center font-black rounded-xl">ES</div>
           </div>

           <img src={generatedImg} alt="Desenho para Colorir" className="w-full h-auto max-h-[75vh] object-contain" />

           <div className="w-full grid grid-cols-2 gap-8 pt-8 border-t-2 border-gray-100">
              <div className="border-b border-gray-400 pb-1">
                 <span className="text-[8px] font-black uppercase text-gray-400">Aluno(a):</span>
                 <p className="font-bold text-sm ml-2">{selectedChild.name}</p>
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

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => mode === 'menu' ? handleExit() : setMode('menu')} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-95">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-2xl font-black text-purple-400">Artes Criativas</h1>
        </div>
        <button onClick={goToHome} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-95">
          <span className="material-symbols-outlined text-text-sub">home</span>
        </button>
      </header>

      <main className="p-6 space-y-6 flex-1 pb-32">
        {mode === 'menu' && (
          <div className="grid grid-cols-1 gap-4 animate-fade-in">
             <MenuCard 
               icon="draw" 
               title="Estúdio de Desenhos" 
               desc="Descreva qualquer coisa e a IA gera um desenho para colorir."
               onClick={() => setMode('text2color')}
             />
             <MenuCard 
               icon="add_a_photo" 
               title="Transformação Mágica" 
               desc="Transforme uma foto da família em desenho de colorir."
               onClick={() => setMode('img2color')}
             />
             <MenuCard 
               icon="explore" 
               title="Missão Criativa" 
               desc="Desafios e passos guiados para atividades manuais."
               onClick={() => setMode('mission')}
             />
          </div>
        )}

        {mode === 'text2color' && (
          <div className="space-y-8 animate-fade-in">
             <div className="space-y-3">
               <p className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">O que vamos desenhar?</p>
               <textarea 
                 placeholder="Ex: Um castelo de doces com dragões amigáveis no céu..."
                 className="w-full h-32 bg-gray-50 dark:bg-gray-800 border-none rounded-3xl p-6 font-bold text-lg resize-none focus:ring-2 focus:ring-purple-400 transition-all"
                 value={coloringPrompt}
                 onChange={e => setColoringPrompt(e.target.value)}
               />
             </div>
             <button onClick={handleGenerateFromText} className="w-full h-16 bg-purple-400 text-white font-black rounded-2xl shadow-glow active:scale-95 transition-all">
               Gerar Desenho Mágico
             </button>
          </div>
        )}

        {mode === 'img2color' && (
          <div className="space-y-8 animate-fade-in">
             <div className="space-y-4">
                <p className="text-[10px] font-black uppercase text-text-sub tracking-widest text-center">Suba uma foto para transformar</p>
                <label className="w-full h-64 border-4 border-dashed border-gray-100 dark:border-gray-800 rounded-[40px] flex flex-col items-center justify-center gap-4 cursor-pointer relative overflow-hidden group hover:border-purple-200 transition-all">
                   {uploadedImage ? (
                     <img src={`data:${uploadedImage.mime};base64,${uploadedImage.data}`} className="w-full h-full object-cover opacity-50" alt="Upload" />
                   ) : (
                     <span className="material-symbols-outlined text-gray-200 text-6xl group-hover:text-purple-400 transition-colors">upload_file</span>
                   )}
                   <span className="font-black text-sm text-text-sub absolute">{uploadedImage ? 'Trocar Foto' : 'Escolher Foto'}</span>
                   <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                </label>
             </div>
             <button 
               onClick={handleTransformPhoto} 
               disabled={!uploadedImage}
               className="w-full h-16 bg-purple-400 disabled:opacity-50 text-white font-black rounded-2xl shadow-glow active:scale-95 transition-all"
             >
               Transformar em Desenho
             </button>
          </div>
        )}

        {mode === 'mission' && (
          <div className="space-y-8 animate-fade-in">
            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Configurações do Desafio</p>
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase ml-1 opacity-50">Nível</label>
                    <select 
                      value={difficulty} 
                      onChange={e => setDifficulty(e.target.value as Difficulty)}
                      className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
                    >
                       {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[8px] font-black uppercase ml-1 opacity-50">Etapas</label>
                    <select 
                      value={questionCount} 
                      onChange={e => setQuestionCount(parseInt(e.target.value))}
                      className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
                    >
                       <option value={3}>3 Passos</option>
                       <option value={5}>5 Passos</option>
                    </select>
                 </div>
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Tema e Materiais</p>
              <input 
                type="text" 
                placeholder="Tema da arte..."
                className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold mb-3 focus:ring-2 focus:ring-purple-200"
                value={theme}
                onChange={e => setTheme(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Materiais disponíveis..."
                className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-purple-200"
                value={materials}
                onChange={e => setMaterials(e.target.value)}
              />
            </section>
            
            <button onClick={handleGenerateMission} className="w-full h-16 bg-purple-400 text-white font-black rounded-2xl shadow-glow active:scale-95 transition-all">
              Gerar Missão Artística
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

const MenuCard = ({ icon, title, desc, onClick }: { icon: string, title: string, desc: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full text-left p-6 bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 rounded-[32px] shadow-soft flex items-center gap-5 active:scale-95 transition-all hover:bg-purple-50"
  >
     <div className="size-16 rounded-2xl bg-purple-50 text-purple-400 flex items-center justify-center">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
     </div>
     <div className="flex-1">
        <h3 className="font-black text-lg">{title}</h3>
        <p className="text-xs text-text-sub leading-snug">{desc}</p>
     </div>
  </button>
);

const LoadingScreen = ({ mode }: { mode: WorkMode }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-purple-50">
    <div className="relative size-32 mb-8">
       <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
       <div className="absolute inset-0 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
       <span className="material-symbols-outlined text-purple-400 text-6xl absolute inset-0 flex items-center justify-center">
         {mode === 'text2color' ? 'draw' : mode === 'img2color' ? 'magic_button' : 'palette'}
       </span>
    </div>
    <h2 className="text-2xl font-black text-purple-800">A mágica está acontecendo...</h2>
    <p className="text-purple-600 mt-2 italic">Criando traços artísticos perfeitos!</p>
  </div>
);

export default ArtesCriativasPage;
