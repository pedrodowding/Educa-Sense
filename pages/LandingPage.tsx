import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PLAN_CONFIG } from '../config/plans';
import { SEO } from '../components/SEO';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleStart = () => navigate('/login');

  return (
    <div className="flex flex-col min-h-screen bg-background-light dark:bg-background-dark font-sans text-text-main overflow-x-hidden">
      <SEO 
        title="Educa Sense - Exercício Fácil" 
        description="Plataforma de reforço escolar com IA. Crie exercícios personalizados para seu filho em minutos. Acompanhe a evolução em Português, Matemática e muito mais."
        image="/og-image.jpg"
      />
      
      {/* 1. HEADER (Fixed) */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer shrink-0" onClick={() => navigate('/')}>
            <div className="size-8 bg-primary rounded-lg flex items-center justify-center text-black font-black shadow-sm text-sm">ES</div>
            <span className="font-black text-lg sm:text-xl tracking-tight">Educa Sense</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-bold text-gray-500 hover:text-primary transition-colors"
            >
              Como funciona
            </button>
            <button 
              onClick={() => document.getElementById('recursos')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-bold text-gray-500 hover:text-primary transition-colors"
            >
              Recursos
            </button>
            <button 
              onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-bold text-gray-500 hover:text-primary transition-colors"
            >
              Planos
            </button>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            <button 
              onClick={() => navigate('/login')}
              className="hidden sm:block text-xs sm:text-sm font-bold text-text-main hover:text-primary transition-colors px-2 py-2"
            >
              Entrar
            </button>
            <button 
              onClick={handleStart}
              className="px-4 py-2 sm:px-5 sm:py-2.5 bg-primary text-black font-black text-xs sm:text-sm rounded-xl shadow-glow hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
            >
              Começar Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Spacer for Fixed Header */}
      <div className="h-16 sm:h-20"></div>

      {/* 2. HERO SECTION */}
      <header className="relative overflow-hidden pt-8 pb-12 sm:pt-12 sm:pb-20 lg:pt-24 lg:pb-32 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          
          {/* Text Content */}
          <div className="text-center lg:text-left space-y-6 sm:space-y-8 z-10 relative order-1 lg:order-none">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest mx-auto lg:mx-0">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                Potencializado por IA
              </div>
              <h1 className="text-3xl sm:text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-gray-900 dark:text-white">
                O estudo do seu filho, <span className="text-primary italic block sm:inline">transformado</span> por IA.
              </h1>
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0 px-2 sm:px-0">
                Crie exercícios personalizados em minutos e acompanhe a evolução escolar sem complicação.
              </p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleStart}
                className="w-full sm:w-auto px-6 sm:px-8 h-14 sm:h-16 bg-primary text-black font-black text-base sm:text-lg rounded-2xl shadow-glow hover:translate-y-[-2px] active:translate-y-[1px] transition-all flex items-center justify-center gap-2 mx-auto lg:mx-0"
              >
                <span>Criar exercício grátis</span>
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
              <div className="flex flex-wrap justify-center lg:justify-start gap-x-4 gap-y-2 text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wide px-4">
                <span className="flex items-center gap-1"><span className="size-1 bg-primary rounded-full"></span> Sem cartão</span>
                <span className="flex items-center gap-1"><span className="size-1 bg-primary rounded-full"></span> 2 minutos</span>
                <span className="flex items-center gap-1"><span className="size-1 bg-primary rounded-full"></span> Infantil e Fundamental</span>
              </div>
            </div>
          </div>

          {/* Mockup / Visual */}
          <div className="relative mx-auto lg:mx-0 w-full max-w-sm sm:max-w-md lg:max-w-full order-2 lg:order-none mt-4 lg:mt-0">
            <div className="aspect-[4/5] bg-gray-100 dark:bg-surface-dark rounded-[32px] sm:rounded-[40px] border-4 border-white dark:border-gray-800 shadow-2xl relative overflow-hidden flex flex-col transform hover:rotate-1 transition-transform duration-500">
               
               {/* Header do App Simulado */}
               <div className="h-14 sm:h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between px-4 sm:px-6">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-xl">school</span>
                    <span className="font-black text-sm text-gray-800 dark:text-white">Matemática • 2º Ano</span>
                  </div>
                  <div className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs filled">star</span> 150 XP
                  </div>
               </div>

               {/* Conteúdo do Quiz */}
               <div className="flex-1 p-4 sm:p-6 flex flex-col">
                  
                  {/* Pergunta */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm mb-4 border border-gray-50 dark:border-gray-700 relative">
                     <div className="absolute -top-3 -left-3 size-8 bg-primary text-black rounded-lg flex items-center justify-center font-black text-xs shadow-sm">1</div>
                     <p className="text-gray-800 dark:text-gray-200 font-bold text-sm sm:text-base leading-relaxed mt-1">
                       O Dragão Dino tinha <span className="text-primary">3 maçãs</span>. Ele encontrou mais <span className="text-primary">2 maçãs</span> mágicas na floresta. Quantas maçãs o Dino tem agora?
                     </p>
                  </div>

                  {/* Ilustração da Questão (Emojis) */}
                  <div className="flex justify-center gap-4 py-4 text-4xl animate-bounce">
                    🍎 🍎 🍎 + 🍏 🍏
                  </div>

                  {/* Opções de Resposta */}
                  <div className="space-y-2 mt-auto">
                     <button className="w-full h-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600 font-bold text-gray-600 dark:text-gray-300 transition-all text-sm flex items-center px-4">
                       A) 4 maçãs
                     </button>
                     <button className="w-full h-12 bg-primary text-black rounded-xl font-bold transition-all text-sm flex items-center justify-between px-4 shadow-glow transform scale-[1.02]">
                       <span>B) 5 maçãs</span>
                       <span className="material-symbols-outlined filled">check_circle</span>
                     </button>
                     <button className="w-full h-12 bg-white dark:bg-gray-800 rounded-xl border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600 font-bold text-gray-600 dark:text-gray-300 transition-all text-sm flex items-center px-4">
                       C) 6 maçãs
                     </button>
                  </div>

                  {/* Feedback */}
                  <div className="mt-4 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-xl flex items-center gap-2 animate-pulse">
                    <span className="material-symbols-outlined filled">celebration</span>
                    <span className="text-xs font-black uppercase">Resposta Correta! +10 XP</span>
                  </div>
               </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute -z-10 top-10 -right-10 size-48 sm:size-64 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute -z-10 -bottom-10 -left-10 size-48 sm:size-64 bg-blue-500/20 rounded-full blur-3xl"></div>
          </div>

        </div>
      </header>

      {/* 3. SOCIAL PROOF */}
      <section className="py-8 sm:py-12 bg-white dark:bg-surface-dark border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <div className="flex justify-center gap-1 text-yellow-400">
            {[1,2,3,4,5].map(i => <span key={i} className="material-symbols-outlined filled text-xl sm:text-2xl">star</span>)}
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-gray-900 dark:text-white px-4">
            "Mais de 500 famílias já usam o Educa Sense para estudar com mais clareza."
          </h2>
          <div className="flex items-center justify-center gap-3">
            <div className="size-8 sm:size-10 bg-gray-200 rounded-full overflow-hidden">
               <img 
                 src="https://api.dicebear.com/9.x/avataaars/svg?seed=Maria" 
                 alt="User" 
                 width="40" 
                 height="40"
                 className="w-full h-full object-cover"
               />
            </div>
            <div className="text-left">
              <p className="text-xs sm:text-sm font-bold">Maria Silva</p>
              <p className="text-[10px] sm:text-xs text-gray-500">Mãe de aluno do 4º ano</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. COMO FUNCIONA */}
      <section id="como-funciona" className="py-12 sm:py-20 px-4 sm:px-6 scroll-mt-24">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
          <div className="text-center space-y-2 sm:space-y-4">
            <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[4px]">Passo a Passo</h2>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black">Como funciona o Educa Sense?</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { 
                step: '01',
                title: 'Informe série e matéria', 
                desc: 'Nossa IA cria questões exclusivas baseadas exatamente no que seu filho precisa aprender.',
                icon: 'edit_note' 
              },
              { 
                step: '02',
                title: 'Resolva online ou imprima', 
                desc: 'Escolha entre quizzes gamificados no celular ou atividades em PDF para imprimir.',
                icon: 'devices' 
              },
              { 
                step: '03',
                title: 'Acompanhe a evolução', 
                desc: 'Receba relatórios simples que mostram onde seu filho está indo bem e onde precisa de ajuda.',
                icon: 'monitoring' 
              }
            ].map((item, i) => (
              <div key={i} className="relative p-6 sm:p-8 rounded-[24px] sm:rounded-[32px] bg-white dark:bg-surface-dark border border-gray-100 dark:border-gray-800 shadow-soft group hover:-translate-y-1 transition-transform duration-300">
                <div className="absolute top-6 right-6 sm:top-8 sm:right-8 text-5xl sm:text-6xl font-black text-gray-100 dark:text-gray-800 select-none group-hover:text-primary/10 transition-colors">{item.step}</div>
                <div className="size-12 sm:size-14 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-4 sm:mb-6 relative z-10">
                  <span className="material-symbols-outlined text-2xl sm:text-3xl">{item.icon}</span>
                </div>
                <h4 className="text-lg sm:text-xl font-black mb-2 sm:mb-3 relative z-10">{item.title}</h4>
                <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 font-medium leading-relaxed relative z-10">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. VEJA NA PRÁTICA */}
      <section id="recursos" className="py-12 sm:py-20 px-4 sm:px-6 bg-gray-50 dark:bg-black/20 scroll-mt-24">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
          <div className="text-center space-y-2 sm:space-y-4">
            <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[4px]">Recursos</h2>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black">Tudo o que você precisa</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
              <div className="h-40 sm:h-48 bg-blue-100 dark:bg-blue-900/20 p-6 flex items-center justify-center">
                 <span className="material-symbols-outlined text-5xl sm:text-6xl text-blue-500">assignment</span>
              </div>
              <div className="p-6 sm:p-8 flex-1">
                <h4 className="text-lg sm:text-xl font-black mb-3 sm:mb-4">Exercícios Personalizados</h4>
                <ul className="space-y-2 sm:space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Nível adequado à série</li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Linguagem infantil amigável</li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Qualquer disciplina</li>
                </ul>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
              <div className="h-40 sm:h-48 bg-purple-100 dark:bg-purple-900/20 p-6 flex items-center justify-center">
                 <span className="material-symbols-outlined text-5xl sm:text-6xl text-purple-500">sports_esports</span>
              </div>
              <div className="p-6 sm:p-8 flex-1">
                <h4 className="text-lg sm:text-xl font-black mb-3 sm:mb-4">Quiz Interativo</h4>
                <ul className="space-y-2 sm:space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Gamificação com XP e Badges</li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Funciona no celular e tablet</li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Feedback imediato</li>
                </ul>
              </div>
            </div>

            {/* Card 3 */}
            <div className="bg-white dark:bg-surface-dark rounded-[24px] sm:rounded-[32px] overflow-hidden border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col">
              <div className="h-40 sm:h-48 bg-green-100 dark:bg-green-900/20 p-6 flex items-center justify-center">
                 <span className="material-symbols-outlined text-5xl sm:text-6xl text-green-500">insights</span>
              </div>
              <div className="p-6 sm:p-8 flex-1">
                <h4 className="text-lg sm:text-xl font-black mb-3 sm:mb-4">Relatório para Pais</h4>
                <ul className="space-y-2 sm:space-y-3">
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Evolução por tema</li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Fácil de entender</li>
                  <li className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"><span className="size-1.5 rounded-full bg-primary shrink-0"></span> Sugestões de melhoria</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. PARA QUEM É */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto bg-black text-white rounded-[32px] sm:rounded-[48px] p-8 lg:p-16 relative overflow-hidden">
          <div className="relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black">Para quem é o Educa Sense?</h2>
              <p className="text-gray-400 font-medium text-sm sm:text-base">Desenvolvemos nossa plataforma pensando nas necessidades reais das famílias modernas.</p>
              <button onClick={handleStart} className="w-full sm:w-auto bg-primary text-black px-6 py-3 rounded-xl font-black hover:scale-105 transition-transform">
                Começar agora
              </button>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {[
                "Pais que querem acompanhar os estudos de perto",
                "Crianças que precisam de reforço escolar focado",
                "Famílias com pouco tempo no dia a dia",
                "Quem tem mais de um filho estudando"
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 sm:gap-4 bg-white/10 p-3 sm:p-4 rounded-2xl backdrop-blur-sm border border-white/5">
                  <span className="material-symbols-outlined text-primary shrink-0">check_circle</span>
                  <span className="font-bold text-xs sm:text-sm text-left">{item}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Deco */}
          <div className="absolute top-0 right-0 size-64 sm:size-96 bg-primary/20 rounded-full blur-[80px] sm:blur-[100px] pointer-events-none"></div>
        </div>
      </section>

      {/* 7. PLANOS */}
      <section id="planos" className="py-12 sm:py-20 px-4 sm:px-6 bg-gray-50 dark:bg-black/20">
        <div className="max-w-7xl mx-auto space-y-10 sm:space-y-16">
           <div className="text-center space-y-2 sm:space-y-4">
             <h2 className="text-[10px] sm:text-xs font-black text-primary uppercase tracking-[4px]">Planos</h2>
             <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black">Escolha o melhor para sua família</h3>
           </div>

           <div className="grid md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white dark:bg-surface-dark p-6 sm:p-8 lg:p-10 rounded-[32px] sm:rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
                 <h3 className="text-xl sm:text-2xl font-black mb-2">Plano Grátis</h3>
                 <p className="text-xs sm:text-sm text-gray-500 font-medium mb-6 sm:mb-8 bg-gray-100 dark:bg-gray-800 inline-block px-3 py-1 rounded-full">Ideal para testar a plataforma</p>
                 <div className="mb-6 sm:mb-8">
                    <span className="text-4xl sm:text-5xl font-black">R$ 0</span>
                    <span className="text-gray-400 font-bold">/mês</span>
                 </div>
                 <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    <li className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-300"><span className="material-symbols-outlined text-green-500">check</span> 5 Exercícios por mês</li>
                    <li className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-300"><span className="material-symbols-outlined text-green-500">check</span> Quiz interativo básico</li>
                    <li className="flex items-center gap-3 text-sm font-bold text-gray-700 dark:text-gray-300"><span className="material-symbols-outlined text-green-500">check</span> Acesso a 1 perfil de filho</li>
                 </ul>
                 <button onClick={handleStart} className="w-full h-12 sm:h-14 border-2 border-gray-200 dark:border-gray-700 rounded-2xl font-black hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm sm:text-base">
                    Começar Grátis
                 </button>
              </div>

              {/* Premium Plan */}
              <div className="bg-black text-white p-6 sm:p-8 lg:p-10 rounded-[32px] sm:rounded-[40px] shadow-2xl relative overflow-hidden transform md:-translate-y-4 border-2 border-primary">
                 <div className="absolute top-0 right-0 bg-primary text-black text-[10px] font-black px-4 py-2 rounded-bl-2xl uppercase tracking-widest">Recomendado</div>
                 
                 <h3 className="text-xl sm:text-2xl font-black mb-2 text-primary">Plano Premium</h3>
                 <p className="text-xs sm:text-sm text-gray-400 font-medium mb-6 sm:mb-8 leading-tight max-w-xs">Mais usado por famílias que acompanham os estudos toda semana</p>
                 
                 <div className="mb-6 sm:mb-8">
                    <span className="text-4xl sm:text-5xl font-black">R$ {Math.floor(PLAN_CONFIG.PRO.price)}</span>
                    <span className="text-gray-400 font-bold">/mês</span>
                 </div>
                 
                 <ul className="space-y-3 sm:space-y-4 mb-8 sm:mb-10">
                    <li className="flex items-center gap-3 text-sm font-bold"><span className="material-symbols-outlined text-primary">check</span> Exercícios Ilimitados</li>
                    <li className="flex items-center gap-3 text-sm font-bold"><span className="material-symbols-outlined text-primary">check</span> Relatórios de evolução IA</li>
                    <li className="flex items-center gap-3 text-sm font-bold"><span className="material-symbols-outlined text-primary">check</span> Até 5 crianças por conta</li>
                    <li className="flex items-center gap-3 text-sm font-bold"><span className="material-symbols-outlined text-primary">check</span> Exportação PDF Profissional</li>
                 </ul>
                 
                 <button onClick={handleStart} className="w-full h-12 sm:h-14 bg-primary text-black rounded-2xl font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-glow text-sm sm:text-base">
                    Assinar Premium
                 </button>
              </div>
           </div>
        </div>
      </section>

      {/* 8. CTA FINAL */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 text-center space-y-6 sm:space-y-8">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black max-w-3xl mx-auto leading-tight">
          Pronto para facilitar os estudos do seu filho?
        </h2>
        <p className="text-base sm:text-xl text-gray-500 max-w-2xl mx-auto">
          Crie seu primeiro exercício agora e veja como a IA pode ajudar no aprendizado.
        </p>
        <div className="space-y-3 pt-4">
          <button 
            onClick={handleStart}
            className="w-full sm:w-auto px-10 h-14 sm:h-16 bg-primary text-black font-black text-lg sm:text-xl rounded-2xl shadow-glow hover:scale-105 transition-transform"
          >
            Criar exercício grátis
          </button>
          <p className="text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-widest">Sem cartão de crédito</p>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-surface-dark py-8 sm:py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="size-6 bg-black dark:bg-white rounded text-white dark:text-black flex items-center justify-center font-black text-xs">ES</div>
            <span className="font-bold text-sm tracking-tight">Educa Sense</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm font-medium text-gray-500">
            <a onClick={() => navigate('/sobre')} className="hover:text-primary transition-colors cursor-pointer">Sobre</a>
            <a onClick={() => navigate('/como-funciona')} className="hover:text-primary transition-colors cursor-pointer">Como funciona</a>
            <a onClick={() => navigate('/para-pais')} className="hover:text-primary transition-colors cursor-pointer">Para Pais</a>
            <a onClick={() => navigate('/para-alunos')} className="hover:text-primary transition-colors cursor-pointer">Para Alunos</a>
            <a onClick={() => navigate('/seguranca-e-privacidade')} className="hover:text-primary transition-colors cursor-pointer">Segurança</a>
            <a onClick={() => navigate('/contato')} className="hover:text-primary transition-colors cursor-pointer">Contato</a>
          </div>

          <div className="text-[10px] sm:text-xs text-gray-400 font-medium text-center">
            © 2025 Educa Sense • Inteligência para Famílias
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
