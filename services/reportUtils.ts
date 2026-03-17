
import { Exercise, Subject } from '../types';

export interface WeeklyHistoryItem {
    done: boolean; // Streak criteria met (3/3)
    present: boolean; // Presence (Check-in or any activity)
    label: string;
    date: string;
}

export interface SubjectStats {
    name: string;
    avg: number | null; // Null if no grades
    count: number; // Total items
    scoredCount: number; // Items with actual grades
    pendingCount: number; // Items waiting for grade
}

export interface ChildStats {
    total: number;
    avg: number | null;
    subjects: SubjectStats[];
}

export interface ActivityCompletion {
    completed_date: string;
    xp?: number;
    activity_type?: string;
    child_id?: string;
    subject?: string;
}

export interface XpLog {
    created_at: string;
    xp_earned: number;
}

export interface WeeklySummary {
    total_activity_completions: number;
    total_checkins: number;
    total_goals_checked: number;
    total_xp_week: number;
    dominant_subject: string | null;
    active_week: boolean;
}

export const getWeeklySummary = (
    activityCompletions: ActivityCompletion[],
    xpLogs: XpLog[]
): WeeklySummary => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    // Filter last 7 days
    const weeklyCompletions = activityCompletions.filter(c => new Date(c.completed_date) >= oneWeekAgo);
    
    const total_activity_completions = weeklyCompletions.filter(c => 
        c.activity_type !== 'goal_check' && c.activity_type !== 'daily_checkin'
    ).length;
    
    const total_checkins = weeklyCompletions.filter(c => c.activity_type === 'daily_checkin').length;
    const total_goals_checked = weeklyCompletions.filter(c => c.activity_type === 'goal_check').length;
    
    // Calculate Weekly XP (using logic from calculateWeeklyXPSeries aggregated)
    const dailySeries = calculateWeeklyXPSeries(xpLogs, activityCompletions);
    const total_xp_week = dailySeries.reduce((acc, curr) => acc + curr.value, 0);
    
    // Calculate Dominant Subject
    const subjectCounts: Record<string, number> = {};
    weeklyCompletions.forEach(c => {
        if (c.activity_type !== 'goal_check' && c.activity_type !== 'daily_checkin' && c.subject) {
            subjectCounts[c.subject] = (subjectCounts[c.subject] || 0) + 1;
        }
    });
    
    const dominant_subject = Object.entries(subjectCounts)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        
    const active_week = total_activity_completions > 0 || total_checkins > 0 || total_goals_checked > 0;

    return {
        total_activity_completions,
        total_checkins,
        total_goals_checked,
        total_xp_week,
        dominant_subject,
        active_week
    };
};

export const getDayLabel = (dateStr: string): string => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    // dateStr is YYYY-MM-DD
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return days[date.getDay()];
};

export const calculateLast7DaysStatus = (
    activityCompletions: ActivityCompletion[], 
    today: string,
    getDayLabelFn?: (d: string) => string
): WeeklyHistoryItem[] => {
    const historyBool: WeeklyHistoryItem[] = [];
    const labelFn = getDayLabelFn || getDayLabel;
    
    for(let i=6; i>=0; i--) {
        const d = new Date();
        d.setDate(new Date().getDate() - i);
        const offset = d.getTimezoneOffset() * 60000;
        const localDate = new Date(d.getTime() - offset);
        const dStr = localDate.toISOString().slice(0, 10);
        
        // Audit point: Criterion is >= 3 completions
        const dayActivities = activityCompletions.filter(x => x.completed_date === dStr);
        
        // Streak Logic: Only count pedagogic activities (exclude goals/checkins)
        // We assume 'goal_check' and 'daily_checkin' do not count towards the 3-activity plan
        const streakActivities = dayActivities.filter(a => 
            a.activity_type !== 'goal_check' && 
            a.activity_type !== 'daily_checkin'
        );
        
        const count = streakActivities.length;
        
        // Presence: Any activity or check-in (including goals)
        const present = dayActivities.length > 0;
        
        // Streak: >= 3 activities
        const done = count >= 3;

        if (import.meta.env?.DEV) {
             console.log(`[AUDIT] Date: ${dStr}, Count: ${count}, Present: ${present}, Done: ${done}`);
        }
        
        historyBool.push({
          done,
          present,
          label: i === 0 ? 'Hoje' : labelFn(dStr),
          date: dStr
        });
    }
    return historyBool;
};

export const calculateWeeklyXPSeries = (
    xpLogs: XpLog[],
    activityCompletions: ActivityCompletion[]
): { label: string; value: number; fullDate: string }[] => {
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); 
      const offset = d.getTimezoneOffset() * 60000;
      const localDate = new Date(d.getTime() - offset);
      const isoDateStr = localDate.toISOString().slice(0, 10);
      
      // 1. Try Gamification Logs (Source of Truth)
      const dayLogs = xpLogs.filter(log => {
        const logDate = new Date(log.created_at);
        const logOffset = logDate.getTimezoneOffset() * 60000;
        const localLogDate = new Date(logDate.getTime() - logOffset);
        return localLogDate.toISOString().slice(0, 10) === isoDateStr;
      });
      
      let totalXp = dayLogs.reduce((acc, curr) => acc + (curr.xp_earned || 0), 0);
      let source = 'logs';

      // 2. Fallback: Activity Completions
      if (totalXp === 0) {
        const dayCompletions = activityCompletions.filter(c => c.completed_date === isoDateStr);
        const fallbackXp = dayCompletions.reduce((acc, curr) => acc + (Number(curr.xp) || 0), 0);
        
        // HOTFIX: Block fallback_activity from granting XP
        // Garantir que qualquer origem 'fallback_activity' NUNCA conceda XP.
        if (fallbackXp > 0) {
            // totalXp = fallbackXp; // DISABLED: We do not want to fallback to activity completions for XP sum if logs are missing
            source = 'fallback_activity (BLOCKED)';
            if (import.meta.env?.DEV) {
                 console.warn(`[AUDIT] Fallback XP blocked for ${isoDateStr}. Amount: ${fallbackXp}`);
            }
        }
      }

      if (import.meta.env?.DEV && totalXp > 0) {
          console.log(`[AUDIT XP] Date: ${isoDateStr}, XP: ${totalXp}, Source: ${source}`);
      }
      
      data.push({ label: dateStr.split('/')[0], value: totalXp, fullDate: dateStr });
    }
    return data;
};

export const calculateSubjectStats = (childHistory: Exercise[]): ChildStats => {
    // Filter only graded items for average
    const scored = childHistory.filter(e => e.score !== undefined && e.score !== null);

    const avg = scored.length > 0 
      ? scored.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / scored.length 
      : null; // Return null if no grades
    
    const subjects = Object.values(Subject).map(sub => {
      const subEx = childHistory.filter(h => h.subject === sub);
      const subScored = subEx.filter(e => e.score !== undefined && e.score !== null);
      
      const subAvg = subScored.length > 0 
        ? subScored.reduce((acc, curr) => acc + (Number(curr.score) || 0), 0) / subScored.length 
        : null;

      if (import.meta.env?.DEV && subEx.length > 0) {
          console.log(`[AUDIT SUBJECT] ${sub}: Total=${subEx.length}, Scored=${subScored.length}, Avg=${subAvg}`);
      }

      return {
        name: sub,
        avg: subAvg,
        count: subEx.length,
        scoredCount: subScored.length,
        pendingCount: subEx.length - subScored.length
      };
    });

    return {
      total: childHistory.length,
      avg,
      subjects
    };
};
