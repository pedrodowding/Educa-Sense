import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';
import { BehaviorGoal } from '../../../types';
import { persistBehaviorEvent } from '../../../services/eventService';
import { awardXp } from '../../../services/gamificationService';

interface Props {
  childId: string;
}

export const WeeklyGoalsCard: React.FC<Props> = ({ childId }) => {
  const [goals, setGoals] = useState<BehaviorGoal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Local state to track completed goals for today (optimistic UI)
  // Logic: A goal is "checked" for today if we have a 'goal_check' event for it today.
  // But for MVP simplicity, let's assume the 'progress' field in DB is the truth, OR we track a local boolean.
  // The requirement says: "Ao marcar: UI otimista (marca na hora), disparar evento, adicionar XP".
  // And "Metas da Semana". Usually this implies recurring goals.
  // Let's assume we show the goal and if it's not done today, show checkbox.
  // For MVP: We will store "checked_today" in a local map.
  const [checkedGoals, setCheckedGoals] = useState<Record<string, boolean>>({});

  const fetchGoals = async () => {
    try {
        const { data, error } = await supabase
            .from('behavior_goals')
            .select('*')
            .eq('child_id', childId)
            .order('created_at', { ascending: false })
            .limit(4);
            
        if (error) throw error;
        
        // Map to type
        const mappedGoals: BehaviorGoal[] = data.map((g: any) => ({
            id: g.id,
            childId: g.child_id,
            description: g.description,
            target: g.target,
            progress: g.progress,
            reward: g.reward,
            icon: g.icon
        }));
        
        setGoals(mappedGoals);
        
        // Check which ones are done today (via activity_completions or events)
        const today = new Date().toISOString().split('T')[0];
        const { data: completions } = await supabase
            .from('activity_completions')
            .select('metadata')
            .eq('child_id', childId)
            .eq('activity_type', 'goal_check')
            .eq('completed_date', today);
            
        const doneMap: Record<string, boolean> = {};
        completions?.forEach((c: any) => {
            if (c.metadata?.goalId) {
                doneMap[c.metadata.goalId] = true;
            }
        });
        setCheckedGoals(doneMap);

    } catch (err) {
        console.error('Error fetching goals:', err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [childId]);

  const handleCheck = async (goal: BehaviorGoal) => {
    if (checkedGoals[goal.id]) return; // Already done today

    // 1. Optimistic UI
    setCheckedGoals(prev => ({ ...prev, [goal.id]: true }));
    
    // 2. Add XP (toast handled by system usually, or we can assume it works)
    // 3. Persist
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // A. Log Event
        await persistBehaviorEvent(childId, 'goal_check', { goalId: goal.id, description: goal.description }, today);
        
        // B. Add XP
        await awardXp(childId, 10, 'goal_check'); // Fixed 10 XP rule for goals
        
        // C. Record Completion for "TodayActivityFeed"
        // (persistBehaviorEvent might create an activity_completion if configured, but let's ensure it)
        // Check persistBehaviorEvent implementation later. It usually writes to event_logs. 
        // We probably need to write to activity_completions explicitly to show up in the feed immediately if feed reads from there.
        // Actually, let's insert into activity_completions directly as 'goal_check'
        
        const { error } = await supabase.from('activity_completions').insert({
             child_id: childId,
             activity_type: 'goal_check',
             completed_date: today,
             completed_at: new Date(),
             metadata: { goalId: goal.id, description: goal.description },
             xp: 10
        });

        if (error) throw error;

    } catch (err) {
        console.error('Failed to check goal', err);
        // Revert UI on failure
        setCheckedGoals(prev => {
            const next = { ...prev };
            delete next[goal.id];
            return next;
        });
        // Show simple toast
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-50 animate-bounce';
        toast.innerText = 'Tente de novo';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
  };

  if (loading) return null;
  if (goals.length === 0) return null;

  return (
    <section className="mx-6 mb-8">
      <h3 className="text-lg font-black text-gray-900 dark:text-white mb-3 flex items-center gap-2">
         <span className="material-symbols-outlined text-green-500">task_alt</span>
         Metas da Semana
      </h3>
      <div className="space-y-3">
        {goals.map(goal => {
            const isDone = checkedGoals[goal.id];
            return (
                <button
                    key={goal.id}
                    onClick={() => handleCheck(goal)}
                    disabled={isDone}
                    className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                        isDone 
                        ? 'bg-green-50 border-green-200 opacity-60' 
                        : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98]'
                    }`}
                >
                    <div className={`size-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                        isDone 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300 text-transparent'
                    }`}>
                        <span className="material-symbols-outlined text-lg">check</span>
                    </div>
                    <div className="flex-1">
                        <span className={`font-bold text-sm text-gray-900 dark:text-white ${isDone ? 'line-through' : ''}`}>
                            {goal.description}
                        </span>
                    </div>
                    {isDone && (
                        <span className="text-xs font-black text-green-600">+10 XP</span>
                    )}
                </button>
            );
        })}
      </div>
    </section>
  );
};
