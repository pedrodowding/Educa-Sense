
import React from 'react';
import { SEO } from '../../components/SEO';
import { DesktopHeader } from '../../components/DesktopHeader';
import { useNavigate } from 'react-router-dom';

export const ForStudentsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <SEO 
        title="Para Alunos" 
        description="Aprender nunca foi tão divertido. Jogos, histórias e atividades que transformam o estudo em uma aventura."
        canonical="https://educasense.com.br/para-alunos"
      />
      <DesktopHeader isAuthenticated={false} />
      
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-20">
        
        {/* Hero */}
        <section className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-10 sm:p-16 lg:p-20 rounded-[48px] shadow-2xl mb-20 relative overflow-hidden text-center sm:text-left">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-block bg-white/20 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-full mb-6 backdrop-blur-sm">Área do Aluno</span>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-6 leading-tight">
              Aprender é uma <span className="text-yellow-300">aventura!</span>
            </h1>
            <p className="text-lg sm:text-xl opacity-90 mb-8 max-w-lg">
              Faça suas missões, ganhe XP e desbloqueie jogos incríveis. No Educa Sense, estudar é tão divertido quanto brincar.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="px-8 py-4 bg-yellow-400 text-yellow-900 font-black text-lg rounded-2xl shadow-xl hover:scale-105 transition-transform inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined filled">play_circle</span>
              Começar a Jogar
            </button>
          </div>
          
          {/* Fun Graphics */}
          <div className="absolute right-0 bottom-0 w-full sm:w-1/2 h-full pointer-events-none">
             <div className="absolute top-10 right-10 size-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
             <div className="absolute bottom-[-20%] right-[-10%] size-96 bg-purple-800/50 rounded-full blur-3xl"></div>
             
             {/* Floating Icons */}
             <div className="absolute top-1/4 right-1/4 text-6xl text-yellow-300 animate-bounce">⭐</div>
             <div className="absolute bottom-1/3 right-10 text-6xl text-blue-300 animate-float">🚀</div>
             <div className="absolute top-10 right-1/2 text-5xl text-green-300 animate-spin-slow">🧩</div>
          </div>
        </section>

        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="bg-white p-8 sm:p-10 rounded-[40px] shadow-sm border-2 border-transparent hover:border-orange-200 transition-all group">
            <div className="size-16 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-4xl">auto_stories</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 group-hover:text-orange-500 transition-colors">Histórias Mágicas</h3>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Você é o herói da sua própria história! Escolha os personagens, o cenário e veja a magia acontecer com a ajuda da nossa IA.
            </p>
            <div className="h-40 bg-orange-50 rounded-3xl flex items-center justify-center relative overflow-hidden">
               <span className="text-6xl">🐉 🏰 👸</span>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-10 rounded-[40px] shadow-sm border-2 border-transparent hover:border-blue-200 transition-all group">
            <div className="size-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined text-4xl">sports_esports</span>
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4 group-hover:text-blue-500 transition-colors">Hora do Jogo</h3>
            <p className="text-lg text-gray-600 leading-relaxed mb-6">
              Terminou a lição? É hora de se divertir! Jogue o Pega Certo, Memória Neon e muito mais para treinar seu cérebro.
            </p>
            <div className="h-40 bg-blue-50 rounded-3xl flex items-center justify-center relative overflow-hidden">
               <span className="text-6xl">🎮 👾 🏆</span>
            </div>
          </div>
        </div>

        {/* Gamification Banner */}
        <div className="bg-gray-900 text-white rounded-[40px] p-8 sm:p-12 flex flex-col md:flex-row items-center gap-10 overflow-hidden relative">
           <div className="flex-1 z-10">
             <h2 className="text-3xl font-black mb-4">Ganhe Medalhas e XP!</h2>
             <p className="text-gray-400 text-lg mb-6">
               Cada atividade concluída te deixa mais perto do próximo nível. Colecione medalhas raras e mostre para seus amigos.
             </p>
             <div className="flex gap-4">
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                   <span className="block text-2xl font-black text-yellow-400">Level 5</span>
                   <span className="text-xs text-gray-400 uppercase font-bold">Mestre da Leitura</span>
                </div>
                <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                   <span className="block text-2xl font-black text-green-400">1.250 XP</span>
                   <span className="text-xs text-gray-400 uppercase font-bold">Pontos Totais</span>
                </div>
             </div>
           </div>
           <div className="flex-1 flex justify-center z-10">
              <div className="grid grid-cols-2 gap-4">
                 <div className="size-24 bg-gray-800 rounded-full border-4 border-yellow-500 flex items-center justify-center shadow-glow">
                    <span className="material-symbols-outlined text-5xl text-yellow-500">military_tech</span>
                 </div>
                 <div className="size-24 bg-gray-800 rounded-full border-4 border-purple-500 flex items-center justify-center shadow-glow mt-8">
                    <span className="material-symbols-outlined text-5xl text-purple-500">science</span>
                 </div>
              </div>
           </div>
           
           {/* Background Grid */}
           <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        </div>

      </main>
    </div>
  );
};
