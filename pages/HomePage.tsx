
import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-full">
      <header className="p-6 pt-10 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-primary leading-none">Educa Sense</h1>
          <p className="text-xs font-bold text-text-sub uppercase tracking-[3px] mt-1">Plataforma Educacional</p>
        </div>
        <div className="size-14 rounded-2xl bg-gray-200 overflow-hidden border-2 border-primary rotate-3">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Parent" alt="Avatar" />
        </div>
      </header>

      <main className="flex-1 px-6 space-y-8">
        {/* Banner de Boas-vindas */}
        <section className="bg-primary/10 rounded-[40px] p-8 border border-primary/20 relative overflow-hidden">
           <div className="relative z-10">
              <h2 className="text-2xl font-black mb-1">Olá, Família!</h2>
              <p className="text-sm text-text-sub font-medium mb-6">Prontos para a aula de hoje?</p>
              <div className="flex items-center gap-3 bg-white/50 backdrop-blur-sm p-3 rounded-2xl">
                 <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-black">
                    <span className="material-symbols-outlined text-xl">trending_up</span>
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-gray-500">Progresso Semanal</p>
                    <p className="text-sm font-bold">85% das metas atingidas</p>
                 </div>
              </div>
           </div>
           <span className="material-symbols-outlined absolute -right-6 -bottom-6 text-primary/10 text-[160px] rotate-12">school</span>
        </section>

        {/* Programa Principal */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-black">Programas Ativos</h3>
            <span className="text-[10px] font-black text-primary uppercase tracking-widest cursor-pointer">Ver Todos</span>
          </div>
          
          <button 
            onClick={() => navigate('/exercicio-facil')}
            className="w-full text-left bg-surface-light dark:bg-surface-dark rounded-[40px] p-2 shadow-soft border border-gray-100 dark:border-gray-800 overflow-hidden group active:scale-[0.98] transition-all"
          >
            <div className="flex flex-col">
              <div className="h-48 bg-gray-100 dark:bg-gray-800 relative overflow-hidden rounded-[32px]">
                <img 
                  src="https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop" 
                  alt="Exercício Fácil" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-primary text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg">Programa Oficial</span>
                  <span className="bg-white/90 backdrop-blur-md text-black text-[10px] font-black px-4 py-1.5 rounded-full uppercase shadow-lg">Exercício Fácil</span>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-2xl font-black">Reforço com IA</h4>
                  <div className="size-10 rounded-full bg-primary flex items-center justify-center text-black">
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </div>
                </div>
                <p className="text-sm text-text-sub dark:text-gray-400 leading-relaxed font-medium">Gere atividades personalizadas para Português, Matemática e Ciências em segundos.</p>
              </div>
            </div>
          </button>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
