
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { schoolService } from '../services/schoolService';
import { Child } from '../types';

interface Props {
  childId: string;
}

export const StudentAssignmentsBlock: React.FC<Props> = ({ childId }) => {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const data = await schoolService.getStudentAssignments(childId);
        setAssignments(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignments();
  }, [childId]);

  if (loading) return null;
  if (assignments.length === 0) return null; // Don't show if empty for MVP cleanliness

  const handleStart = async (assignment: any) => {
    // For MVP, "Starting" just marks as submitted immediately or simulates doing it.
    // The prompt says: "Iniciar tarefa -> Concluir tarefa".
    // Usually, this would redirect to a Quiz page.
    // Since we don't have a specific "Assignment Runner" yet, we can:
    // 1. If it's a quiz, try to reuse QuizPage? But QuizPage needs an Exercise ID.
    // Assignments here are just metadata.
    // FOR MVP: Simple "Mark as Done" or "Simulate Quiz"
    
    const confirm = window.confirm(`Iniciar tarefa "${assignment.title}"? (Simulação de execução)`);
    if (confirm) {
      // Simulate score
      const score = Math.floor(Math.random() * 5) + 5; // 5-10
      await schoolService.submitAssignment(assignment.recipientId, score);
      alert(`Tarefa concluída! Nota: ${score}`);
      // Refresh list
      setAssignments(prev => prev.filter(a => a.id !== assignment.id));
    }
  };

  return (
    <section className="mt-6 mb-8 animate-fade-in-up">
      <div className="flex items-center gap-2 mb-4 px-2">
        <span className="material-symbols-outlined text-purple-500">assignment_late</span>
        <h3 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-wide">Tarefas da Escola</h3>
      </div>

      <div className="space-y-3">
        {assignments.map(assign => (
          <div 
            key={assign.id}
            className="bg-white dark:bg-surface-dark p-5 rounded-[24px] shadow-sm border border-l-4 border-gray-100 dark:border-gray-800 border-l-purple-500 flex justify-between items-center"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                 <h4 className="font-black text-gray-900 dark:text-white">{assign.title}</h4>
                 {assign.required && (
                   <span className="bg-red-100 text-red-600 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">Obrigatória</span>
                 )}
              </div>
              <p className="text-xs text-gray-500">{assign.competency} • Prazo: {new Date(assign.dueDate).toLocaleDateString()}</p>
            </div>
            <button 
              onClick={() => handleStart(assign)}
              className="px-4 py-2 bg-purple-500 text-white font-bold text-xs rounded-xl shadow-glow active:scale-95 transition-all"
            >
              Iniciar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
