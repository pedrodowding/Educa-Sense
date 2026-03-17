import React, { useEffect, useState } from 'react';
import { supabase } from '../../../services/supabase';

interface Props {
  childId: string;
}

export const TodayActivityFeed: React.FC<Props> = ({ childId }) => {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
            .from('activity_completions')
            .select('*')
            .eq('child_id', childId)
            .eq('completed_date', today)
            .order('completed_at', { ascending: false });

        if (error) throw error;
        setActivities(data || []);
    } catch (err) {
        console.error(err);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    
    // Subscribe to realtime updates for this child's activities
    const subscription = supabase
      .channel(`student_feed_${childId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'activity_completions', 
        filter: `child_id=eq.${childId}` 
      }, (payload) => {
         // Add new item to top
         setActivities(prev => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
        subscription.unsubscribe();
    };
  }, [childId]);

  if (loading || activities.length === 0) return null;

  const getLabel = (act: any) => {
     switch(act.activity_type) {
        case 'checkin': return 'Check-in feito';
        case 'goal_check': return act.metadata?.description || 'Meta marcada';
        case 'quiz': return `${act.subject || 'Atividade'} concluída`;
        case 'exercise': return `${act.subject || 'Exercício'} concluído`;
        case 'creative_light': return 'Missão Criativa';
        default: return 'Atividade realizada';
     }
  };

  const getIcon = (type: string) => {
     switch(type) {
        case 'checkin': return 'check_circle';
        case 'goal_check': return 'star';
        case 'quiz': return 'school';
        case 'creative_light': return 'palette';
        default: return 'done';
     }
  };

  return (
    <section className="mx-6 mb-8">
       <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Hoje eu já fiz</h3>
       <div className="space-y-2">
          {activities.map(act => (
             <div key={act.id} className="bg-white dark:bg-surface-dark p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 animate-fade-in">
                <span className="material-symbols-outlined text-primary text-lg">{getIcon(act.activity_type)}</span>
                <span className="text-sm font-bold text-gray-700 dark:text-gray-200 flex-1">{getLabel(act)}</span>
                {act.xp > 0 && (
                    <span className="text-xs font-black text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-md">+{act.xp} XP</span>
                )}
             </div>
          ))}
       </div>
    </section>
  );
};
