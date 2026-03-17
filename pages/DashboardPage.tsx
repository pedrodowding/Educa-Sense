import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getWeeklySummary, getDayLabel } from '../services/reportUtils';
import { supabase } from '../services/supabase';
import { fetchGamificationLogs } from '../services/gamificationService';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { useDailyProgress } from '../hooks/useDailyProgress';
import { getUserTier } from '../billing/entitlements';
import { generateParentTipAI } from '../services/geminiService';
import { Guardian, Child, Exercise } from '../types';
import { AlbumStatusCard } from '../components/AlbumStatusCard';
import { PlanStatusCard } from '../components/PlanStatusCard';

interface Props {
  guardian: Guardian | null;
  children: Child[];
  history: Exercise[];
}

const DashboardPage: React.FC<Props> = ({ guardian, children, history }) => {
  const navigate = useNavigate();
  const { selectedChild, setSelectedChild } = useSelectedChild();
  const { dailyState, loading: progressLoading } = useDailyProgress();
  const [aiTip, setAiTip] = useState<string>("Analisando o perfil dos seus pequenos...");
  const [weeklyStats, setWeeklyStats] = useState<any>({ 
      count: 0, 
      topSubject: 'Ainda sem dados', 
      nextFocus: 'Matemática', 
      weeklyXp: 0,
      active_week: false
  });

  const currentTier = getUserTier();
  const isFree = currentTier === 'FREE';

  // --- Lógica para "Resumo da Semana" (Agora via reportUtils) ---
  useEffect(() => {
    const fetchSummary = async () => {
        if (!selectedChild) return;
        
        // Fetch XP Logs
        const xpLogs = await fetchGamificationLogs(selectedChild.id, 7) || [];
        
        // Fetch Activity Completions (Single Source of Truth)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(new Date().getDate() - 7);
        
        const { data: completions } = await supabase.from('activity_completions')
             .select('*')
             .eq('child_id', selectedChild.id)
             .gte('completed_date', sevenDaysAgo.toISOString().split('T')[0]);
             
        if (completions) {
            const summary = getWeeklySummary(completions, xpLogs);
            
            // Format for UI
            setWeeklyStats({
                count: summary.total_activity_completions,
                countLabel: summary.total_activity_completions === 0 && summary.total_checkins > 0 ? "Semana ativa via check-ins" : "Atividades",
                topSubject: summary.dominant_subject || (summary.active_week ? "Rotina e consistência" : "Ainda sem dados"),
                weeklyXp: summary.total_xp_week,
                active_week: summary.active_week
            });
        }
    };
    fetchSummary();
  }, [selectedChild]);

  useEffect(() => {
    const fetchTip = async () => {
      if (selectedChild) {
        const tip = await generateParentTipAI(selectedChild);
        setAiTip(tip);
      } else if (children.length > 0) {
        const tip = await generateParentTipAI(children[0]);
        setAiTip(tip);
      }
    };
    fetchTip();
  }, [selectedChild, children]);

  const firstName = guardian?.name?.split(' ')[0] || 'Usuário';

  // --- Lógica para "Seus Filhos" (Última atividade) ---
  const getChildStatus = (childId: string) => {
    const lastEx = history.find(h => h.childId === childId); 
    if (!lastEx) return "Sem atividades recentes";
    
    const date = new Date(lastEx.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays === 0) return "Atividade hoje";
    if (diffDays === 1) return "Atividade ontem";
    if (diffDays < 7) return `Atividade há ${diffDays} dias`;
    return `Última em ${date.toLocaleDateString('pt-BR')}`;
  };

  const saveInsight = () => {
    // Persist to LocalStorage for now (User Preference)
    localStorage.setItem('saved_insight', JSON.stringify({ text: aiTip, date: new Date().toISOString() }));
    alert('Insight salvo no dispositivo para ler depois!');
  };

  return (
    <div className="flex flex-col min-h-full pb-24 md:pb-10 bg-gray-50 dark:bg-black">
      {/* Header removido - gerenciado globalmente pelo DesktopHeader responsivo */}
      
      <main className="max-w-[1200px] mx-auto w-full px-4 md:px-8 py-6 md:py-10 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* === COLUNA ESQUERDA (Principal) === */}
        <div className="lg:col-span-8 space-y-6">
           
           {/* Boas Vindas Simplificadas */}
           <div className="space-y-1 mb-2">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white">Olá, {firstName} 👋</h1>
              <p className="text-sm text-gray-500 font-medium">Pronto para transformar o aprendizado de hoje?</p>
           </div>

           {/* 1. PLANO DE HOJE (Destaque Principal) */}
           <section className="bg-primary text-black p-6 md:p-8 rounded-[32px] shadow-glow relative overflow-hidden">
              <div className="relative z-10">
                 <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 opacity-80">
                      <span className="material-symbols-outlined text-sm">event_note</span>
                      <span className="text-[10px] font-black uppercase tracking-widest">Plano de hoje</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Seletor Rápido de Filhos */}
                        {children.length > 1 && (
                          <div className="flex -space-x-2">
                              {children.map(c => (
                                  <button 
                                      key={c.id} 
                                      onClick={(e) => { e.stopPropagation(); setSelectedChild(c); }}
                                      className={`size-8 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${selectedChild?.id === c.id ? 'border-white ring-2 ring-black/20 z-10 scale-110' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                      title={c.name}
                                  >
                                      <img src={c.avatar} className="w-full h-full object-cover" />
                                  </button>
                              ))}
                          </div>
                        )}

                        {/* Stepper Visual */}
                        <div className="flex gap-1.5">
                          {[0, 1, 2].map((step) => (
                            <div key={step} className={`h-2 w-8 rounded-full transition-colors ${
                              (dailyState?.stepsCount || 0) > step ? 'bg-black' : 'bg-black/20'
                            }`} />
                          ))}
                        </div>
                    </div>
                 </div>
                 
                 <div onClick={() => selectedChild && navigate(`/child/${selectedChild.id}`)} className={`mb-2 ${selectedChild ? 'cursor-pointer hover:opacity-80' : ''}`}>
                   <h3 className="text-2xl md:text-3xl font-black leading-tight">
                     {selectedChild ? `Meta para ${selectedChild.name}` : 'Meta do dia'}
                   </h3>
                 </div>
                 
                 <p className="text-sm font-medium mb-6 leading-relaxed opacity-90 max-w-md">
                    {(dailyState?.status === 'not_started' || !dailyState) && "Vamos começar? Complete 3 atividades rápidas para manter o ritmo."}
                    {dailyState?.status === 'in_progress' && `Você está no passo ${(dailyState.stepsCount || 0) + 1} de 3. Continue assim!`}
                    {dailyState?.status === 'done' && "Parabéns! Meta diária concluída com sucesso."}
                 </p>

                 <div className="flex flex-col sm:flex-row gap-3">
                   <button 
                     onClick={() => {
                       if (dailyState?.status === 'done') navigate('/resumo-hoje');
                       else navigate('/plano-hoje');
                     }}
                     className="bg-black text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-black/20"
                   >
                     <span className="material-symbols-outlined text-xl">
                        {dailyState?.status === 'done' ? 'emoji_events' : 'play_circle'}
                     </span>
                     {(dailyState?.status === 'not_started' || !dailyState) && "Começar Agora"}
                     {dailyState?.status === 'in_progress' && "Continuar Plano"}
                     {dailyState?.status === 'done' && "Ver Resumo"}
                   </button>
                   
                   <button 
                     onClick={() => navigate('/plano-hoje')}
                     className="px-6 py-4 rounded-2xl font-bold text-sm hover:bg-black/5 active:scale-95 transition-all text-black/70 flex items-center justify-center gap-2"
                   >
                     Ver passos
                   </button>
                 </div>
              </div>
              <span className="material-symbols-outlined absolute -right-8 -bottom-12 text-black/5 text-[180px] rotate-12 pointer-events-none">rocket_launch</span>
           </section>

           {/* 2. AÇÕES RÁPIDAS (Grid) */}
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Corrigir Foto (Destaque Secundário) */}
              <button 
                 onClick={() => navigate('/corrigir-foto')}
                 className="bg-white dark:bg-surface-dark p-5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left flex flex-col justify-between min-h-[140px] group"
               >
                 <div className="size-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">document_scanner</span>
                 </div>
                 <div>
                   <h4 className="font-black text-base text-gray-900 dark:text-white mb-1">Corrigir por Foto</h4>
                   <p className="text-xs text-gray-500 leading-tight">Envie uma foto da lição para correção instantânea.</p>
                 </div>
              </button>

              {/* Criar Atividade */}
              <button 
                 onClick={() => navigate('/exercicio-facil/criar')}
                 className="bg-white dark:bg-surface-dark p-5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left flex flex-col justify-between min-h-[140px] group"
               >
                 <div className="size-10 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined">auto_awesome</span>
                 </div>
                 <div>
                   <h4 className="font-black text-base text-gray-900 dark:text-white mb-1">Criar Atividade</h4>
                   <p className="text-xs text-gray-500 leading-tight">Gere exercícios personalizados com IA.</p>
                 </div>
              </button>
           </div>

           {/* 3. INSIGHT IA */}
           <section className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 relative overflow-hidden">
              <div className="flex items-center gap-2 mb-3">
                 <span className="material-symbols-outlined text-primary text-xl">lightbulb</span>
                 <h3 className="text-xs font-black uppercase tracking-widest text-primary">Dica da IA</h3>
              </div>
              <p className="text-sm md:text-base font-medium leading-relaxed text-gray-700 dark:text-gray-300 italic mb-4">
                 "{aiTip}"
              </p>
              <div className="flex gap-4">
                 <button onClick={saveInsight} className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-primary transition-colors">
                   Salvar Dica
                 </button>
              </div>
           </section>
        </div>

        {/* === COLUNA DIREITA (Sidebar) === */}
        <div className="lg:col-span-4 space-y-6">
           
           {/* 1. SEUS FILHOS */}
           <section className="space-y-3">
              <div className="flex justify-between items-center px-1">
                 <h3 className="text-lg font-black text-gray-900 dark:text-white">Seus Filhos</h3>
                 <button onClick={() => navigate('/settings')} className="text-[10px] font-black text-primary uppercase hover:underline">Gerenciar</button>
              </div>
              <div className="flex flex-col gap-3">
                 {children.length > 0 ? children.map(child => (
                   <div 
                     key={child.id}
                     onClick={() => navigate(`/child/${child.id}`)}
                     className="flex items-center gap-4 bg-white dark:bg-surface-dark p-3 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                   >
                      <div className="size-12 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shrink-0">
                         <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">{child.name}</h4>
                        <p className="text-xs text-gray-500 truncate">{getChildStatus(child.id)}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-300">chevron_right</span>
                   </div>
                 )) : (
                   <div className="p-4 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-2xl">
                     Nenhum filho cadastrado.
                   </div>
                 )}
              </div>
           </section>

           {/* NEW: MEU ÁLBUM */}
           <AlbumStatusCard />

           {/* 2. RESUMO SEMANAL */}
           <section className="bg-white dark:bg-surface-dark p-5 rounded-[24px] border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                 <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                    <span className="material-symbols-outlined text-lg">bar_chart</span>
                 </div>
                 <h3 className="text-sm font-black text-gray-900 dark:text-white">Resumo Semanal</h3>
              </div>
              
              {!weeklyStats.active_week ? (
                  <div className="text-center py-6">
                      <p className="text-xs text-gray-500 font-medium">Comece com um check-in hoje para ver seu resumo semanal.</p>
                  </div>
              ) : (
                  <div className="space-y-3">
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Atividades</span>
                        <div className="text-right">
                            <strong className="font-black text-gray-900 dark:text-white">{weeklyStats.count}</strong>
                            {weeklyStats.count === 0 && (
                                <p className="text-[8px] text-green-600 font-bold">Semana ativa via check-ins</p>
                            )}
                        </div>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">XP Ganho</span>
                        <strong className="font-black text-yellow-500">+{weeklyStats.weeklyXp} XP</strong>
                     </div>
                     <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Foco</span>
                        <strong className="font-black text-gray-900 dark:text-white truncate max-w-[120px]">{weeklyStats.topSubject}</strong>
                     </div>
                  </div>
              )}

              <button 
                onClick={() => navigate('/reports')}
                className="w-full mt-4 py-3.5 bg-gray-50 dark:bg-gray-800 text-xs font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Ver Relatórios
              </button>
           </section>

           {/* 0. PLAN STATUS CARD (Secondary) */}
           <PlanStatusCard />

           {/* Links Rápidos de Rodapé */}
           <div className="flex gap-2 flex-wrap justify-center opacity-50">
              <button onClick={() => navigate('/programas')} className="text-[10px] font-bold text-gray-500 hover:text-gray-900">Programas</button>
              <span className="text-[10px] text-gray-300">•</span>
              <button onClick={() => navigate('/settings')} className="text-[10px] font-bold text-gray-500 hover:text-gray-900">Configurações</button>
           </div>
        </div>

      </main>
    </div>
  );
};

export default DashboardPage;