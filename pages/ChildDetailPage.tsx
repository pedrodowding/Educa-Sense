
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Child, Exercise, Subject, ChildProgress } from '../types';
import { generateParentTipAI } from '../services/geminiService';
import ChildDevicesSection from './components/ChildDevicesSection';
import ChildCompetencyMap, { CompetencyData } from './components/ChildCompetencyMap';
import { progressService } from '../services/progressService';
import { schoolService } from '../services/schoolService';
import { BulletinBoard } from '../components/school/BulletinBoard';

interface Props {
  children: Child[];
  history: Exercise[];
}

const ChildDetailPage: React.FC<Props> = ({ children, history }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const child = children.find(c => c.id === id);
  const [aiSuggestion, setAiSuggestion] = useState<string>("Analisando evolução...");
  const [progress, setProgress] = useState<ChildProgress | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<{ schoolId: string; classId?: string } | null>(null);

  // Buscar dados consolidados do progresso (Tabela child_progress)
  useEffect(() => {
    if (child?.id) {
      setLoadingProgress(true);
      progressService.getChildProgress(child.id)
        .then(data => setProgress(data))
        .finally(() => setLoadingProgress(false));
      
      // Buscar vínculo escolar
      schoolService.getSchoolInfoForChild(child.id)
        .then(info => setSchoolInfo(info));
    }
  }, [child?.id]);


  const childHistory = useMemo(() => 
    history.filter(h => h.childId === child?.id), 
    [history, child]
  );

  // Dados processados para a Mandala e Stats
  const stats = useMemo(() => {
    const subjects = Object.values(Subject);
    
    const performance: CompetencyData[] = subjects.map(sub => {
      // Cálculo via histórico local
      const subExercises = childHistory.filter(h => h.subject === sub);
      
      // Ordenar por data para pegar o último
      const sorted = [...subExercises].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastPracticedAt = sorted[0]?.createdAt;

      // Calcular Trend (Simples: Atividade nos últimos 7 dias?)
      // Idealmente compararia média da semana atual vs anterior, mas vamos simplificar
      // Se praticou nos últimos 7 dias e score > 6 = up, se score < 5 = down
      // Se não praticou = neutral
      const now = new Date();
      const last7d = sorted.filter(h => (now.getTime() - new Date(h.createdAt).getTime()) < 7 * 24 * 3600 * 1000);
      
      let trend7d: 'up' | 'down' | 'neutral' = 'neutral';
      if (last7d.length > 0) {
         const avgRecent = last7d.reduce((acc, curr) => acc + (curr.score || 0), 0) / last7d.length;
         if (avgRecent >= 7) trend7d = 'up';
         else if (avgRecent <= 5) trend7d = 'down';
         else trend7d = 'neutral'; // Stable
      }

      const scored = subExercises.filter(h => h.score !== undefined);
      
      const avg = scored.length > 0 
        ? scored.reduce((acc, curr) => acc + (curr.score || 0), 0) / scored.length 
        : 0;

      return { 
        name: sub, 
        value: avg, 
        count: subExercises.length, 
        lastPracticedAt,
        trend7d
      };
    });

    // Totais Globais
    const totalCount = progress ? progress.totalActivities : performance.reduce((acc, curr) => acc + curr.count, 0);
    
    const avgGlobal = progress?.avgScore !== undefined && progress.avgScore > 0
      ? Number(progress.avgScore)
      : (totalCount > 0
          ? performance.reduce((acc, curr) => acc + (curr.value * curr.count), 0) / Math.max(1, performance.reduce((acc,c) => acc + c.count, 0))
          : 0);
    
    const currentLevel = progress?.currentLevel || 1;

    const favoriteSubject = [...performance].sort((a, b) => b.count - a.count)[0];
    const weakestSubject = [...performance].sort((a, b) => a.value - b.value)[0];

    return { performance, avgGlobal, favoriteSubject, weakestSubject, totalCount, currentLevel };
  }, [childHistory, progress]);

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
           <p className="text-[10px] font-bold text-text-sub uppercase tracking-wide mt-1">Visão geral de progresso e competências</p>
           {stats.totalCount === 0 ? (
               <p className="text-[10px] text-text-sub/70 mt-1 max-w-[240px] text-center leading-tight">Dados iniciais. A evolução aparece conforme as atividades são feitas.</p>
           ) : (
               <p className="text-[10px] text-green-600 font-bold mt-1 animate-pulse">
                   {stats.totalCount} atividades concluídas!
               </p>
           )}
        </div>
        <button onClick={() => navigate('/settings')} className="size-10 rounded-full bg-white dark:bg-surface-dark shadow-soft flex items-center justify-center">
          <span className="material-symbols-outlined">edit</span>
        </button>
      </header>

      <main className="px-6 space-y-6">
        
        {/* Banner Plano de Hoje */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="material-symbols-outlined text-sm text-blue-600">event_note</span>
              <h2 className="text-xs font-black uppercase tracking-wider text-blue-700">Plano de hoje</h2>
            </div>
            <p className="text-xs text-blue-800 font-medium">
              As atividades diárias alimentam estes indicadores.
            </p>
          </div>
          <button 
            onClick={() => navigate('/plano-hoje')}
            className="text-blue-700 text-[10px] font-bold underline active:scale-95 transition-all whitespace-nowrap ml-2"
          >
            Ir para Plano
          </button>
        </div>

        {/* Mapa de Competências 2.0 */}
        <ChildCompetencyMap 
           data={stats.performance} 
           childId={child.id} 
           childName={child.name} 
        />

        {/* Resumo Global (Extraído da antiga Mandala) */}
        <section className="flex justify-around bg-white dark:bg-surface-dark p-4 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="text-center">
                <p className="text-[10px] font-black text-text-sub uppercase">Nível Atual</p>
                <p className="text-xl font-black text-primary">{stats.currentLevel}</p>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-gray-800 pl-6">
                <p className="text-[10px] font-black text-text-sub uppercase">Média Global</p>
                <p className={`font-black ${stats.avgGlobal === 0 ? 'text-[10px] text-text-sub uppercase tracking-wider mt-1' : 'text-xl text-primary'}`}>
                  {stats.avgGlobal === 0 ? 'Em construção' : stats.avgGlobal.toFixed(1)}
                </p>
            </div>
            <div className="text-center border-l border-gray-100 dark:border-gray-800 pl-6">
                <p className="text-[10px] font-black text-text-sub uppercase">Concluídos</p>
                <p className="text-xl font-black">{stats.totalCount}</p>
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
                 <p className={`font-bold ${stats.avgGlobal === 0 ? 'text-[10px] text-text-sub uppercase' : 'text-sm'}`}>
                   {stats.avgGlobal === 0 ? 'Dados insuficientes' : `${(stats.avgGlobal * 10).toFixed(0)}% Eficácia`}
                 </p>
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

        {schoolInfo && (
           <section className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-[40px] border border-blue-100 dark:border-gray-800">
             <BulletinBoard 
               schoolId={schoolInfo.schoolId} 
               classId={schoolInfo.classId}
               role="guardian" 
             />
           </section>
        )}

        <ChildDevicesSection childId={child.id} />

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
                      <p className={`font-black ${!ex.score ? 'text-[10px] text-text-sub uppercase' : (ex.score > 7 ? 'text-lg text-primary' : 'text-lg text-orange-400')}`}>
                         {!ex.score ? 'Em análise' : ex.score.toFixed(1)}
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
