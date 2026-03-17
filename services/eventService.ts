import { supabase } from './supabase';
import { getLocalDateISOString, getIsoWeekKey } from '../utils/dateUtils';
import { awardXp } from './gamificationService';

type BaseEventType = 'daily_checkin' | 'mood_log' | 'sleep_log' | 'goal_check' | 'activity_completed' | 'plan_generated';

export const checkGoal = async (childId: string, goalId: string, description: string) => {
  const date = getLocalDateISOString();
  const week = getIsoWeekKey(date);

  try {
    // 1. Persist Behavior Event (Event Sourcing)
    await persistBehaviorEvent(childId, 'goal_check', { goal_id: goalId, description });

    // 2. Award XP (Gamification)
    // +10 XP per goal
    await awardXp(childId, 10, 'goal_check', { goal_id: goalId });

    // 3. Register Activity Completion (For Reports/Presence)
    // This ensures it shows up in Weekly Summary and Presence, but excluded from Streak via type 'goal_check'
    await supabase.from('activity_completions').insert({
      child_id: childId,
      parent_id: (await supabase.auth.getUser()).data.user?.id, // Optional/Nullable usually, but good to have
      activity_id: goalId, // Using goalId as activityId
      activity_type: 'goal_check',
      subject: 'Rotina',
      difficulty: 'Easy',
      score: 10, // Visual score
      xp: 10,
      stars: 1, // Maybe 1 star per goal?
      completed_at: new Date(),
      completed_date: date,
      metadata: { description }
    });

    // 4. Update Goal Progress (Mutate State)
    // We increment progress. If target reached, frontend handles visual, DB just stores number.
    // Fetch current first to increment safely? Or just RPC.
    // For MVP, we'll do a simple increment if we had the current value, 
    // but here we might just increment by 1 blind or assume frontend passes new value.
    // Let's increment via RPC or just update if we knew the previous. 
    // Since we don't want to fetch here to keep it fast, we can rely on 'activity_completions' count 
    // OR just increment the goal row.
    // Let's assume simple increment for now.
    
    // We will assume the frontend handles the visual progress state, 
    // but we should update the DB. 
    // Since we don't have a simple increment RPC ready, we'll verify if we can fetch-update quickly.
    const { data: goal } = await supabase.from('behavior_goals').select('progress, target').eq('id', goalId).single();
    if (goal) {
        const newProgress = Math.min(goal.progress + 1, goal.target);
        await supabase.from('behavior_goals').update({ progress: newProgress }).eq('id', goalId);
    }

    return { success: true, xpEarned: 10 };
  } catch (e) {
    console.error('Error checking goal:', e);
    return { success: false, error: e };
  }
};

export const persistBehaviorEvent = async (childId: string, eventType: BaseEventType, metadata: any, date?: string) => {
  const event_date = date || getLocalDateISOString();
  const event_week = getIsoWeekKey(event_date);
  await supabase.from('child_behavior_events').insert({
    child_id: childId,
    event_type: eventType,
    event_date,
    event_week,
    metadata: metadata || {}
  });
};

export const computeActiveSequenceDays = (events: Array<{ event_type: string; event_date: string }>, dateList?: string[]) => {
  const byDate: Record<string, { checkin: boolean; active: boolean }> = {};
  events.forEach(e => {
    const d = e.event_date;
    if (!byDate[d]) byDate[d] = { checkin: false, active: false };
    if (e.event_type === 'daily_checkin') byDate[d].checkin = true;
    if (e.event_type === 'goal_check' || e.event_type === 'activity_completed') byDate[d].active = true;
  });
  const sortedDates = (dateList?.length ? dateList : Object.keys(byDate)).sort();
  let streak = 0;
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const d = sortedDates[i];
    const dayActive = byDate[d]?.checkin && byDate[d]?.active;
    if (i === sortedDates.length - 1 && !dayActive) {
      continue;
    }
    if (dayActive) streak++;
    else break;
  }
  return streak;
};

export const computePresenceLast7 = (events: Array<{ event_type: string; event_date: string }>, last7Dates: string[]) => {
  const set = new Set(events.filter(e => e.event_type === 'daily_checkin').map(e => e.event_date));
  return last7Dates.map(d => set.has(d));
};

export const fetchBehaviorEvents = async (childId: string, fromDate?: string, toDate?: string) => {
  let query = supabase
    .from('child_behavior_events')
    .select('*')
    .eq('child_id', childId)
    .order('event_date', { ascending: true });

  if (fromDate) query = query.gte('event_date', fromDate);
  if (toDate) query = query.lte('event_date', toDate);

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching behavior events:', error);
    return [];
  }
  return data || [];
};
