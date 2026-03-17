
import React from 'react';
import { SEO } from '../../components/SEO';
import { DesktopHeader } from '../../components/DesktopHeader';
import { useNavigate } from 'react-router-dom';

export const AboutPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <SEO 
        title="Sobre Nós" 
        description="Conheça o Educa Sense, a plataforma que transforma a educação infantil com tecnologia, carinho e inteligência artificial."
        canonical="https://educasense.com.br/sobre"
      />
      <DesktopHeader isAuthenticated={false} />
      
      <main className="max-w-5xl mx-auto px-6 py-12 sm:py-20">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
          <span className="text-indigo-600 font-bold uppercase tracking-widest text-xs sm:text-sm mb-4 block">Nossa História</span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-indigo-900 mb-6 leading-tight">
            Educação com <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">propósito</span> e tecnologia.
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 leading-relaxed">
            Nascemos da vontade de conectar escolas, pais e alunos em um ecossistema de aprendizado contínuo, onde a tecnologia serve ao desenvolvimento humano.
          </p>
        </div>
        
        {/* Mission Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all border border-gray-100">
            <div className="size-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-3xl">psychology</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">O que acreditamos</h2>
            <p className="text-gray-600 leading-relaxed">
              Acreditamos que cada criança é única. Nossa IA não substitui o professor ou os pais, mas oferece ferramentas poderosas para personalizar o ensino e identificar talentos desde cedo.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all border border-gray-100">
            <div className="size-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <span className="material-symbols-outlined text-3xl">rocket_launch</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Nossa Missão</h2>
            <ul className="space-y-3 text-gray-600">
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0 mt-1">check_circle</span>
                <span>Democratizar o acesso a um ensino personalizado.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0 mt-1">check_circle</span>
                <span>Facilitar a comunicação entre família e escola.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="material-symbols-outlined text-green-500 shrink-0 mt-1">check_circle</span>
                <span>Criar um ambiente digital seguro e livre de distrações.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Team / Culture Section */}
        <section className="bg-indigo-900 text-white rounded-[40px] p-8 sm:p-12 lg:p-16 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black">Junte-se à revolução do ensino</h2>
            <p className="text-indigo-100 text-lg leading-relaxed">
              Estamos construindo o futuro da educação hoje. Seja você pai, mãe, professor ou diretor, há um lugar para você no Educa Sense.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-white text-indigo-900 font-black text-lg rounded-2xl shadow-lg hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              Começar Agora
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
          
          {/* Decorative */}
          <div className="absolute top-0 left-0 size-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 size-64 bg-purple-500/20 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </section>

      </main>
    </div>
  );
};
