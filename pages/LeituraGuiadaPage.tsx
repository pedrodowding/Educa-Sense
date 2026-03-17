
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Exercise, Difficulty } from '../types';
import { generateReadingExerciseAI } from '../services/geminiService';
import { Entitlements } from '../billing/entitlements';
import { PaywallModal } from '../components/PaywallModal';

interface Props {
  children: Child[];
  onSave: (exercise: Exercise) => Promise<Exercise | null | void>;
}

type QuestionMode = 'multiple' | 'open' | 'mixed';

const LeituraGuiadaPage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child | null>(() => children[0] ?? null);
  const [interest, setInterest] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [questionMode, setQuestionMode] = useState<QuestionMode>('multiple');
  const [questionCount, setQuestionCount] = useState<number>(3);
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
    if (!interest) return alert('Digite um tema!');

    if (!Entitlements.canPerformAction('leitura_guiada_per_day_limit')) {
      setShowPaywall(true);
      return;
    }

    setLoading(true);
    try {
      const exercise = await generateReadingExerciseAI({
        childName: selectedChild.name,
        age: selectedChild.age,
        grade: selectedChild.grade,
        interest,
        difficulty,
        questionCount,
        questionMode
      });
      const savedExercise = await onSave({ ...exercise, childId: selectedChild.id });
      
      Entitlements.trackAction('leitura_guiada_per_day_limit');

      if (savedExercise && 'id' in savedExercise) {
        navigate(`/leitura-guiada/resultado/${savedExercise.id}`);
      } else {
        navigate(`/leitura-guiada/resultado/${exercise.id}`);
      }
    } catch (e) {
      alert('Erro ao gerar história.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen count={questionCount} />;

  if (!selectedChild) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-blue-50">
        <h2 className="text-2xl font-black text-blue-800 mb-3">Nenhum estudante encontrado</h2>
        <p className="text-sm font-bold text-blue-700/80 mb-10">Cadastre um estudante para gerar atividades.</p>
        <div className="w-full max-w-sm space-y-3">
          <button
            onClick={() => navigate('/settings')}
            className="w-full h-16 bg-blue-400 text-white font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all"
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
        <h1 className="text-2xl font-black text-blue-400">Leitura Guiada</h1>
      </header>
      <main className="p-6 space-y-8 pb-32">
        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Tema da História</p>
          <input 
            type="text" 
            placeholder="Ex: Viagem à Marte, Vida Marinha..."
            className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold"
            value={interest}
            onChange={e => setInterest(e.target.value)}
          />
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Nível e Quantidade</p>
          <div className="grid grid-cols-2 gap-4">
             <select 
               value={difficulty} 
               onChange={e => setDifficulty(e.target.value as Difficulty)}
               className="h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
             >
                {Object.values(Difficulty).map(d => <option key={d} value={d}>{d}</option>)}
             </select>
             <select 
               value={questionCount} 
               onChange={e => setQuestionCount(parseInt(e.target.value))}
               className="h-14 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none font-bold text-sm"
             >
                <option value={3}>3 Perguntas</option>
                <option value={5}>5 Perguntas</option>
                <option value={10}>10 Perguntas</option>
             </select>
          </div>
        </section>

        <section className="space-y-3">
          <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">Formato das Perguntas</p>
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
                  questionMode === opt.key ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-100 dark:border-gray-800 text-text-sub'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      </main>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-background-dark to-transparent">
        <button onClick={handleGenerate} className="w-full h-16 bg-blue-400 text-white font-black rounded-2xl shadow-glow active:scale-95 transition-all">
          Gerar História com {questionCount} Perguntas
        </button>
      </div>
    </div>
  );
};

const LoadingScreen = ({ count }: { count: number }) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-blue-50">
    <span className="material-symbols-outlined text-blue-400 text-6xl animate-spin mb-6">menu_book</span>
    <h2 className="text-2xl font-black text-blue-800">Criando sua jornada...</h2>
    <p className="text-blue-600 mt-2 italic">Escrevendo e preparando {count} desafios!</p>
  </div>
);

export default LeituraGuiadaPage;
