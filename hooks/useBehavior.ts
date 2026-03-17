
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DailyCheckIn, BehaviorGoal } from '../types';
import { logAuditEvent } from '../services/audit';
import { persistBehaviorEvent } from '../services/eventService';
import { getLocalDateISOString } from '../utils/dateUtils';

export const useBehavior = () => {
  const { user } = useAuth();
  const [checkIns, setCheckIns] = useState<DailyCheckIn[]>([]);
  const [goals, setGoals] = useState<BehaviorGoal[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    try {
      const [checkInsRes, goalsRes] = await Promise.all([
        supabase.from('daily_checkins').select('*').order('created_at', { ascending: false }),
        supabase.from('behavior_goals').select('*').order('created_at', { ascending: false })
      ]);

      if (checkInsRes.error) throw checkInsRes.error;
      if (goalsRes.error) throw goalsRes.error;

      const mappedCheckIns: DailyCheckIn[] = checkInsRes.data.map((c: any) => ({
        id: c.id,
        childId: c.child_id,
        date: c.date,
        mood: c.mood,
        energy: 0, // Campo não existente no banco
        sleepQuality: c.sleep_quality,
        schoolStatus: c.notes || '', // Usando notes como status genérico
        event: c.feeling || ''
      }));

      const mappedGoals: BehaviorGoal[] = goalsRes.data.map((g: any) => ({
        id: g.id,
        childId: g.child_id,
        description: g.description,
        target: g.target,
        progress: g.progress,
        reward: g.reward,
        icon: g.icon
      }));

      setCheckIns(mappedCheckIns);
      setGoals(mappedGoals);
    } catch (error) {
      console.error('Error fetching behavior data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const addCheckIn = async (checkIn: DailyCheckIn) => {
    try {
      const dbCheckIn = {
        child_id: checkIn.childId,
        date: checkIn.date,
        mood: checkIn.mood,
        feeling: checkIn.event,
        sleep_quality: checkIn.sleepQuality,
        notes: checkIn.schoolStatus
      };

      const { data, error } = await supabase
        .from('daily_checkins')
        .insert(dbCheckIn)
        .select()
        .single();

      if (error) throw error;

      // Sync with activity_completions for unified progress
      if (user) {
        await supabase.from('activity_completions').insert({
          parent_id: user.id,
          child_id: checkIn.childId,
          activity_id: data.id,
          activity_type: 'checkin',
          completed_at: new Date(),
          completed_date: checkIn.date,
          metadata: {
            mood: checkIn.mood,
            sleep: checkIn.sleepQuality
          }
        });
      }

      await persistBehaviorEvent(checkIn.childId, 'daily_checkin', { mood: checkIn.mood, sleep: checkIn.sleepQuality }, checkIn.date);
      if (checkIn.mood) await persistBehaviorEvent(checkIn.childId, 'mood_log', { mood: checkIn.mood }, checkIn.date);
      if (checkIn.sleepQuality != null) await persistBehaviorEvent(checkIn.childId, 'sleep_log', { sleep: checkIn.sleepQuality }, checkIn.date);

      setCheckIns(prev => [checkIn, ...prev]);
      logAuditEvent({
        action: 'checkin_created',
        entityType: 'daily_checkin',
        entityId: data.id,
        metadata: {
          childId: checkIn.childId,
          date: checkIn.date,
          mood: checkIn.mood
        }
      });
    } catch (error) {
      console.error('Error adding check-in:', error);
    }
  };

  const addGoal = async (goal: BehaviorGoal) => {
    try {
      const dbGoal = {
        child_id: goal.childId,
        description: goal.description,
        target: goal.target,
        progress: goal.progress,
        reward: goal.reward,
        icon: goal.icon
      };

      const { data, error } = await supabase
        .from('behavior_goals')
        .insert(dbGoal)
        .select()
        .single();

      if (error) throw error;

      const newGoal = { ...goal, id: data.id };
      setGoals(prev => [newGoal, ...prev]);
      logAuditEvent({
        action: 'goal_created',
        entityType: 'behavior_goal',
        entityId: data.id,
        metadata: {
          childId: goal.childId,
          target: goal.target
        }
      });
    } catch (error) {
      console.error('Error adding goal:', error);
    }
  };

  const deleteGoal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('behavior_goals')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGoals(prev => prev.filter(g => g.id !== id));
      logAuditEvent({
        action: 'goal_deleted',
        entityType: 'behavior_goal',
        entityId: id
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
    }
  };

  const updateGoalProgress = async (id: string, progress: number) => {
    try {
        const { error } = await supabase
            .from('behavior_goals')
            .update({ progress })
            .eq('id', id);
        
        if (error) throw error;

        setGoals(prev => prev.map(g => g.id === id ? { ...g, progress } : g));
        logAuditEvent({
          action: 'goal_progress_updated',
          entityType: 'behavior_goal',
          entityId: id,
          metadata: { progress }
        });
        const goal = goals.find(g => g.id === id);
        if (goal && progress > 0) {
          await persistBehaviorEvent(goal.childId, 'goal_check', { goal_id: id, progress, actor: 'adult' }, getLocalDateISOString());
        }
    } catch (error) {
        console.error('Error updating goal:', error);
    }
  }

  const markGoalCheck = async (goal: BehaviorGoal, actor: 'adult' | 'child') => {
    try {
      const nextProgress = Math.min(goal.progress + 1, goal.target);
      const { error } = await supabase
        .from('behavior_goals')
        .update({ progress: nextProgress })
        .eq('id', goal.id);

      if (error) throw error;

      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, progress: nextProgress } : g));
      await persistBehaviorEvent(goal.childId, 'goal_check', { goal_id: goal.id, actor }, getLocalDateISOString());
      logAuditEvent({
        action: 'goal_check',
        entityType: 'behavior_goal',
        entityId: goal.id,
        metadata: { actor, progress: nextProgress }
      });
    } catch (error) {
      console.error('Error marking goal check:', error);
    }
  };

  return { checkIns, goals, loading, addCheckIn, addGoal, deleteGoal, updateGoalProgress, markGoalCheck, refresh: fetchData };
};
