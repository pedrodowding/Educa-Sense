
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Exercise, Child, Subject } from '../types';

interface Props {
  history: Exercise[];
  children: Child[];
}

const ReportsPage: React.FC<Props> = ({ history, children }) => {
  const navigate = useNavigate();
  const [selectedChildId, setSelectedChildId] = useState<string>(children[0]?.id || '');
  
  const activeChild = children.find(c => c.id === selectedChildId);
  
  const childHistory = useMemo(() => 
    history.filter(h => h.childName === activeChild?.name),
    [history, activeChild]
  );

  const stats = useMemo(() => {
    const scored = childHistory.filter(e => e.score !== undefined);
    const avg = scored.length > 0 
      ? scored.reduce((acc, curr) => acc + (curr.score || 0), 0) / scored.length 
      : 0;
    
    const subjects = Object.values(Subject).map(sub => {
      const subEx = childHistory.filter(h => h.subject === sub);
      const subScored = subEx.filter(e => e.score !== undefined);
      const subAvg = subScored.length > 0 
        ? subScored.reduce((acc, curr) => acc + (curr.score || 0), 0) / subScored.length 
        : 0;
      return { name: sub, avg: subAvg, count: subEx.length };
    }).filter(s => s.count > 0);

    return { total: childHistory.length, avg, subjects };
  }, [childHistory]);

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10 space-y-6">
        <div>
           <h1 className="text-3xl font-black text-primary leading-none">Relatórios</h1>
           <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Evolução Detalhada</p>
        </div>

        {/* Child Selector */}
        <div className="flex gap-3 overflow-x-auto no-scrollbar py-2">
           {children.map(c => (
             <button 
               key={c.id}
               onClick={() => setSelectedChildId(c.id)}
               className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 shrink-0 transition-all ${selectedChildId === c.id ? 'border-primary bg-primary/10' : 'border-gray-100 opacity-50'}`}
             >
                <img src={c.avatar} alt={c.name} className="size-6 rounded-full" />
                <span className="text-xs font-bold">{c.name}</span>
             </button>
           ))}
        </div>
      </header>

      <main className="px-6 space-y-8">
        {/* Metric Cards */}
        <section className="grid grid-cols-2 gap-4">
           <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft">
              <span className="material-symbols-outlined text-primary mb-2">assignment</span>
              <p className="text-2xl font-black">{stats.total}</p>
              <p className="text-[10px] font-bold text-text-sub uppercase">Atividades</p>
           </div>
           <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft">
              <span className="material-symbols-outlined text-yellow-500 mb-2">emoji_events</span>
              <p className="text-2xl font-black">{activeChild?.stars || 0}</p>
              <p className="text-[10px] font-bold text-text-sub uppercase">Estrelas</p>
           </div>
        </section>

        {/* Progress by Subject */}
        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Média por Matéria</h3>
           <div className="bg-white dark:bg-surface-dark p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-soft space-y-6">
              {stats.subjects.length > 0 ? stats.subjects.map((s, i) => (
                <div key={i} className="space-y-2">
                   <div className="flex justify-between items-end px-1">
                      <span className="font-bold text-sm">{s.name}</span>
                      <span className="text-[10px] font-black text-primary">{s.avg.toFixed(1)} / 10</span>
                   </div>
                   <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${s.avg > 7 ? 'bg-primary' : s.avg > 5 ? 'bg-yellow-400' : 'bg-red-400'}`}
                        style={{ width: `${s.avg * 10}%` }}
                      ></div>
                   </div>
                </div>
              )) : (
                <p className="text-center text-sm text-text-sub py-6 italic">Ainda não há exercícios suficientes para gerar dados.</p>
              )}
           </div>
        </section>

        {/* Recent Activity Table */}
        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Atividades Recentes</h3>
           <div className="flex flex-col gap-3">
              {childHistory.slice(0, 5).map((ex, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark p-4 rounded-2xl flex items-center justify-between border border-gray-100 dark:border-gray-800">
                   <div className="flex items-center gap-3">
                      <div className={`size-10 rounded-xl flex items-center justify-center text-white ${ex.completed ? 'bg-primary' : 'bg-gray-300'}`}>
                         <span className="material-symbols-outlined text-sm">{ex.completed ? 'check' : 'pending'}</span>
                      </div>
                      <div>
                         <p className="text-sm font-bold truncate w-32">{ex.title}</p>
                         <p className="text-[8px] font-black uppercase text-text-sub tracking-widest">{ex.subject}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-sm font-black text-primary">{ex.score?.toFixed(1) || '--'}</p>
                      <p className="text-[8px] text-gray-400 uppercase">{new Date(ex.createdAt).toLocaleDateString()}</p>
                   </div>
                </div>
              ))}
           </div>
        </section>
      </main>
    </div>
  );
};

export default ReportsPage;
