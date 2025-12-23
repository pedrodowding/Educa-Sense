
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Exercise, Difficulty } from '../types';
import { generateArtsExerciseAI } from '../services/geminiService';

interface Props {
  children: Child[];
  onSave: (exercise: Exercise) => void;
}

const ArtesCriativasPage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child>(children[0]);
  const [theme, setTheme] = useState('Fantasia');
  const [materials, setMaterials] = useState('Papel e lápis');
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
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

  if (loading) return <LoadingScreen />;

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-2xl font-black text-purple-400">Artes Criativas</h1>
      </header>
      <main className="p-6 space-y-8 pb-32">
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
            className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold mb-3"
            value={theme}
            onChange={e => setTheme(e.target.value)}
          />
          <input 
            type="text" 
            placeholder="Materiais disponíveis..."
            className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold"
            value={materials}
            onChange={e => setMaterials(e.target.value)}
          />
        </section>
      </main>
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white dark:from-background-dark to-transparent">
        <button onClick={handleGenerate} className="w-full h-16 bg-purple-400 text-white font-black rounded-2xl shadow-glow">
          Gerar Missão Artística
        </button>
      </div>
    </div>
  );
};

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-purple-50">
    <span className="material-symbols-outlined text-purple-400 text-6xl animate-bounce mb-6">palette</span>
    <h2 className="text-2xl font-black text-purple-800">Preparando sua tela...</h2>
  </div>
);

export default ArtesCriativasPage;
