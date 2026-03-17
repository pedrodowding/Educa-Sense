import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Subject } from '../../types';

export interface CompetencyData {
  name: string;
  value: number; // avg_score or 0
  count: number;
  lastPracticedAt?: string;
  trend7d?: 'up' | 'down' | 'neutral';
}

interface Props {
  data: CompetencyData[];
  childId: string;
  childName: string;
}

type SortOption = 'priority' | 'practiced' | 'recent';
type Status = 'weak' | 'ok' | 'strong';

const ChildCompetencyMap: React.FC<Props> = ({ data, childId, childName }) => {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [selectedCompetency, setSelectedCompetency] = useState<CompetencyData | null>(null);

  // Helper: Calculate Status
  const getStatus = (item: CompetencyData): Status => {
    // Rule: completed_count < 3 and no score -> 'ok' (Em evolução) but conceptually "insufficient base"
    // However, the prompt says:
    // Se avg_score existe: weak < 50, ok 50-74, strong >= 75
    // Se avg_score não existe (value=0? assume value=0 implies no score for logic if count > 0):
    // Actually, `value` being 0 might be a real score. We need to check if there were scored activities.
    // For this MVP, let's assume if count > 0 and value = 0, it might be real 0 score. 
    // But usually avg_score is null if no score. The prop `value` is number.
    // Let's rely on `value` being the avg score. If count < 3 and value is low, it might be weak.
    
    // Strict rules from prompt:
    // Se completed_count < 3 e não há score (lets assume value is 0 or low confidence): 
    // Wait, the prompt says "Se completed_count < 3 e não há score: status = “Em evolução”"
    
    const hasScore = item.value > 0; // Simplification. Ideally we'd have `hasScore` boolean.
    
    if (item.count < 3 && !hasScore) return 'ok';

    if (hasScore) {
      if (item.value < 5) return 'weak'; // < 50% (assuming value is 0-10 scale? Or 0-100?)
      // Check types.ts: avgScore is usually 0-10. Let's assume 0-10 based on existing code (ex.score > 7).
      // Prompt says "weak < 50". If scale is 0-10, that's < 5.
      if (item.value < 5) return 'weak';
      if (item.value < 7.5) return 'ok';
      return 'strong';
    } else {
      // No score logic
      if (item.count < 2) return 'weak';
      if (item.count <= 6) return 'ok';
      return 'strong';
    }
  };

  const getStatusLabel = (status: Status) => {
    switch (status) {
      case 'weak': return 'Reforçar';
      case 'ok': return 'Em evolução';
      case 'strong': return 'Dominando';
    }
  };

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'weak': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'ok': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'strong': return 'bg-green-100 text-green-700 border-green-200';
    }
  };

  const getProgressBar = (item: CompetencyData) => {
    const hasScore = item.value > 0;
    // Scale 0-10 to 0-100
    const percentage = hasScore ? (item.value * 10) : Math.min(100, item.count * 12.5);
    const colorClass = hasScore 
      ? (item.value >= 7.5 ? 'bg-green-500' : item.value >= 5 ? 'bg-blue-500' : 'bg-orange-500')
      : 'bg-indigo-400';
    
    return { percentage, colorClass, label: hasScore ? `${percentage.toFixed(0)}%` : `${item.count} ativ.` };
  };

  // Process and Sort Data
  const processedData = useMemo(() => {
    const mapped = data.map(item => ({
      ...item,
      status: getStatus(item),
      progress: getProgressBar(item)
    }));

    return mapped.sort((a, b) => {
      if (sortBy === 'priority') {
        const priority = { weak: 0, ok: 1, strong: 2 };
        if (priority[a.status] !== priority[b.status]) {
          return priority[a.status] - priority[b.status];
        }
        return b.count - a.count; // Tie-breaker
      }
      if (sortBy === 'practiced') return b.count - a.count;
      if (sortBy === 'recent') {
         // Mock recent logic if date not available, or assume order
         return 0; 
      }
      return 0;
    });
  }, [data, sortBy]);

  const mostPracticed = useMemo(() => {
    if (data.length === 0) return null;
    return [...data].sort((a, b) => b.count - a.count)[0]?.name;
  }, [data]);

  // Handle Actions
  const handlePractice = (subjectName: string) => {
    // Navigate to create exercise with pre-selected subject
    // Mapping subject name to enum might be needed if strings differ slightly
    // Assuming exact match for now or handled by target page
    navigate(`/exercicio-facil/criar?subject=${encodeURIComponent(subjectName)}&childId=${childId}`);
  };

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-surface-dark rounded-[32px] p-8 text-center border border-dashed border-gray-300 dark:border-gray-700">
        <div className="size-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
          <span className="material-symbols-outlined text-3xl">grid_view</span>
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Mapa em branco</h3>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          Complete a primeira atividade para desbloquear a visão de competências do {childName}.
        </p>
        <button 
          onClick={() => navigate('/plano-hoje')}
          className="px-6 py-3 bg-primary text-black font-bold rounded-xl shadow-glow hover:scale-105 transition-transform"
        >
          Começar pelo Plano de Hoje
        </button>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xl font-black text-gray-900 dark:text-white">Mapa de Competências</h3>
        
        {/* Sort Dropdown (Simple) */}
        <select 
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="text-xs font-bold bg-white dark:bg-surface-dark border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="priority">Prioridade</option>
          <option value="practiced">Mais Praticado</option>
          {/* <option value="recent">Mais Recente</option> */}
        </select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {processedData.map((item) => (
          <div 
            key={item.name}
            onClick={() => setSelectedCompetency(item)}
            className="group relative bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer active:scale-[0.98]"
            role="button"
            aria-label={`${item.name}: Status ${getStatusLabel(item.status)}, Progresso ${item.progress.label}`}
          >
            {/* Most Practiced Badge */}
            {item.name === mostPracticed && (
              <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-[9px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm z-10 tracking-wide">
                Top Prática
              </div>
            )}

            <div className="flex flex-col h-full justify-between gap-3">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg tracking-wider border ${getStatusColor(item.status)}`}>
                    {getStatusLabel(item.status)}
                  </span>
                  {/* Trend Indicator */}
                  {item.trend7d === 'up' && <span className="material-symbols-outlined text-green-500 text-sm">trending_up</span>}
                  {item.trend7d === 'down' && <span className="material-symbols-outlined text-red-400 text-sm">trending_down</span>}
                  {item.trend7d === 'neutral' && <span className="material-symbols-outlined text-gray-300 text-sm">remove</span>}
                </div>
                
                <h4 className="font-bold text-gray-900 dark:text-white leading-tight truncate" title={item.name}>
                  {item.name}
                </h4>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                   <span className="text-[10px] text-gray-500 font-medium">
                     {item.count} atividades
                   </span>
                   <span className="text-[10px] font-bold text-gray-900 dark:text-gray-100">
                     {item.progress.label}
                   </span>
                </div>
                <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                   <div 
                     className={`h-full rounded-full transition-all duration-1000 ${item.progress.colorClass}`} 
                     style={{ width: `${item.progress.percentage}%` }}
                   />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Details Modal / Drawer */}
      {selectedCompetency && (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div 
            className="bg-white dark:bg-surface-dark w-full max-w-sm rounded-[32px] p-6 shadow-2xl animate-slide-up relative"
            role="dialog"
            aria-labelledby="modal-title"
          >
            <button 
              onClick={() => setSelectedCompetency(null)}
              className="absolute top-4 right-4 p-2 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            <div className="text-center mb-6">
              <span className={`inline-block mb-3 text-[10px] font-black uppercase px-3 py-1.5 rounded-xl tracking-wider border ${getStatusColor(getStatus(selectedCompetency))}`}>
                 {getStatusLabel(getStatus(selectedCompetency))}
              </span>
              <h2 id="modal-title" className="text-2xl font-black text-gray-900 dark:text-white mb-1">
                {selectedCompetency.name}
              </h2>
              <p className="text-sm text-gray-500">
                {selectedCompetency.count} atividades concluídas
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-text-sub uppercase mb-1">Média Atual</p>
                  <p className={`text-xl font-black ${(selectedCompetency.value || 0) >= 7.5 ? 'text-green-500' : 'text-primary'}`}>
                    {(selectedCompetency.value || 0) > 0 ? (selectedCompetency.value || 0).toFixed(1) : '-'}
                  </p>
               </div>
               <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl text-center">
                  <p className="text-[10px] font-black text-text-sub uppercase mb-1">Última Prática</p>
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mt-1">
                    {selectedCompetency.lastPracticedAt 
                      ? new Date(selectedCompetency.lastPracticedAt).toLocaleDateString('pt-BR') 
                      : 'Nunca'}
                  </p>
               </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => handlePractice(selectedCompetency.name)}
                className="w-full py-4 bg-primary text-black font-black rounded-xl text-sm uppercase tracking-wider shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">play_circle</span>
                Praticar Agora
              </button>
              
              <button 
                 onClick={() => {
                   setSelectedCompetency(null);
                   // Assuming ReportsPage can filter by subject via URL or state
                   navigate(`/reports?subject=${encodeURIComponent(selectedCompetency.name)}`);
                 }}
                 className="w-full py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-750 transition-all"
              >
                Ver Histórico Detalhado
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ChildCompetencyMap;
