
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, Subject, Difficulty, Objective, Exercise } from '../types';
import { generateExerciseAI } from '../services/geminiService';

interface Props {
  children: Child[];
  onSave: (exercise: Exercise) => void;
}

const CreateExercisePage: React.FC<Props> = ({ children, onSave }) => {
  const navigate = useNavigate();
  const [selectedChild, setSelectedChild] = useState<Child>(children[0]);
  const [subject, setSubject] = useState<Subject>(Subject.MATH);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  const [objective, setObjective] = useState<Objective>(Objective.REINFORCE);
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const exercise = await generateExerciseAI({
        childName: selectedChild.name,
        age: selectedChild.age,
        grade: selectedChild.grade,
        subject,
        difficulty,
        objective,
        questionCount
      });
      onSave(exercise);
      navigate(`/exercicio-facil/resultado/${exercise.id}`);
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

  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 dark:bg-background-dark/80 backdrop-blur-md p-4 shadow-sm">
        <button onClick={() => navigate('/exercicio-facil')} className="size-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <span className="material-symbols-outlined">close</span>
        </button>
        <h2 className="text-lg font-bold">Personalizar Atividade</h2>
        <div className="size-10"></div>
      </header>

      <main className="p-6 space-y-8 pb-40 flex-1 overflow-y-auto no-scrollbar">
        <section>
          <p className="text-[10px] font-black uppercase text-primary tracking-widest mb-3">Estudante</p>
          <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
            {children.map(child => (
              <button 
                key={child.id}
                onClick={() => setSelectedChild(child)}
                className={`flex flex-col items-center gap-2 shrink-0 transition-all ${selectedChild.id === child.id ? 'scale-105' : 'opacity-40 grayscale'}`}
              >
                <div className={`size-16 rounded-2xl border-2 p-1 overflow-hidden ${selectedChild.id === child.id ? 'border-primary bg-primary/10' : 'border-transparent'}`}>
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

      <div className="fixed bottom-0 left-0 right-0 p-6 pt-10 max-w-md mx-auto z-40 bg-gradient-to-t from-background-light dark:from-background-dark via-background-light dark:via-background-dark to-transparent">
        <button 
          onClick={handleGenerate}
          className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          Gerar Exercício
        </button>
      </div>
    </div>
  );
};

export default CreateExercisePage;
