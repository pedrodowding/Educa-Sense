
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child, DailyCheckIn, ActionPlan } from '../types';
import { generateBehaviorInsightAI } from '../services/geminiService';

interface Props {
  children: Child[];
  checkIns: DailyCheckIn[];
}

const ActionPlanPage: React.FC<Props> = ({ children, checkIns }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<ActionPlan | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      if (children.length > 0) {
        const result = await generateBehaviorInsightAI(children[0], checkIns);
        setPlan(result);
        setLoading(false);
      }
    };
    fetchPlan();
  }, [children, checkIns]);

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
    <div className="flex flex-col min-h-full pb-10 bg-gray-50 dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center gap-4 bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
         <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
         </button>
         <h1 className="text-xl font-black text-primary">Plano de Ação IA</h1>
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
           <p className="text-sm font-medium leading-relaxed italic text-text-sub dark:text-gray-300">
             "{plan?.summary}"
           </p>
        </section>

        <section className="space-y-4">
           <h3 className="text-xl font-black px-1">Próximos 7 Dias</h3>
           <div className="space-y-3">
              {plan?.tasks.map((task, i) => (
                <div key={i} className="flex gap-4 p-5 bg-white dark:bg-surface-dark rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm items-center">
                   <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0">{i + 1}</div>
                   <p className="text-sm font-bold leading-tight">{task}</p>
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
