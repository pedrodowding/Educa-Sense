
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exercise, Child } from '../types';

interface Props {
  history: Exercise[];
  onUpdate: (id: string, updates: Partial<Exercise>) => void;
  children: Child[];
  onUpdateChild: (id: string, updates: Partial<Child>) => void;
}

const QuizPage: React.FC<Props> = ({ history, onUpdate, children, onUpdateChild }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const exercise = history.find(e => e.id === id);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showResult, setShowResult] = useState(false);

  if (!exercise) return null;

  const currentQuestion = exercise.questions[currentIdx];

  const handleConfirm = () => {
    if (isAnswered) {
      if (currentIdx + 1 < exercise.questions.length) {
        setCurrentIdx(prev => prev + 1);
        setSelectedOption(null);
        setIsAnswered(false);
      } else {
        const finalScore = (correctAnswers / exercise.questions.length) * 10;
        onUpdate(exercise.id, { score: finalScore, completed: true });
        
        // Atualiza Gamificação da Criança
        const child = children.find(c => c.name === exercise.childName);
        if (child) {
          onUpdateChild(child.id, {
            xp: child.xp + (correctAnswers * 10),
            stars: child.stars + Math.floor(correctAnswers / 2),
            streak: child.streak + 1
          });
        }
        setShowResult(true);
      }
    } else {
      if (!selectedOption) return;
      if (selectedOption === currentQuestion.correctAnswer || selectedOption === 'manual-correct') {
        setCorrectAnswers(prev => prev + 1);
      }
      setIsAnswered(true);
    }
  };

  if (showResult) {
    const finalScore = (correctAnswers / exercise.questions.length) * 10;
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white dark:bg-background-dark">
        <div className="size-40 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative animate-bounce">
           <span className="material-symbols-outlined text-primary text-6xl filled">workspace_premium</span>
           <div className="absolute -top-2 -right-2 bg-primary text-black size-12 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">
              {finalScore.toFixed(0)}
           </div>
        </div>
        <h2 className="text-4xl font-black mb-4">UAU!</h2>
        <p className="text-text-sub mb-2">Você brilhou muito nesta aventura!</p>
        <div className="flex gap-4 mb-10">
           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-primary uppercase">XP Ganhos</p>
              <p className="text-xl font-black">+{correctAnswers * 10}</p>
           </div>
           <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <p className="text-[10px] font-black text-yellow-500 uppercase">Estrelas</p>
              <p className="text-xl font-black">+{Math.floor(correctAnswers / 2)}</p>
           </div>
        </div>
        
        <div className="w-full space-y-3">
          <button 
            onClick={() => navigate('/student')}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-background-dark">
      <header className="p-4 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="size-10 flex items-center justify-center rounded-full bg-white dark:bg-surface-dark shadow-sm">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <span className="bg-primary/10 px-4 py-1.5 rounded-full text-[10px] font-black text-primary uppercase tracking-widest">Aventura de {exercise.subject}</span>
          <div className="size-10"></div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500 shadow-glow" 
              style={{ width: `${((currentIdx + 1) / exercise.questions.length) * 100}%` }}
            ></div>
          </div>
          <span className="text-xs font-black text-text-sub whitespace-nowrap">{currentIdx + 1} de {exercise.questions.length}</span>
        </div>
      </header>

      <main className="p-6 flex-1 flex flex-col gap-8">
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[40px] shadow-soft border border-gray-100 dark:border-gray-800 min-h-[160px] flex items-center justify-center text-center">
          <h2 className="text-2xl font-black leading-tight">{currentQuestion.text}</h2>
        </div>

        <div className="space-y-3">
          {currentQuestion.type === 'multiple' ? (
            currentQuestion.options?.map((opt, i) => {
              const isSelected = selectedOption === opt;
              const isCorrect = isAnswered && opt === currentQuestion.correctAnswer;
              const isWrong = isAnswered && isSelected && opt !== currentQuestion.correctAnswer;
              
              return (
                <button 
                  key={i}
                  disabled={isAnswered}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full flex items-center p-5 rounded-3xl border-2 transition-all ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-white dark:border-surface-dark bg-white dark:bg-surface-dark'
                  } ${isCorrect ? 'border-primary bg-primary/20 shadow-glow' : ''} ${isWrong ? 'border-red-500 bg-red-50' : ''}`}
                >
                  <span className={`size-10 flex items-center justify-center rounded-2xl text-lg font-black mr-4 ${isSelected ? 'bg-primary text-black' : 'bg-gray-100 dark:bg-gray-800 text-text-sub'}`}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1 text-left font-bold text-lg">{opt}</span>
                  {isCorrect && <span className="material-symbols-outlined text-primary filled">check_circle</span>}
                  {isWrong && <span className="material-symbols-outlined text-red-500 filled">cancel</span>}
                </button>
              );
            })
          ) : (
            <div className="space-y-4">
              <p className="text-sm italic text-center text-text-sub">Pense na resposta e clique para conferir!</p>
              {!isAnswered ? (
                <button 
                  onClick={() => { setSelectedOption('manual-correct'); setIsAnswered(true); }}
                  className="w-full h-20 bg-primary/10 border-2 border-dashed border-primary text-primary font-black rounded-3xl flex items-center justify-center gap-3"
                >
                  <span className="material-symbols-outlined">visibility</span>
                  Revelar Resposta
                </button>
              ) : (
                <div className="p-6 bg-white dark:bg-surface-dark rounded-3xl border-2 border-primary animate-fade-in-scale">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">A Resposta é...</p>
                  <p className="text-xl font-black">{currentQuestion.correctAnswer}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {isAnswered && (
          <div className="p-5 bg-primary/5 rounded-[32px] border border-primary/10 animate-fade-in flex gap-4 items-start">
             <span className="material-symbols-outlined text-primary shrink-0">info</span>
             <p className="text-sm font-medium leading-relaxed italic">"{currentQuestion.explanation}"</p>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 pt-10 max-w-md mx-auto z-40 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent">
        <button 
          onClick={handleConfirm}
          disabled={!selectedOption}
          className="w-full h-16 bg-primary disabled:opacity-50 text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {isAnswered ? (currentIdx + 1 === exercise.questions.length ? 'Finalizar Aventura' : 'Próximo Desafio') : 'Confirmar'}
          <span className="material-symbols-outlined">{isAnswered ? 'arrow_forward' : 'verified'}</span>
        </button>
      </div>
    </div>
  );
};

export default QuizPage;
