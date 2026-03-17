
import React from 'react';
import { SEO } from '../../components/SEO';
import { DesktopHeader } from '../../components/DesktopHeader';
import { useNavigate } from 'react-router-dom';

export const HowItWorksPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <SEO 
        title="Como Funciona" 
        description="Entenda como o Educa Sense integra atividades diárias, acompanhamento escolar e jogos educativos em uma única plataforma."
        canonical="https://educasense.com.br/como-funciona"
      />
      <DesktopHeader isAuthenticated={false} />
      
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-20">
        
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="text-indigo-600 font-bold uppercase tracking-widest text-xs sm:text-sm mb-4 block">Metodologia</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-indigo-900 mb-6 leading-tight">
            Simples para quem usa, <br/> poderoso para quem aprende.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Conectamos os três pilares da educação em um fluxo contínuo de informação e aprendizado.
          </p>
        </div>
        
        {/* Steps Visual */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12 mb-24 relative">
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-indigo-200 -z-10"></div>

          {/* Step 1 */}
          <div className="relative group">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 h-full hover:-translate-y-2 transition-transform duration-300">
              <div className="size-24 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 mx-auto group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-5xl">school</span>
              </div>
              <h3 className="text-2xl font-black text-center mb-4 text-indigo-900">1. A Escola Cria</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Professores utilizam nossa IA para gerar atividades personalizadas, quizzes e missões criativas alinhadas à BNCC em segundos.
              </p>
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white size-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">1</div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 h-full hover:-translate-y-2 transition-transform duration-300">
              <div className="size-24 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 mb-6 mx-auto group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-5xl">child_care</span>
              </div>
              <h3 className="text-2xl font-black text-center mb-4 text-purple-900">2. O Aluno Aprende</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                As crianças acessam uma interface gamificada onde estudar vira uma aventura. Completar tarefas desbloqueia jogos educativos exclusivos.
              </p>
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-purple-600 text-white size-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">2</div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-100 h-full hover:-translate-y-2 transition-transform duration-300">
              <div className="size-24 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 mx-auto group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined text-5xl">family_restroom</span>
              </div>
              <h3 className="text-2xl font-black text-center mb-4 text-green-900">3. A Família Acompanha</h3>
              <p className="text-gray-600 text-center leading-relaxed">
                Pais recebem relatórios automáticos no WhatsApp ou app, sabendo exatamente onde o filho brilha e onde precisa de apoio.
              </p>
            </div>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-600 text-white size-8 rounded-full flex items-center justify-center font-black text-sm shadow-md">3</div>
          </div>
        </div>

        {/* Tech Section */}
        <section className="bg-gradient-to-br from-gray-900 to-indigo-900 text-white p-10 sm:p-16 rounded-[40px] shadow-2xl relative overflow-hidden">
          <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black mb-6">Tecnologia Invisível</h2>
              <p className="text-indigo-100 text-lg leading-relaxed mb-8">
                Por trás da interface simples, nossa Inteligência Artificial analisa padrões de aprendizado para sugerir o nível ideal de dificuldade para cada aluno.
              </p>
              <ul className="space-y-4">
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-400">auto_awesome</span>
                  <span className="font-bold">Adaptação automática de dificuldade</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-400">insights</span>
                  <span className="font-bold">Insights comportamentais para pais</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-green-400">lock</span>
                  <span className="font-bold">Ambiente 100% seguro e monitorado</span>
                </li>
              </ul>
            </div>
            <div className="flex justify-center">
               {/* Abstract Visual */}
               <div className="relative size-64 sm:size-80">
                 <div className="absolute inset-0 bg-indigo-500/30 rounded-full animate-pulse"></div>
                 <div className="absolute inset-4 bg-indigo-500/30 rounded-full animate-ping"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-9xl text-white drop-shadow-lg">neurology</span>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <div className="text-center mt-20">
          <button 
            onClick={() => navigate('/login')}
            className="px-10 py-5 bg-primary text-black font-black text-xl rounded-2xl shadow-glow hover:scale-105 transition-transform"
          >
            Experimentar Grátis
          </button>
          <p className="mt-4 text-sm text-gray-500 font-medium">Sem compromisso. Cancele quando quiser.</p>
        </div>

      </main>
    </div>
  );
};
