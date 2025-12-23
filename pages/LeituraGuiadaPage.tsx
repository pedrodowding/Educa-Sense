
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Exercise, Difficulty } from '../types';
import { generateReadingExerciseAI } from '../services/geminiService';

interface Props {
  children: Child[];
  onSave: (exercise: Exercise) => void;
}

const LeituraGuiadaPage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child>(children[0]);
  const [interest, setInterest] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!interest) return alert('Digite um tema!');
    setLoading(true);
    try {
      const exercise = await generateReadingExerciseAI({
        childName: selectedChild.name,
        age: selectedChild.age,
        grade: selectedChild.grade,
        interest,
        difficulty,
        questionCount
      });
      onSave(exercise);
      navigate(`/exercicio-facil/resultado/${exercise.id}`);
    } catch (e) {
      alert('Erro ao gerar história.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingScreen count={questionCount} />;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
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
