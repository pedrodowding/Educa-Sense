import React, { useEffect, useState } from 'react';
import { useSelectedChild } from '../../contexts/SelectedChildContext';
import { progressService, ProgressSummary, SubjectProgress, ProgressTimelineItem } from '../../services/progressService';
import { eduzinhoInsightsService } from '../../services/eduzinhoInsightsService';
import { ProgressChart } from './ProgressChart';
import { SubjectProgressCard } from './SubjectProgressCard';

interface Props {
  isPremium?: boolean;
  onUnlock?: () => void;
}

export const StudentProgressDashboard: React.FC<Props> = ({ isPremium = true, onUnlock }) => {
  const { selectedChild } = useSelectedChild();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [subjectProgress, setSubjectProgress] = useState<SubjectProgress[]>([]);
  const [timeline, setTimeline] = useState<ProgressTimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string>('');

  useEffect(() => {
    if (!selectedChild) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [sum, sub, time] = await Promise.all([
          progressService.getSummary(selectedChild.id),
          progressService.getBySubject(selectedChild.id),
          progressService.getTimeline(selectedChild.id)
        ]);

        setSummary(sum);
        setSubjectProgress(sub);
        setTimeline(time);
        setInsight(eduzinhoInsightsService.generateProgressInsight(sum, sub));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedChild?.id]);

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-40 bg-gray-100 rounded-3xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="h-64 bg-gray-100 rounded-3xl"></div>
           <div className="h-64 bg-gray-100 rounded-3xl"></div>
        </div>
      </div>
    );
  }

  if (!summary || summary.total_activities === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4 bg-white dark:bg-surface-dark rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm mx-4 mt-8">
        <div className="size-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
           <span className="material-symbols-outlined text-4xl text-gray-300">query_stats</span>
        </div>
        <h3 className="text-xl font-black text-gray-800 dark:text-white">Comece sua jornada!</h3>
        <p className="text-gray-500 max-w-md">
          Complete suas primeiras atividades para desbloquear seu painel de evolução e ver seu progresso aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* 1. Progresso Geral (Hero) */}
      <div className="bg-gradient-to-br from-primary to-primary-dark p-1 rounded-[40px] shadow-glow">
        <div className="bg-white dark:bg-surface-dark rounded-[36px] p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Circular Progress */}
            <div className="relative size-40 shrink-0">
               <svg className="size-full -rotate-90" viewBox="0 0 100 100">
                 <circle cx="50" cy="50" r="45" fill="none" stroke="#f3f4f6" strokeWidth="8" />
                 <circle 
                   cx="50" cy="50" r="45" fill="none" stroke="#13eca4" strokeWidth="8" 
                   strokeDasharray="283"
                   strokeDashoffset={283 - (283 * summary.completion_rate) / 100}
                   strokeLinecap="round"
                   className="transition-all duration-1000 ease-out"
                 />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                 <span className="text-3xl font-black text-gray-900 dark:text-white">{summary.completion_rate}%</span>
                 <span className="text-[10px] font-bold uppercase text-gray-400">Concluído</span>
               </div>
            </div>

            {/* Stats Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4 w-full">
               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                 <div className="flex items-center gap-2 mb-1 text-amber-500">
                   <span className="material-symbols-outlined">bolt</span>
                   <span className="text-[10px] font-black uppercase">XP Total</span>
                 </div>
                 <p className="text-2xl font-black text-gray-900 dark:text-white">{summary.total_xp}</p>
               </div>
               
               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                 <div className="flex items-center gap-2 mb-1 text-rose-500">
                   <span className="material-symbols-outlined">local_fire_department</span>
                   <span className="text-[10px] font-black uppercase">Streak</span>
                 </div>
                 <p className="text-2xl font-black text-gray-900 dark:text-white">{summary.streak_days} dias</p>
               </div>

               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                 <div className="flex items-center gap-2 mb-1 text-blue-500">
                   <span className="material-symbols-outlined">target</span>
                   <span className="text-[10px] font-black uppercase">Precisão</span>
                 </div>
                 <p className="text-2xl font-black text-gray-900 dark:text-white">{summary.average_accuracy}%</p>
               </div>

               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
                 <div className="flex items-center gap-2 mb-1 text-purple-500">
                   <span className="material-symbols-outlined">check_circle</span>
                   <span className="text-[10px] font-black uppercase">Feitos</span>
                 </div>
                 <p className="text-2xl font-black text-gray-900 dark:text-white">{summary.completed_activities}</p>
               </div>
            </div>
          </div>

          {/* Eduzinho Insight */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-4">
             <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-2xl">
               🤖
             </div>
             <div>
               <p className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-widest mb-1">Insight do Eduzinho</p>
               <p className="text-sm text-gray-700 dark:text-gray-200 font-medium leading-relaxed">"{insight}"</p>
             </div>
          </div>
        </div>
      </div>

      {/* 2. Charts & Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ProgressChart data={timeline} />
        <SubjectProgressCard data={subjectProgress} isLocked={!isPremium} onUnlock={onUnlock} />
      </div>
    </div>
  );
};
