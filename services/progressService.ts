import { supabase } from './supabase';
import { ChildContext, ChildProgress } from '../types';

export interface ProgressSummary {
  total_activities: number;
  completed_activities: number;
  completion_rate: number;
  average_accuracy: number;
  total_xp: number;
  streak_days: number;
}

export interface SubjectProgress {
  subject: string;
  completion_rate: number;
  average_accuracy: number;
  total_xp: number;
}

export interface ProgressTimelineItem {
  date: string;
  total_xp: number;
  activities_completed: number;
  score?: number;
}

export const progressService = {
  async getSummary(childId: string): Promise<ProgressSummary | null> {
    try {
      const { data, error } = await supabase.rpc('get_child_progress_summary', {
        p_child_id: childId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching progress summary:', error);
      return null;
    }
  },

  async getBySubject(childId: string): Promise<SubjectProgress[]> {
    try {
      const { data, error } = await supabase.rpc('get_child_progress_by_subject', {
        p_child_id: childId
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching subject progress:', error);
      return [];
    }
  },

  async getTimeline(childId: string, days: number = 30): Promise<ProgressTimelineItem[]> {
    try {
      const { data, error } = await supabase.rpc('get_child_progress_timeline', {
        p_child_id: childId,
        p_days: days
      });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching progress timeline:', error);
      return [];
    }
  },

  // Compatibility methods for existing code
  async getChildProgress(childId: string): Promise<ChildProgress | null> {
    try {
      const summary = await this.getSummary(childId);
      if (!summary) return null;

      const subjectProgress = await this.getBySubject(childId);
      
      const strengths: Record<string, number> = {};
      const weaknesses: Record<string, number> = {};

      subjectProgress.forEach(sub => {
        if (sub.average_accuracy >= 70) {
          strengths[sub.subject] = sub.average_accuracy;
        } else if (sub.average_accuracy < 50) {
          weaknesses[sub.subject] = sub.average_accuracy;
        }
      });

      return {
        id: childId, // placeholder
        childId: childId,
        totalActivities: summary.total_activities,
        totalXp: summary.total_xp,
        currentLevel: Math.floor(summary.total_xp / 100) + 1, // Simple level calculation
        avgScore: summary.average_accuracy / 10, // Convert 0-100 to 0-10
        strengths,
        weaknesses,
        lastActivityAt: new Date().toISOString(), // Placeholder
        recentBadges: []
      };
    } catch (error) {
      console.error('Error fetching child progress:', error);
      return null;
    }
  },

  async getChildContextFromId(childId: string): Promise<ChildContext | null> {
    try {
      // Need child name and age, maybe fetch from children table
      const { data: childData } = await supabase
        .from('children')
        .select('name, age')
        .eq('id', childId)
        .single();

      const summary = await this.getSummary(childId);
      const subjectProgress = await this.getBySubject(childId);

      if (!summary) return null;

      const strengths = subjectProgress
        .filter(s => s.average_accuracy >= 70)
        .map(s => s.subject);
      
      const weaknesses = subjectProgress
        .filter(s => s.average_accuracy < 50)
        .map(s => s.subject);

      return {
        name: childData?.name || 'Aluno',
        age: childData?.age || 0,
        level: Math.floor(summary.total_xp / 100) + 1,
        total_xp: summary.total_xp,
        strengths,
        weaknesses,
        avg_score: summary.average_accuracy / 10
      };
    } catch (error) {
      console.error('Error fetching child context:', error);
      return null;
    }
  }
};
