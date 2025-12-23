
import React from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark">
      {/* Navbar Minimalista */}
      <nav className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-black font-black">ES</div>
          <span className="font-black text-lg tracking-tight">Educa Sense</span>
        </div>
        <button 
          onClick={() => navigate('/login')}
          className="text-sm font-bold text-primary hover:underline"
        >
          Entrar
        </button>
      </nav>

      {/* Hero Section */}
      <header className="px-6 pt-10 pb-16 text-center space-y-6">
        <div className="inline-block bg-primary/10 px-4 py-2 rounded-full mb-4">
           <p className="text-[10px] font-black text-primary uppercase tracking-[2px]">Potencializado por Gemini 2.5</p>
        </div>
        <h1 className="text-5xl font-black leading-tight">
          O estudo do seu filho, <br/>
          <span className="text-primary italic">transformado</span> por IA.
        </h1>
        <p className="text-lg text-text-sub font-medium max-w-xs mx-auto">
          Crie exercícios personalizados, imprima atividades e acompanhe a evolução escolar em um só lugar.
        </p>
        <div className="pt-4">
          <button 
            onClick={() => navigate('/login')}
            className="w-full max-w-xs h-16 bg-primary text-black font-black text-xl rounded-2xl shadow-glow active:scale-95 transition-all"
          >
            Começar Grátis
          </button>
        </div>
      </header>

      {/* Features Pillars */}
      <section className="px-6 space-y-12 pb-20">
        <div className="space-y-4">
          <h2 className="text-xs font-black text-primary uppercase tracking-[4px]">Como funciona</h2>
          <div className="space-y-6">
            {[
              { 
                icon: 'auto_awesome', 
                title: 'Geração com IA', 
                desc: 'Nossa inteligência cria questões exclusivas baseadas na série, idade e matéria que seu filho mais precisa de ajuda.' 
              },
              { 
                icon: 'print', 
                title: 'Offline ou Online', 
                desc: 'Imprima PDFs profissionais ou deixe que seu filho resolva quizzes gamificados direto no tablet ou celular.' 
              },
              { 
                icon: 'insert_chart', 
                title: 'Relatórios Reais', 
                desc: 'Saiba exatamente onde ele está evoluindo e quais temas precisam de mais atenção para a próxima prova.' 
              }
            ].map((pilar, i) => (
              <div key={i} className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-soft flex gap-5">
                <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <span className="material-symbols-outlined">{pilar.icon}</span>
                </div>
                <div>
                  <h3 className="font-black text-lg mb-1">{pilar.title}</h3>
                  <p className="text-sm text-text-sub leading-relaxed">{pilar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing/Plans Section */}
        <div className="space-y-6">
           <h2 className="text-xs font-black text-primary uppercase tracking-[4px] px-1">Escolha seu plano</h2>
           <div className="bg-white dark:bg-surface-dark rounded-[40px] border-2 border-gray-100 dark:border-gray-800 overflow-hidden shadow-xl">
              <div className="p-8 border-b border-gray-50 dark:border-gray-800">
                 <h3 className="text-2xl font-black mb-2">Plano Grátis</h3>
                 <p className="text-text-sub text-sm mb-6">Explore o poder da IA no aprendizado.</p>
                 <p className="text-4xl font-black mb-8">R$ 0 <span className="text-sm font-medium text-text-sub">/mês</span></p>
                 <ul className="space-y-4">
                    <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-primary">check</span> 5 Exercícios por mês</li>
                    <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-primary">check</span> Quiz interativo básico</li>
                 </ul>
              </div>
              <div className="p-8 bg-primary/5">
                 <div className="flex justify-between items-center mb-2">
                    <h3 className="text-2xl font-black text-primary">Plano Premium</h3>
                    <span className="bg-primary text-black text-[10px] font-black px-3 py-1 rounded-full uppercase">RECOMENDADO</span>
                 </div>
                 <p className="text-text-sub text-sm mb-6">Acelere o aprendizado dos seus filhos.</p>
                 <p className="text-4xl font-black mb-8">R$ 29 <span className="text-sm font-medium text-text-sub">/mês</span></p>
                 <ul className="space-y-4 mb-8">
                    <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-primary">check</span> Exercícios Ilimitados</li>
                    <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-primary">check</span> Relatórios de evolução IA</li>
                    <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-primary">check</span> Até 5 crianças por conta</li>
                    <li className="flex items-center gap-3 text-sm font-medium"><span className="material-symbols-outlined text-primary">check</span> Exportação PDF Profissional</li>
                 </ul>
                 <button onClick={() => navigate('/login')} className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow">Assinar Premium</button>
              </div>
           </div>
        </div>
      </section>

      <footer className="p-10 bg-black text-white rounded-t-[48px] text-center space-y-6">
        <h3 className="text-2xl font-black">Pronto para começar?</h3>
        <p className="text-gray-400 text-sm">Junte-se a mais de 500 famílias que já usam o Educa Sense.</p>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">© 2025 Educa Sense • Inteligência para Famílias</p>
      </footer>
    </div>
  );
};

export default LandingPage;
