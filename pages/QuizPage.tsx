
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Exercise, Child } from '../types';
import { verifyAnswerAI } from '../services/geminiService';
import { awardXp, checkAndAwardBadges, calculateLevel, calculateNextLevelXp } from '../services/gamificationService';
import { useAuth } from '../contexts/AuthContext';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { supabase } from '../services/supabase';
import { persistBehaviorEvent } from '../services/eventService';
import { getLocalDateISOString } from '../utils/dateUtils';

interface Props {
  history: Exercise[];
  onUpdate: (id: string, updates: Partial<Exercise>) => void;
  children: Child[];
  onUpdateChild: (id: string, updates: Partial<Child>) => void;
}

const QuizPage: React.FC<Props> = ({ history, onUpdate, children, onUpdateChild }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedChild } = useSelectedChild();
  const exercise = history.find(e => e.id === id);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [earnedBadges, setEarnedBadges] = useState<any[]>([]);
  const [xpGained, setXpGained] = useState(0);

  if (!exercise) return null;

  const currentQuestion = exercise.questions[currentIdx];
  const isMultiple = currentQuestion?.type === 'multiple' || (!currentQuestion?.type && Array.isArray((currentQuestion as any)?.options));

  const handleConfirm = async () => {
    if (isAnswered) {
      if (currentIdx + 1 < exercise.questions.length) {
        setCurrentIdx(prev => prev + 1);
        setSelectedOption(null);
        setUserAnswer('');
        setAiFeedback(null);
        setIsAnswered(false);
      } else {
        // --- FINAL DO EXERCÍCIO ---
        const finalScore = (correctAnswers / exercise.questions.length) * 10;
        await onUpdate(exercise.id, { score: finalScore, completed: true });
        
        // Determinar child de forma robusta
        let child = children.find(c => c.id === exercise.childId);
        if (!child && exercise.childName) {
             child = children.find(c => c.name === exercise.childName);
        }
        if (!child && selectedChild) {
             child = selectedChild;
        }

        if (child && user) {
          // 1. Calcular XP
          // Base: 10 XP por acerto
          // Bônus: 50 XP se gabaritar (100% score)
          let totalXp = correctAnswers * 10;
          if (finalScore === 10) totalXp += 50;

          const starsEarned = Math.floor(correctAnswers / 2);

          // 2. Persistir Conclusão Unificada (Novo Banco de Dados)
          // O Trigger no banco irá atualizar XP, Streak e Stars automaticamente
          try {
            await supabase.from('activity_completions').insert({
                parent_id: user.id,
                child_id: child.id,
                activity_id: exercise.id,
                activity_type: 'quiz',
                subject: exercise.subject,
                difficulty: exercise.difficulty,
                score: finalScore,
                stars: starsEarned,
                xp: totalXp,
                completed_at: new Date(),
                completed_date: getLocalDateISOString(),
                metadata: {
                    title: exercise.title || `Atividade de ${exercise.subject}`,
                    total_questions: exercise.questions.length,
                    correct_answers: correctAnswers
                }
            });

            await persistBehaviorEvent(child.id, 'activity_completed', {
              activity_id: exercise.id,
              subject: exercise.subject,
              score: finalScore,
              xp: totalXp
            }, getLocalDateISOString());
            
            // Recarregar dados da criança para refletir novo XP/Streak na UI
            // Como estamos usando contexto global, idealmente teríamos um 'refreshChild'
            // Mas o onUpdateChild atualiza o estado local do pai, o que é bom.
            // Porém, como o cálculo agora é no servidor, precisamos buscar o valor novo ou estimar.
            // Para UI otimista imediata, podemos estimar, mas sabendo que o server é a fonte da verdade.
            
            // Estimativa otimista para UI
            const optimisticStreak = (child.streak || 0) + 1; // Simplificado, ideal seria lógica de data
            
            await onUpdateChild(child.id, {
                xp: (child.xp || 0) + totalXp,
                stars: (child.stars || 0) + starsEarned,
                // Não atualizamos streak aqui para evitar inconsistência com lógica complexa de data do server,
                // ou atualizamos apenas visualmente.
            });

          } catch (err) {
            console.error('Erro ao salvar completion:', err);
          }

          // 3. Checar Badges (Ainda no cliente por enquanto)
          const newBadges = await checkAndAwardBadges(child.id);
          setEarnedBadges(newBadges);
          setXpGained(totalXp);
        }
        setShowResult(true);
      }
    } else {
      // ... (Lógica de validação permanece igual) ...
      // Lógica para Múltipla Escolha
      if (isMultiple) {
        if (!selectedOption) return;
        const isCorrect = selectedOption === currentQuestion.correctAnswer;
        if (isCorrect) setCorrectAnswers(prev => prev + 1);
        setIsAnswered(true);
      } 
      // Lógica para Dissertativa (Open)
      else {
        if (!userAnswer.trim()) return;
        setIsVerifying(true);
        try {
          const result = await verifyAnswerAI(currentQuestion.text, currentQuestion.correctAnswer, userAnswer);
          setAiFeedback(result.feedback);
          if (result.isCorrect) setCorrectAnswers(prev => prev + 1);
          setIsAnswered(true);
        } catch (error) {
          console.error(error);
          alert('Erro ao verificar resposta. Tente novamente.');
        } finally {
          setIsVerifying(false);
        }
      }
    }
  };

  if (showResult) {
    const finalScore = (correctAnswers / exercise.questions.length) * 10;
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white dark:bg-background-dark">
        {/* Animação de Confete/Sucesso aqui seria ideal */}
        
        <div className="size-40 rounded-full bg-primary/10 flex items-center justify-center mb-8 relative animate-bounce">
           <span className="material-symbols-outlined text-primary text-6xl filled">workspace_premium</span>
           <div className="absolute -top-2 -right-2 bg-primary text-black size-12 rounded-full flex items-center justify-center font-black text-xl shadow-lg border-4 border-white">
              {finalScore.toFixed(0)}
           </div>
        </div>
        
        <h2 className="text-4xl font-black mb-2">UAU!</h2>
        <p className="text-text-sub mb-6">Você brilhou muito nesta aventura!</p>
        
        <div className="flex gap-4 mb-8">
           <div className="bg-gray-50 dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 min-w-[100px]">
              <p className="text-[10px] font-black text-primary uppercase">XP Ganhos</p>
              <p className="text-2xl font-black">+{xpGained}</p>
           </div>
           <div className="bg-gray-50 dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 min-w-[100px]">
              <p className="text-[10px] font-black text-yellow-500 uppercase">Estrelas</p>
              <p className="text-2xl font-black">+{Math.floor(correctAnswers / 2)}</p>
           </div>
        </div>

        {earnedBadges.length > 0 && (
          <div className="mb-8 w-full max-w-sm">
            <p className="text-[10px] font-black uppercase text-text-sub tracking-widest mb-3">Conquistas Desbloqueadas!</p>
            <div className="space-y-2">
              {earnedBadges.map(badge => (
                <div key={badge.id} className="bg-yellow-50 border-2 border-yellow-200 p-3 rounded-2xl flex items-center gap-3 animate-fade-in-up">
                  <div className="size-10 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                    <span className="material-symbols-outlined">{badge.icon}</span>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm text-yellow-900">{badge.name}</p>
                    <p className="text-[10px] font-bold text-yellow-600">+{badge.xpBonus} XP Bônus</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="w-full space-y-3 max-w-sm">
            {/* Action Buttons */}
            <div className="flex flex-col gap-3 mt-6">
               <button 
                  onClick={() => window.print()}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors print:hidden"
               >
                  <span className="material-symbols-outlined">print</span>
                  Imprimir Resultado
               </button>

               <button 
                 onClick={() => navigate('/student')}
                 className="w-full py-4 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2 print:hidden"
               >
                 <span className="material-symbols-outlined">check_circle</span>
                 Concluir Atividade
               </button>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-background-dark">
      <header className="p-4 pt-6 space-y-4 max-w-3xl mx-auto w-full">
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

      <main className="p-6 pb-32 flex-1 flex flex-col gap-8 max-w-3xl mx-auto w-full">
        <div className="bg-white dark:bg-surface-dark p-8 rounded-[40px] shadow-soft border border-gray-100 dark:border-gray-800 min-h-[160px] flex items-center justify-center text-center">
          <h2 className="text-2xl font-black leading-tight">{currentQuestion.text}</h2>
        </div>

        <div className="space-y-3">
          {isMultiple ? (
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
              {!isAnswered ? (
                <div className="space-y-4">
                   <p className="text-sm italic text-center text-text-sub">Escreva sua resposta abaixo:</p>
                   <textarea
                     value={userAnswer}
                     onChange={(e) => setUserAnswer(e.target.value)}
                     placeholder="Digite sua resposta aqui..."
                     className="w-full h-32 p-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-surface-dark focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none font-medium"
                     disabled={isVerifying}
                   />
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className={`p-6 rounded-3xl border-2 ${aiFeedback?.includes('correto') || aiFeedback?.includes('Parabéns') || aiFeedback?.includes('Muito bem') ? 'border-green-500 bg-green-50' : 'border-orange-500 bg-orange-50'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-70">Feedback da IA</p>
                    <p className="text-lg font-bold leading-relaxed">{aiFeedback}</p>
                  </div>
                  
                  <div className="p-6 bg-white dark:bg-surface-dark rounded-3xl border-2 border-primary/20">
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-2">Resposta Esperada</p>
                    <p className="text-lg font-medium">{currentQuestion.correctAnswer}</p>
                  </div>
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

      <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-gray-50 via-gray-50 to-transparent pt-10 pb-6 px-6">
        <div className="max-w-3xl mx-auto w-full">
          <button 
            onClick={handleConfirm}
            disabled={(!selectedOption && isMultiple) || (!userAnswer.trim() && !isMultiple) || isVerifying}
            className={`w-full h-16 bg-primary disabled:opacity-50 text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3 ${isVerifying ? 'animate-pulse cursor-wait' : ''}`}
          >
            {isVerifying ? (
               <>
                 <span className="material-symbols-outlined animate-spin">sync</span>
                 Verificando...
               </>
            ) : (
               <>
                 {isAnswered ? (currentIdx + 1 === exercise.questions.length ? 'Finalizar Aventura' : 'Próximo Desafio') : (isMultiple ? 'Confirmar' : 'Verificar com IA')}
                 <span className="material-symbols-outlined">{isAnswered ? 'arrow_forward' : 'verified'}</span>
               </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuizPage;
