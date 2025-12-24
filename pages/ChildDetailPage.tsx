
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Child, Exercise, Subject } from '../types';
import { generateParentTipAI } from '../services/geminiService';

interface Props {
  children: Child[];
  history: Exercise[];
}

const ChildDetailPage: React.FC<Props> = ({ children, history }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const child = children.find(c => c.id === id);
  const [aiSuggestion, setAiSuggestion] = useState<string>("Analisando evolução...");

  const childHistory = useMemo(() => 
    history.filter(h => h.childName === child?.name), 
    [history, child]
  );

  // Dados processados para a Mandala e Stats
  const stats = useMemo(() => {
    const subjects = Object.values(Subject);
    const performance = subjects.map(sub => {
      const subExercises = childHistory.filter(h => h.subject === sub && h.score !== undefined);
      const avg = subExercises.length > 0 
        ? subExercises.reduce((acc, curr) => acc + (curr.score || 0), 0) / subExercises.length 
        : 0;
      return { name: sub, value: avg, count: subExercises.length };
    });

    const totalScored = childHistory.filter(h => h.score !== undefined);
    const avgGlobal = totalScored.length > 0 
      ? totalScored.reduce((acc, curr) => acc + (curr.score || 0), 0) / totalScored.length 
      : 0;

    const favoriteSubject = [...performance].sort((a, b) => b.count - a.count)[0];
    const weakestSubject = [...performance].sort((a, b) => a.value - b.value)[0];

    return { performance, avgGlobal, favoriteSubject, weakestSubject };
  }, [childHistory]);

  useEffect(() => {
    const fetchTip = async () => {
      if (child) {
        const tip = await generateParentTipAI(child);
        setAiSuggestion(tip);
      }
    };
    fetchTip();
  }, [child]);

  if (!child) return null;

  // Função para gerar os pontos do Radar Chart (Mandala)
  const generateRadarPoints = (size: number) => {
    const center = size / 2;
    const radius = size * 0.35;
    const angleStep = (Math.PI * 2) / stats.performance.length;

    return stats.performance.map((s, i) => {
      const pointRadius = (s.value / 10) * radius;
      const x = center + pointRadius * Math.cos(i * angleStep - Math.PI / 2);
      const y = center + pointRadius * Math.sin(i * angleStep - Math.PI / 2);
      return `${x},${y}`;
    }).join(' ');
  };

  return (
    <div className="flex flex-col min-h-full pb-20 bg-background-light dark:bg-background-dark">
      {/* Header Compacto e Elegante */}
      <header className="p-6 pt-10 flex items-center justify-between sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-white dark:bg-surface-dark shadow-soft flex items-center justify-center">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col items-center">
           <img src={child.avatar} alt={child.name} className="size-12 rounded-2xl border-2 border-primary shadow-glow mb-1" />
           <h1 className="text-sm font-black">{child.name}</h1>
        </div>
        <button onClick={() => navigate('/settings')} className="size-10 rounded-full bg-white dark:bg-surface-dark shadow-soft flex items-center justify-center">
          <span className="material-symbols-outlined">edit</span>
        </button>
      </header>

      <main className="px-6 space-y-6">
        
        {/* Mandala de Desempenho (Radar Chart) */}
        <section className="bg-white dark:bg-surface-dark p-6 rounded-[40px] shadow-soft border border-gray-100 dark:border-gray-800 flex flex-col items-center relative overflow-hidden">
           <div className="absolute top-6 left-6 flex flex-col">
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Mapa de</span>
              <span className="text-xl font-black">Competências</span>
           </div>
           
           <div className="size-72 mt-8 relative flex items-center justify-center">
              <svg viewBox="0 0 200 200" className="size-full">
                {/* Grades Circulares */}
                {[0.2, 0.4, 0.6, 0.8, 1].map((scale, i) => (
                  <circle 
                    key={i} 
                    cx="100" cy="100" 
                    r={70 * scale} 
                    className="fill-none stroke-gray-100 dark:stroke-gray-800" 
                    strokeWidth="1" 
                  />
                ))}
                
                {/* Eixos */}
                {stats.performance.map((_, i) => {
                  const angle = (i * (Math.PI * 2)) / stats.performance.length - Math.PI / 2;
                  return (
                    <line 
                      key={i}
                      x1="100" y1="100"
                      x2={100 + 70 * Math.cos(angle)}
                      y2={100 + 70 * Math.sin(angle)}
                      className="stroke-gray-100 dark:stroke-gray-800"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Polígono de Performance */}
                <polygon 
                  points={generateRadarPoints(200)}
                  className="fill-primary/20 stroke-primary transition-all duration-1000"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                {/* Labels das Matérias */}
                {stats.performance.map((s, i) => {
                  const angle = (i * (Math.PI * 2)) / stats.performance.length - Math.PI / 2;
                  const x = 100 + 85 * Math.cos(angle);
                  const y = 100 + 85 * Math.sin(angle);
                  return (
                    <text 
                      key={i}
                      x={x} y={y}
                      textAnchor="middle"
                      className="fill-text-sub text-[8px] font-black uppercase tracking-tighter"
                    >
                      {s.name}
                    </text>
                  );
                })}
              </svg>

              {/* Centro - Nível */}
              <div className="absolute size-14 bg-white dark:bg-background-dark rounded-full shadow-glow flex flex-col items-center justify-center border-2 border-primary">
                 <span className="text-[8px] font-black uppercase text-text-sub leading-none">NÍVEL</span>
                 <span className="text-xl font-black text-primary leading-none">{Math.floor(child.xp / 100) + 1}</span>
              </div>
           </div>

           <div className="w-full mt-4 flex justify-around border-t border-gray-50 dark:border-gray-800 pt-4">
              <div className="text-center">
                 <p className="text-[10px] font-black text-text-sub uppercase">Média Global</p>
                 <p className="text-xl font-black text-primary">{stats.avgGlobal.toFixed(1)}</p>
              </div>
              <div className="text-center">
                 <p className="text-[10px] font-black text-text-sub uppercase">Concluídos</p>
                 <p className="text-xl font-black">{childHistory.length}</p>
              </div>
           </div>
        </section>

        {/* Principais Resultados */}
        <section className="grid grid-cols-2 gap-4">
           <div className="bg-white dark:bg-surface-dark p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 flex flex-col gap-2">
              <div className="size-8 rounded-xl bg-orange-100 text-orange-500 flex items-center justify-center">
                 <span className="material-symbols-outlined text-sm filled">favorite</span>
              </div>
              <div>
                 <p className="text-[10px] font-black text-text-sub uppercase">Mais Praticado</p>
                 <p className="font-bold text-sm truncate">{stats.favoriteSubject?.name || '---'}</p>
              </div>
           </div>
           <div className="bg-white dark:bg-surface-dark p-5 rounded-[32px] border border-gray-100 dark:border-gray-800 flex flex-col gap-2">
              <div className="size-8 rounded-xl bg-blue-100 text-blue-500 flex items-center justify-center">
                 <span className="material-symbols-outlined text-sm filled">trending_up</span>
              </div>
              <div>
                 <p className="text-[10px] font-black text-text-sub uppercase">Aproveitamento</p>
                 <p className="font-bold text-sm">{(stats.avgGlobal * 10).toFixed(0)}% Eficácia</p>
              </div>
           </div>
        </section>

        {/* AI Insight Pro */}
        <section className="bg-background-dark text-white p-6 rounded-[40px] shadow-glow relative overflow-hidden group">
           <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                 <div className="size-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm">auto_awesome</span>
                 </div>
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-primary">Análise Predictiva IA</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed italic text-gray-300">
                 "{aiSuggestion}"
              </p>
              <button 
                onClick={() => navigate('/exercicio-facil/criar')}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-primary hover:gap-3 transition-all"
              >
                Reforçar {stats.weakestSubject?.name} <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
           </div>
           <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-primary/5 text-[140px] rotate-12 group-hover:rotate-45 transition-transform duration-1000">psychology</span>
        </section>

        {/* Atividades Recentes por Matéria */}
        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Progresso Recente</h3>
           <div className="space-y-3">
              {childHistory.slice(0, 3).map((ex, i) => (
                <div key={i} className="bg-white dark:bg-surface-dark p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className="size-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-text-sub">
                         <span className="material-symbols-outlined text-sm">
                            {ex.subject === 'Matemática' ? 'calculate' : 'menu_book'}
                         </span>
                      </div>
                      <div>
                         <p className="text-sm font-bold">{ex.title}</p>
                         <p className="text-[10px] font-black uppercase text-text-sub tracking-widest">{ex.subject}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className={`text-lg font-black ${ex.score && ex.score > 7 ? 'text-primary' : 'text-orange-400'}`}>
                         {ex.score?.toFixed(1) || '--'}
                      </p>
                   </div>
                </div>
              ))}
              {childHistory.length === 0 && (
                <div className="text-center py-10 opacity-30">
                   <span className="material-symbols-outlined text-5xl">history</span>
                   <p className="text-xs font-bold mt-2">Sem histórico recente</p>
                </div>
              )}
           </div>
        </section>
      </main>
    </div>
  );
};

export default ChildDetailPage;
