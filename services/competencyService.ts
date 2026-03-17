import { supabase } from './supabase';
import { Subject } from '../types';

export interface ActivityEvent {
  id?: string;
  child_id: string;
  activity_type: string;
  subject: string;
  competency?: string;
  score?: number;
  completed_at?: string;
}

export interface CompetencySummary {
  subject: string;
  total_completed: number;
  avg_score: number;
  last_activity_at: string;
  derived_level: number;
}

export const logActivityEvent = async (event: ActivityEvent) => {
  try {
    const { error } = await supabase
      .from('child_activity_events')
      .insert({
        ...event,
        completed_at: event.completed_at || new Date().toISOString()
      });
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error logging activity event:', err);
    return false;
  }
};

export const fetchCompetencyMap = async (childId: string): Promise<CompetencySummary[]> => {
  try {
    const { data, error } = await supabase
      .from('child_activity_events')
      .select('subject, score, completed_at')
      .eq('child_id', childId);

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Agregação em memória (MVP)
    const summaryMap: Record<string, { total: number; sumScore: number; countScore: number; lastDate: string }> = {};

    data.forEach((row: any) => {
      const sub = row.subject || 'Geral';
      if (!summaryMap[sub]) {
        summaryMap[sub] = { total: 0, sumScore: 0, countScore: 0, lastDate: '' };
      }

      summaryMap[sub].total += 1;
      if (row.score !== null && row.score !== undefined) {
        summaryMap[sub].sumScore += Number(row.score);
        summaryMap[sub].countScore += 1;
      }
      if (row.completed_at > summaryMap[sub].lastDate) {
        summaryMap[sub].lastDate = row.completed_at;
      }
    });

    return Object.entries(summaryMap).map(([subject, stats]) => {
      const avg = stats.countScore > 0 ? stats.sumScore / stats.countScore : 0;
      
      // Regra de Nível MVP
      let level = 1;
      if (stats.total >= 10) level = 5;
      else if (stats.total >= 6) level = 4;
      else if (stats.total >= 3) level = 3;
      else if (stats.total >= 1) level = 2;

      return {
        subject,
        total_completed: stats.total,
        avg_score: avg,
        last_activity_at: stats.lastDate,
        derived_level: level
      };
    });

  } catch (err) {
    console.error('Error fetching competency map:', err);
    return [];
  }
};
