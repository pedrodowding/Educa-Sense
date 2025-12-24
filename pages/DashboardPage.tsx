
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Guardian, Child } from '../types';
import { generateParentTipAI } from '../services/geminiService';

interface Props {
  guardian: Guardian | null;
  children: Child[];
}

const DashboardPage: React.FC<Props> = ({ guardian, children }) => {
  const navigate = useNavigate();
  const [aiTip, setAiTip] = useState<string>("Analisando o perfil dos seus pequenos...");

  useEffect(() => {
    const fetchTip = async () => {
      if (children.length > 0) {
        const tip = await generateParentTipAI(children[0]);
        setAiTip(tip);
      }
    };
    fetchTip();
  }, [children]);

  return (
    <div className="flex flex-col min-h-full pb-10">
      <header className="p-6 pt-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary leading-none">Olá, {guardian?.name.split(' ')[0]}!</h1>
          <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Sua visão geral</p>
        </div>
        <button 
          onClick={() => navigate('/perfil')}
          className="size-14 rounded-2xl bg-gray-200 overflow-hidden border-2 border-primary rotate-3 transition-transform active:scale-90"
        >
          <img src={guardian?.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Parent"} alt="Avatar" />
        </button>
      </header>

      <main className="flex-1 px-6 space-y-8">
        {/* Child Selection Horizontal */}
        <section className="space-y-4">
           <div className="flex justify-between items-center px-1">
              <h3 className="text-xl font-black">Seus Filhos</h3>
              <button onClick={() => navigate('/settings')} className="text-[10px] font-black text-primary uppercase">Gerenciar</button>
           </div>
           <div className="flex gap-4 overflow-x-auto no-scrollbar py-2">
              {children.map(child => (
                <button 
                  key={child.id}
                  onClick={() => navigate(`/child/${child.id}`)}
                  className="flex flex-col items-center gap-2 shrink-0 bg-white dark:bg-surface-dark p-4 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft min-w-[120px] active:scale-95 transition-all"
                >
                   <div className="size-16 rounded-2xl overflow-hidden border-2 border-primary/20">
                      <img src={child.avatar} alt={child.name} className="w-full h-full object-cover" />
                   </div>
                   <span className="font-black text-sm">{child.name}</span>
                   <div className="flex gap-1">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">Ver Detalhes</span>
                   </div>
                </button>
              ))}
           </div>
        </section>

        {/* AI Insight Card */}
        <section className="bg-background-dark dark:bg-primary/5 rounded-[40px] p-6 border-2 border-primary/20 relative overflow-hidden text-white dark:text-gray-100">
           <div className="relative z-10 space-y-3">
              <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">psychology</span>
                 <h3 className="text-xs font-black uppercase tracking-widest text-primary">Insight da Educa IA</h3>
              </div>
              <p className="text-sm font-medium leading-relaxed italic">
                 "{aiTip}"
              </p>
              <button onClick={() => navigate('/programas')} className="text-[10px] font-black uppercase text-primary underline">Ver programas</button>
           </div>
           <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-primary/5 text-[120px] rotate-12">lightbulb</span>
        </section>

        {/* Program Highlights */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black">Programas Ativos</h3>
            <button onClick={() => navigate('/programas')} className="text-[10px] font-black text-primary uppercase">Ver Todos</button>
          </div>
          
          <button 
            onClick={() => navigate('/exercicio-facil')}
            className="w-full text-left bg-white dark:bg-surface-dark rounded-[40px] p-2 shadow-soft border border-gray-100 dark:border-gray-800 active:scale-[0.98] transition-all"
          >
            <div className="flex flex-col">
              <div className="h-40 bg-gray-100 dark:bg-gray-800 relative overflow-hidden rounded-[32px]">
                <img 
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop" 
                  className="w-full h-full object-cover"
                  alt="Reforço IA"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-5 left-5">
                  <h4 className="text-white text-2xl font-black">Reforço IA</h4>
                  <p className="text-primary text-[10px] font-black uppercase tracking-widest">Personalize o aprendizado</p>
                </div>
              </div>
            </div>
          </button>
        </section>
      </main>
    </div>
  );
};

export default DashboardPage;
