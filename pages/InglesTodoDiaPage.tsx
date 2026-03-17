
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Exercise, Difficulty } from '../types';
import { generateEnglishExerciseAI } from '../services/geminiService';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';

interface Props {
  children: Child[];
  onSave: (exercise: Exercise) => Promise<Exercise | null | void>;
}

type QuestionMode = 'multiple' | 'open' | 'mixed';

const InglesTodoDiaPage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child | null>(() => children[0] ?? null);
  const [theme, setTheme] = useState('Cores e Números');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('multiple');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (selectedChild) return;
    if (children.length === 0) return;
    setSelectedChild(children[0]);
  }, [children, selectedChild]);

  const handleGenerate = async () => {
    if (!selectedChild) {
      alert('Nenhum estudante selecionado.');
      return;
    }

    if (!Entitlements.canPerformAction('ingles_todo_dia_per_day_limit')) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    try {
      const exercise = await generateEnglishExerciseAI({
        childName: selectedChild.name,
        age: selectedChild.age,
        grade: selectedChild.grade,
        theme,
        difficulty,
        questionCount,
        questionMode
      });
      const savedExercise = await onSave({ ...exercise, childId: selectedChild.id });
      
      Entitlements.trackAction('ingles_todo_dia_per_day_limit');

      if (savedExercise && 'id' in savedExercise) {
        navigate(`/exercicio-facil/resultado/${savedExercise.id}`);
      } else {
        navigate(`/exercicio-facil/resultado/${exercise.id}`);
      }
    } catch (e) {
      alert('Erro ao gerar vocabulário.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen />;

  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-orange-50">
        <h2 className="text-2xl font-black text-orange-800 mb-3">Nenhum estudante encontrado</h2>
        <p className="text-sm font-bold text-orange-700/80 mb-10">Cadastre um estudante para gerar atividades.</p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full h-16 bg-orange-400 text-white font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all"
          >
            Ir para Configurações
          </button>
          <button
            onClick={() => navigate(-1)}
            className="w-full h-14 bg-white/80 font-black rounded-2xl active:scale-95 transition-all"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
      {showPaywall && (
        <PaywallModal 
          isOpen={showPaywall} 
          onClose={() => setShowPaywall(false)} 
        />
      )}
      <header className="p-6 pt-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black text-orange-400">Inglês Todo Dia</h1>
      </header>
      <main className="p-6 space-y-8 pb-32">
        <section className="space-y-4">
          <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Configurar Vocabulário</p>
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-1 opacity-50">Desafio</label>
                <select 
                  value={difficulty} 
                  onChange={e => setDifficulty(e.target.value as Difficulty)}
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
                >
                   {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
             </div>
             <div className="space-y-1">
                <label className="text-[8px] font-black uppercase ml-1 opacity-50">Quantidade</label>
                <select 
                  value={questionCount} 
                  onChange={e => setQuestionCount(parseInt(e.target.value))}
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
                >
                   <option value={5}>5 Palavras</option>
                   <option value={10}>10 Palavras</option>
                </select>
             </div>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Formato</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'multiple', label: 'Múltipla' },
              { key: 'open', label: 'Dissert.' },
              { key: 'mixed', label: 'Mista' }
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setQuestionMode(opt.key as QuestionMode)}
                className={`h-14 rounded-2xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                  questionMode === opt.key ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100 dark:border-gray-800 text-text-sub'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Tema</p>
          <div className="grid grid-cols-1 gap-3">
            {['Cores e Números', 'Animais', 'Família', 'Comida'].map(t => (
              <button 
                key={t}
                onClick={() => setTheme(t)}
                className={`p-5 rounded-2xl border-2 text-left font-bold transition-all flex justify-between items-center ${theme === t ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-gray-100'}`}
              >
                {t}
                {theme === t && <span className="material-symbols-outlined text-orange-400">check_circle</span>}
              </button>
            ))}
          </div>
        </section>
      </main>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-background-dark to-transparent">
        <button onClick={handleGenerate} className="w-full h-16 bg-orange-400 text-white font-black rounded-2xl shadow-glow">
          Gerar {questionCount} Flashcards
        </button>
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-orange-50">
    <span className="material-symbols-outlined text-orange-400 text-6xl animate-pulse mb-6">language</span>
    <h2 className="text-2xl font-black text-orange-800">Traveling across the ocean...</h2>
  </div>
);

export default InglesTodoDiaPage;
