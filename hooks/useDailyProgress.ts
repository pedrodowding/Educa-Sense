import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { DailyPlanState } from '../types/dailyPlan';

export const useDailyProgress = (childIdOverride?: string) => {
  const { selectedChild: contextChild } = useSelectedChild();
  const childId = childIdOverride || contextChild?.id;
  
  const [dailyState, setDailyState] = useState<DailyPlanState | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProgress = async () => {
    if (!childId) {
        setDailyState(null);
        return;
    }
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Buscar atividades concluídas hoje
      const { data, error } = await supabase
        .from('activity_completions')
        .select('*')
        .eq('child_id', childId)
        .eq('completed_date', today);

      if (error) throw error;

      // Mapear completions para steps do plano diário
      
      // Step 1: Check-in
      // Procurar por activity_type = 'checkin'
      const checkin = data?.find(a => a.activity_type === 'checkin');
      
      // Step 2: Exercício Principal (Quiz ou Exercise)
      // Procurar por activity_type = 'quiz' ou 'exercise'
      const exercise = data?.find(a => a.activity_type === 'quiz' || a.activity_type === 'exercise');

      // Step 3: Atividade Extra (Criativo, Leitura, ou outro exercício)
      // Priorizar 'creative_light' ou 'creative_offline' se existir
      const usedIds = new Set<string>();
      if (checkin) usedIds.add(checkin.id);
      if (exercise) usedIds.add(exercise.id);

      let extraActivity = data?.find(a => 
        (a.activity_type === 'creative_light' || a.activity_type === 'creative_offline') && !usedIds.has(a.id)
      );

      // Fallback para qualquer outra atividade não usada
      if (!extraActivity) {
        extraActivity = data?.find(a => 
            !usedIds.has(a.id) && 
            // HOTFIX: Exclude system/auto-generated activities from counting as daily steps
            a.activity_type !== 'daily_plan_completed' && 
            a.activity_type !== 'badge_earned' &&
            a.activity_type !== 'goal_check'
        );
      }
      
      const step1Done = !!checkin;
      const step2Done = !!exercise;
      const step3Done = !!extraActivity;

      const stepsCompleted: [boolean, boolean, boolean] = [
        step1Done,
        step2Done,
        step3Done
      ];
      
      const stepsCount = stepsCompleted.filter(Boolean).length;
      
      let status: 'not_started' | 'in_progress' | 'done' = 'not_started';
      if (stepsCount > 0) status = 'in_progress';
      if (stepsCount === 3) status = 'done';

      // Normalize sleep value from metadata (number 1-5) to string ('bom'|'medio'|'ruim')
      let sleepStatus: 'bom' | 'medio' | 'ruim' | undefined;
      const rawSleep = checkin?.metadata?.sleep;
      
      if (typeof rawSleep === 'number') {
        if (rawSleep >= 4) sleepStatus = 'bom';
        else if (rawSleep === 3) sleepStatus = 'medio';
        else sleepStatus = 'ruim';
      } else if (typeof rawSleep === 'string') {
        sleepStatus = rawSleep as any;
      }

      setDailyState({
        aluno_id: childId,
        date: today,
        steps_completed: stepsCompleted,
        status,
        stepsCount,
        mood: checkin?.metadata?.mood,
        sleep: sleepStatus
      });

    } catch (err) {
      console.error('Error fetching daily progress:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [childId]);

  return { dailyState, refresh: fetchProgress, loading };
};
