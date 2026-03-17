
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, DailyCheckIn, ActionPlan } from '../types';
import { generateBehaviorInsightAI } from '../services/geminiService';
import { useSelectedChild } from '../contexts/SelectedChildContext';
import { supabase } from '../services/supabase';
import { awardXp } from '../services/gamificationService';

interface Props {
  children: Child[];
  checkIns: DailyCheckIn[];
}

const ActionPlanPage: React.FC<Props> = ({ children, checkIns }) => {
  const navigate = useNavigate();
  const { selectedChild } = useSelectedChild();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [xpGained, setXpGained] = useState<number | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndSavePlan = async (child: Child) => {
    console.error("[ActionPlan] STARTING generateAndSavePlan for:", child.id); // Error level for visibility
    if (isGenerating) {
      console.warn("[ActionPlan] Generation already in progress. Skipping.");
      return;
    }
    setIsGenerating(true);
    setLoading(true);
    
    // Safety timeout to ensure spinner doesn't stick forever
    const safetyTimeout = setTimeout(() => {
        console.error("[ActionPlan] Safety timeout triggered (45s) - forcing stop loading");
        setLoading(false);
        setIsGenerating(false);
    }, 45000); // Increased to 45 seconds for cold starts

    try {
      // Filter checkins for specific child
      const childCheckIns = checkIns.filter(c => c.childId === child.id);
      console.error(`[ActionPlan] Checkins count: ${childCheckIns.length}`);
      
      const aiResult = await generateBehaviorInsightAI(child, childCheckIns);
      console.error("[ActionPlan] AI Result received:", aiResult ? "YES" : "NO");
      if (aiResult) {
          console.error("[ActionPlan] AI Summary Preview:", aiResult.summary?.substring(0, 50) + "...");
      }
      
      // Convert string tasks to object tasks
      const structuredTasks = aiResult.tasks.map((t: string) => ({
        id: Math.random().toString(36).substr(2, 9),
        description: t,
        completed: false
      }));

      // Save to DB with Timeout Race
      const savePromise = supabase
        .from('action_plans')
        .insert({
          child_id: child.id,
          summary: aiResult.summary,
          tasks: structuredTasks,
          alert: aiResult.alert,
          active: true
        })
        .select()
        .single();
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("DB_TIMEOUT")), 8000)
      );

      let data, error;
      try {
        const result: any = await Promise.race([savePromise, timeoutPromise]);
        data = result.data;
        error = result.error;
      } catch (raceError) {
        console.error("[ActionPlan] DB Save timed out or failed:", raceError);
        error = raceError;
      }

      if (error) {
        console.error("Error saving plan (using local fallback):", error);
        // Fallback: Show generated plan even if save failed
        setPlan({
          id: 'temp-' + Date.now(),
          childId: child.id,
          summary: aiResult.summary,
          tasks: structuredTasks,
          alert: aiResult.alert,
          createdAt: new Date().toISOString(),
          active: true
        });
        clearTimeout(safetyTimeout);
        return;
      }

      if (data) {
        console.error("[ActionPlan] Plan saved successfully:", data.id);
        setPlan({
          id: data.id,
          childId: data.child_id,
          summary: data.summary,
          tasks: data.tasks,
          alert: data.alert,
          createdAt: data.created_at,
          active: data.active
        });
      }
    } catch (err) {
      console.error("Error generating plan:", err);
    } finally {
      clearTimeout(safetyTimeout);
      setIsGenerating(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const fetchPlan = async () => {
      console.error("[ActionPlan] Fetching plan initiated..."); // Error level
      const activeChild = selectedChild || (children.length > 0 ? children[0] : null);
      
      if (activeChild) {
        console.error("[ActionPlan] Active child:", activeChild.id);
        if (mounted) setLoading(true);
        // 1. Check for active plan in DB
        const { data: existingPlan, error: fetchError } = await supabase
          .from('action_plans')
          .select('*')
          .eq('child_id', activeChild.id)
          .eq('active', true)
          .maybeSingle(); // Use maybeSingle instead of single to handle 0 rows gracefully

        // Ignore PGRST116 (multiple rows) by taking the most recent one if needed
        // But maybeSingle should handle 0 or 1. If multiple, it throws.
        // Let's use limit(1) with order to be safer against duplicates
        const { data: safePlan, error: safeError } = await supabase
           .from('action_plans')
           .select('*')
           .eq('child_id', activeChild.id)
           .eq('active', true)
           .order('created_at', { ascending: false })
           .limit(1)
           .maybeSingle();

        if (safeError) console.error("[ActionPlan] Error fetching existing plan:", safeError);
        else console.error("[ActionPlan] Existing plan query result:", safePlan ? "Found" : "Not Found");

        if (!mounted) return;

        if (safePlan) {
          const existingPlan = safePlan;
          // Check if plan is expired (7 days)
          const createdDate = new Date(existingPlan.created_at);
          const now = new Date();
          const diffDays = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

          // Validar integridade do plano
          const normalizeText = (text: string) => text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const summaryText = normalizeText(String(existingPlan.summary || ''));
          
          const errorPhrases = [
            'nao foi possivel gerar uma nova analise',
            'analise gerada, mas o resumo esta indisponivel',
            'resumo esta indisponivel',
            'tente novamente',
            'erro ao gerar'
          ];
          
          const isFallbackPlan = errorPhrases.some(phrase => summaryText.includes(phrase));
          
          // Force regeneration if tasks are dummy/fallback tasks
          // Strict check for the EXACT fallback array content
          const hasDummyTasks = existingPlan.tasks?.some((t: any) => {
             const desc = normalizeText(t.description || '');
             return desc === 'manter rotina' || 
                    desc === 'observar mudancas de humor' || 
                    desc === 'manter rotina de observacao';
          });

          const isPlanValid = existingPlan.summary && 
                              existingPlan.tasks && 
                              Array.isArray(existingPlan.tasks) && 
                              existingPlan.tasks.length > 0 && 
                              !isFallbackPlan &&
                              !hasDummyTasks;

          if (diffDays >= 7 || !isPlanValid) {
            console.error("[ActionPlan] Plano expirado ou inválido (Fallback detectado). Gerando novo...");
            // Archive old plan
            await supabase
              .from('action_plans')
              .update({ active: false })
              .eq('id', existingPlan.id);
            
            // Generate new one
            await generateAndSavePlan(activeChild);
          } else {
            console.error("[ActionPlan] Using existing valid plan.");
            // Use existing plan
            setPlan({
              id: existingPlan.id,
              childId: existingPlan.child_id,
              summary: existingPlan.summary,
              tasks: existingPlan.tasks, // Assumes tasks is stored as JSON array of objects
              alert: existingPlan.alert,
              createdAt: existingPlan.created_at,
              active: existingPlan.active
            });
            if (mounted) setLoading(false);
          }
        } else {
          console.error("[ActionPlan] No existing plan. Generating new one...");
          // Generate new plan
          await generateAndSavePlan(activeChild);
        }
      } else {
        console.error("[ActionPlan] No active child found.");
        if (mounted) setLoading(false);
      }
    };

    fetchPlan();
    
    return () => { mounted = false; };
  }, [selectedChild?.id]); // Only re-run when selected child changes

  const handleToggleTask = async (taskId: string) => {
    if (!plan || !selectedChild) return;

    const taskIndex = plan.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = plan.tasks[taskIndex];
    const newStatus = !task.completed;
    
    // Optimistic update
    const updatedTasks = [...plan.tasks];
    updatedTasks[taskIndex] = { 
      ...task, 
      completed: newStatus,
      completedAt: newStatus ? new Date().toISOString() : undefined
    };

    setPlan({ ...plan, tasks: updatedTasks });

    // DB Update
    const { error } = await supabase
      .from('action_plans')
      .update({ tasks: updatedTasks })
      .eq('id', plan.id);

    if (error) {
      console.error("Error updating task:", error);
      // Revert if error (omitted for brevity, but recommended)
      return;
    }

    // XP Reward logic
    if (newStatus) {
      const XP_REWARD = 10;
      await awardXp(selectedChild.id, 10, 'action_plan_task', { category: 'Comportamento' });
      setXpGained(XP_REWARD);
      setTimeout(() => setXpGained(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-background-dark text-white">
        <div className="size-24 mb-6 relative">
           <div className="absolute inset-0 border-4 border-primary/20 rounded-full"></div>
           <div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           <span className="material-symbols-outlined text-primary text-4xl absolute inset-0 flex items-center justify-center">psychology</span>
        </div>
        <h2 className="text-xl font-black mb-2">Analisando comportamentos...</h2>
        <p className="text-xs text-gray-400 italic">Nossa IA está cruzando dados para criar seu plano de ação personalizado.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-10 bg-gray-50 dark:bg-background-dark relative">
      {/* XP Toast */}
      {xpGained && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-yellow-400 text-black px-6 py-2 rounded-full font-black shadow-lg z-50 animate-bounce">
          +{xpGained} XP
        </div>
      )}

      <header className="p-6 pt-10 flex items-center justify-between gap-4 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
         <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-xl font-black text-primary">Plano de Ação IA</h1>
         </div>
         <button 
           onClick={() => {
             if (selectedChild) generateAndSavePlan(selectedChild);
           }}
           disabled={isGenerating || loading}
           className="text-xs font-bold text-primary hover:text-primary/80 disabled:opacity-50"
         >
           {isGenerating ? 'Gerando...' : 'Regenerar'}
         </button>
      </header>

      <main className="p-6 space-y-8">
        {plan?.alert && (
          <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-3xl border-2 border-red-500/20 flex gap-4 animate-shake">
             <span className="material-symbols-outlined text-red-500 shrink-0">report_problem</span>
             <div>
                <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1">Atenção Especial</p>
                <p className="text-sm font-bold text-red-700 dark:text-red-200">{plan.alert}</p>
             </div>
          </div>
        )}

        <section className="bg-white dark:bg-surface-dark p-6 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-soft">
           <div className="flex items-center gap-2 mb-4">
              <span className="material-symbols-outlined text-primary">analytics</span>
              <h3 className="text-xs font-black uppercase tracking-widest">Resumo de Padrões</h3>
           </div>
           {plan?.summary ? (
             <p className="text-sm font-medium leading-relaxed italic text-text-sub dark:text-gray-300">
               "{plan.summary}"
             </p>
           ) : (
             <div className="text-center py-4 text-gray-400">
               <p className="text-xs italic">Nenhum padrão identificado ainda.</p>
             </div>
           )}
        </section>

        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
             <h3 className="text-xl font-black">Próximos 7 Dias</h3>
             {plan?.createdAt && (
               <span className="text-[10px] font-bold text-gray-400">
                 Ciclo iniciado em: {new Date(plan.createdAt).toLocaleDateString()}
               </span>
             )}
           </div>
           
           <div className="space-y-3">
              {plan?.tasks.map((task, i) => (
                <div 
                  key={task.id || i} 
                  onClick={() => handleToggleTask(task.id)}
                  className={`flex gap-4 p-5 rounded-[32px] border shadow-sm items-center transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                    task.completed 
                      ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800' 
                      : 'bg-white dark:bg-surface-dark border-gray-100 dark:border-gray-800'
                  }`}
                >
                   <button 
                     className={`size-10 rounded-full flex items-center justify-center font-black text-xs shrink-0 transition-all active:scale-90 ${
                       task.completed 
                         ? 'bg-green-500 text-white shadow-glow' 
                         : 'bg-primary/10 text-primary hover:bg-primary/20'
                     }`}
                   >
                     {task.completed ? <span className="material-symbols-outlined">check</span> : i + 1}
                   </button>
                   <div className="flex-1">
                     <p className={`text-sm font-bold leading-tight ${task.completed ? 'text-green-800 dark:text-green-200 line-through opacity-70' : ''}`}>
                       {task.description}
                     </p>
                     {task.completed && (
                       <p className="text-[10px] text-green-600 font-bold mt-1">Concluído • +10 XP</p>
                     )}
                   </div>
                </div>
              ))}
           </div>
        </section>

        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl text-center">
           <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Aviso Importante</p>
           <p className="text-[10px] text-blue-600/60 dark:text-blue-200 leading-relaxed">
             Esta ferramenta auxilia no acompanhamento e não substitui diagnóstico profissional. Se os sinais persistirem, consulte um pediatra ou psicólogo infantil.
           </p>
        </div>
      </main>
    </div>
  );
};

export default ActionPlanPage;
