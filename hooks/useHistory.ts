
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Exercise, Subject, Difficulty, Question } from '../types';
import { logAuditEvent } from '../services/audit';
import { logActivityEvent } from '../services/competencyService';
import { historyService } from '../services/historyService';
import { persistBehaviorEvent } from '../services/eventService';
import { getLocalDateISOString } from '../utils/dateUtils';

export const useHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      // Como não temos uma relação direta user -> exercises, buscamos via children
      // Mas o RLS já filtra por children do usuário.
      // Precisamos buscar as crianças primeiro ou confiar no RLS.
      // Vamos buscar exercises onde child_id IN (meus filhos)
      // O RLS policy: "Guardians can view their children's exercises" resolve isso.
      
      const { data, error } = await supabase
        .from('exercises')
        .select('*, children(name, age, grade)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      console.log('[DEBUG HISTORY] Raw data from Supabase:', data?.length, 'records');
      if (data?.length > 0) {
        console.log('[DEBUG HISTORY] Sample record:', data[0]);
      }

      const mappedHistory: Exercise[] = data.map((e: any) => {
        // Se houver conteúdo salvo em JSONB, mesclamos com o objeto base
        const content = e.content || {};
        
        return {
          id: e.id,
          title: content.title || `Atividade de ${e.subject}`,
          childId: e.child_id,
          childName: e.children?.name || 'Aluno',
          childAge: e.children?.age || 0,
          grade: e.children?.grade || '',
          subject: e.subject as Subject,
          difficulty: e.difficulty as Difficulty,
          pedagogicalObjective: e.pedagogical_objective || content.pedagogicalObjective || 'Prática Geral',
          questions: content.questions || [],
          createdAt: e.created_at,
          score: e.score,
          completed: e.completed,
          correctAnswers: e.correct_answers,
          totalQuestions: e.total_questions,
          // Recuperar outros campos específicos se existirem no content
          imageUrl: content.imageUrl,
          story: content.story,
          createdBy: content.createdBy,
          selectedFormat: content.selectedFormat,
          type: content.type,
        };
      });

      // Ordenar por data decrescente (já feito no banco, mas mantendo para garantir consistência local se houver merge)
      // mappedHistory.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setHistory(mappedHistory);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [user?.id]);

  const saveToHistory = async (exercise: Exercise) => {
    try {
      const childId = exercise.childId;
      if (!childId || !isUuid(childId)) {
        console.error('Error saving history: childId inválido', { childId: exercise.childId, childName: exercise.childName });
        return;
      }

      const dbExercise = {
        child_id: childId,
        subject: exercise.subject,
        difficulty: exercise.difficulty,
        score: exercise.score, // Permitir null/undefined para "Sem nota"
        total_questions: exercise.questions.length, // ou exercise.totalQuestions
        correct_answers: exercise.correctAnswers, // Precisa vir do objeto exercise
        completed: exercise.completed || false, // Default false se não especificado
        // Persistência completa
        pedagogical_objective: exercise.pedagogicalObjective,
        content: exercise
      };

      // Como o objeto Exercise do frontend tem campos que não mapeamos 1:1 para o banco simples de histórico,
      // simplificamos aqui. Se quisermos salvar perguntas, precisaríamos de uma tabela JSONB ou relacionada.
      // Por enquanto, vamos salvar o básico.

      const { data, error } = await supabase
        .from('exercises')
        .insert(dbExercise)
        .select('*, children(name, age, grade)')
        .single();

      if (error) throw error;

      const savedExercise: Exercise = {
        ...exercise,
        childId,
        id: data.id,
        createdAt: data.created_at
      };

      setHistory(prev => [savedExercise, ...prev]);

      // NOVO: Log Central de Histórico (Unified Tracking)
      // Garante que activity_completions seja preenchido para alimentar child_progress via trigger ou consulta direta
      if (exercise.completed) {
        const xpEarned = exercise.subject === Subject.ART ? 10 : 15;
        const { error: completionError } = await supabase.from('activity_completions').insert({
            parent_id: user.id,
            child_id: childId,
            activity_id: data.id,
            activity_type: 'exercise', // ou mapear tipos específicos
            subject: exercise.subject,
            difficulty: exercise.difficulty,
            score: exercise.score, // Passa null/undefined se não houver nota
            stars: exercise.score != null 
               ? (exercise.score >= 8 ? 3 : exercise.score >= 5 ? 2 : 1)
               : (exercise.subject === Subject.ART ? 3 : 1), // 3 estrelas para Artes sem nota
            xp: xpEarned,
            completed_at: new Date(),
            completed_date: getLocalDateISOString(),
            metadata: {
               original_table: 'exercises',
               title: exercise.title,
               questions_count: exercise.questions.length
            }
        });

        if (completionError) {
            console.warn('Falha ao salvar em activity_completions (mas exercise foi salvo):', completionError);
        }
        await persistBehaviorEvent(childId, 'activity_completed', {
          activity_id: data.id,
          subject: exercise.subject,
          score: exercise.score,
          xp: xpEarned
        }, getLocalDateISOString());
      }

      // Log no mapa de competências (Legado/Redundante mas mantendo por segurança)
      await logActivityEvent({
        child_id: childId,
        activity_type: 'exercise',
        subject: exercise.subject,
        score: exercise.score || 0,
        competency: exercise.pedagogicalObjective
      });

      // NOVO: Log Central de Histórico (Serviço de Histórico para UI de Linha do Tempo)
      // Se for um desenho ou arte (geralmente Subject.ART), loga como drawing, senão activity
      if (exercise.subject === Subject.ART) {
         // Para desenhos, geralmente temos imageUrl
         await historyService.logDrawing({
           program: 'artes_criativas',
           title: exercise.title || 'Atividade de Arte',
           summary: exercise.pedagogicalObjective,
           asset_url: exercise.imageUrl,
           xp: 10, // Default XP for drawing
           child_id: childId,
           result_json: { original_exercise_id: data.id }
         });
      } else {
         await historyService.logActivity({
           program: 'exercicio_facil',
           title: exercise.title || `Atividade de ${exercise.subject}`,
           summary: `${exercise.subject} - ${exercise.difficulty}`,
           score: exercise.score,
           xp: 15, // Default XP for activity
           child_id: childId,
           result_json: { 
             subject: exercise.subject, 
             difficulty: exercise.difficulty,
             correct: exercise.correctAnswers,
             total: exercise.questions.length,
             original_exercise_id: data.id
           }
         });
      }

      logAuditEvent({
        action: 'exercise_created',
        entityType: 'exercise',
        entityId: data.id,
        metadata: {
          childId,
          subject: exercise.subject,
          difficulty: exercise.difficulty
        }
      });
      return savedExercise;
    } catch (error) {
      console.error('Error saving history:', error);
      return null;
    }
  };

  const updateExercise = async (id: string, updates: Partial<Exercise>) => {
    try {
      const dbUpdates: any = {};
      if (updates.score !== undefined) dbUpdates.score = updates.score;
      if (updates.completed !== undefined) dbUpdates.completed = updates.completed;
      if (updates.correctAnswers !== undefined) dbUpdates.correct_answers = updates.correctAnswers;

      const { error } = await supabase
        .from('exercises')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;

      setHistory(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      logAuditEvent({
        action: 'exercise_updated',
        entityType: 'exercise',
        entityId: id,
        metadata: {
          updates: Object.keys(dbUpdates)
        }
      });
    } catch (error) {
      console.error('Error updating exercise:', error);
    }
  };

  const deleteExercise = async (id: string): Promise<boolean> => {
    const removed = history.find(e => e.id === id) || null;
    setHistory(prev => prev.filter(e => e.id !== id));

    try {
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) throw error;

      logAuditEvent({
        action: 'exercise_deleted',
        entityType: 'exercise',
        entityId: id
      });

      return true;
    } catch (error) {
      if (removed) {
        setHistory(prev => {
          const next = [removed, ...prev];
          next.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          return next;
        });
      }
      console.error('Error deleting exercise:', error);
      return false;
    }
  };

  return { history, loading, saveToHistory, updateExercise, deleteExercise, refresh: fetchHistory };
};
