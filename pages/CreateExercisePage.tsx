
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Subject, Difficulty, Objective, Exercise, ActivityFormat } from '../types';
import { generateExerciseAI } from '../services/geminiService';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';

interface Props {
  children: Child[];
  onSave: (exercise: Exercise) => Promise<Exercise | null | void>;
}

const CreateExercisePage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child | null>(() => children[0] ?? null);
  const [subject, setSubject] = useState<Subject>(Subject.MATH);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [objective, setObjective] = useState<Objective>(Objective.REINFORCE);
  const [selectedFormat, setSelectedFormat] = useState<ActivityFormat>('multipla');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (selectedChild) return;
    if (children.length === 0) return;
    setSelectedChild(children[0]);
  }, [children, selectedChild]);

  const handleGenerate = async (mode: 'start' | 'assign' = 'start') => {
    if (!selectedChild) {
      alert('Nenhum estudante selecionado.');
      return;
    }

    if (!Entitlements.canPerformAction('exercicio_facil_per_day_limit')) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    console.log('[CreateExercise] Generando com formato:', selectedFormat);
    try {
      // 1. Payload obrigatório para backend/IA
      const payload = {
        childName: selectedChild.name,
        age: selectedChild.age,
        grade: selectedChild.grade,
        subject,
        difficulty,
        objective,
        questionCount,
        format: selectedFormat
      };
      
      console.log('[CreateExercise] Payload enviado:', payload);
      
      const exercise = await generateExerciseAI(payload);
      
      // 2. Salvar junto no registro do exercício
      const exercisePayload: Exercise = { 
        ...exercise, 
        childId: selectedChild.id,
        selectedFormat, // Campo obrigatório salvo
        type: selectedFormat // Garantir type também
      };
      
      const savedExercise = await onSave(exercisePayload);

      Entitlements.trackAction('exercicio_facil_per_day_limit');

      if (savedExercise && 'id' in savedExercise) {
        navigate(`/exercicio-facil/resultado/${savedExercise.id}`);
      } else {
        navigate(`/exercicio-facil/resultado/${exercise.id}`);
      }
    } catch (error) {
      console.error(error);
      alert('Tivemos um problema. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-primary/5">
        <div className="relative size-32 mb-8">
           <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-4xl animate-bounce">auto_awesome</span>
           </div>
        </div>
        <h2 className="text-2xl font-black mb-4">Criando seu exercício...</h2>
        <p className="text-text-sub text-sm italic">Preparando {questionCount} questões no nível {difficulty.toLowerCase()}...</p>
      </div>
    );
  }

  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-primary/5">
        <h2 className="text-2xl font-black mb-3">Nenhum estudante encontrado</h2>
        <p className="text-text-sub text-sm font-bold mb-10">Cadastre um estudante para gerar atividades.</p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all"
          >
            Ir para Configurações
          </button>
          <button
            onClick={() => navigate('/exercicio-facil')}
            className="w-full h-14 bg-white/70 dark:bg-gray-800 font-black rounded-2xl active:scale-95 transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {showPaywall && (
        <PaywallModal 
          isOpen={showPaywall} 
          onClose={() => setShowPaywall(false)} 
        />
      )}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center justify-between p-4 max-w-3xl mx-auto w-full">
          <button onClick={() => navigate('/exercicio-facil')} className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h2 className="text-lg font-bold">Personalizar Atividade</h2>
          <div className="size-10"></div>
        </div>
      </header>

      <main className="p-6 space-y-8 pb-40 flex-1 overflow-y-auto no-scrollbar max-w-3xl mx-auto w-full">
        <section>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3">Estudante</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {children.map(child => (
              <button 
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`flex flex-col items-center gap-2 shrink-0 transition-all ${selectedChild?.id === child.id ? 'scale-105' : 'opacity-40 grayscale'}`}
              >
                <div className={`size-16 rounded-2xl border-2 p-1 overflow-hidden ${selectedChild?.id === child.id ? 'border-primary bg-primary/10' : 'border-transparent'}`}>
                  <img src={child.avatar} alt={child.name} className="w-full h-full object-cover rounded-xl" />
                </div>
                <span className="text-xs font-bold">{child.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Matéria</p>
          <div className="grid grid-cols-2 gap-3">
            {Object.values(Subject).map(sub => (
              <button 
                key={sub}
                onClick={() => setSubject(sub)}
                className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${subject === sub ? 'border-primary bg-primary/10' : 'border-gray-100 dark:border-gray-800'}`}
              >
                <span className="material-symbols-outlined text-lg">{sub === Subject.MATH ? 'calculate' : 'book'}</span>
                <span className="text-sm font-bold">{sub}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Formato das Questões</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'multipla', label: 'Múltipla Escolha' },
              { key: 'dissertativa', label: 'Dissertativa' },
              { key: 'mista', label: 'Mista' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSelectedFormat(opt.key as ActivityFormat)}
                className={`py-4 rounded-2xl border-2 transition-all text-xs font-black uppercase tracking-widest ${
                  selectedFormat === opt.key ? 'border-primary bg-primary/10 text-primary' : 'border-gray-100 dark:border-gray-800 text-text-sub'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Quantidade de Questões</p>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            {[3, 5, 10].map(count => (
              <button 
                key={count}
                onClick={() => setQuestionCount(count)}
                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${questionCount === count ? 'bg-white dark:bg-surface-dark text-primary shadow-sm' : 'text-gray-400'}`}
              >
                {count} Questões
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Dificuldade</p>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            {Object.values(Difficulty).map(diff => (
              <button 
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all ${difficulty === diff ? 'bg-primary text-black shadow-md' : 'text-gray-400'}`}
              >
                {diff}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-primary tracking-widest">Objetivo</p>
          <div className="space-y-2">
            {Object.values(Objective).map(obj => (
              <button 
                key={obj}
                onClick={() => setObjective(obj)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${objective === obj ? 'border-primary bg-primary/10' : 'border-gray-100 dark:border-gray-800'}`}
              >
                <div className="flex flex-col items-start text-left">
                  <span className="text-sm font-bold capitalize">{obj} conteúdo</span>
                </div>
                {objective === obj && <span className="material-symbols-outlined text-primary">check_circle</span>}
              </button>
            ))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent pt-10 pb-6 px-6">
        <div className="max-w-3xl mx-auto w-full flex flex-col gap-3">
          <button 
            onClick={() => handleGenerate('assign')}
            className="w-full h-14 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-white font-black text-lg rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">assignment_add</span>
            Atribuir para Depois
          </button>
          <button 
            onClick={() => handleGenerate('start')}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined">play_circle</span>
            Gerar e Iniciar Agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateExercisePage;
