
import React from 'react';
import { SEO } from '../../components/SEO';
import { DesktopHeader } from '../../components/DesktopHeader';
import { useNavigate } from 'react-router-dom';

export const ForParentsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <SEO 
        title="Para Pais e Responsáveis" 
        description="Acompanhe a vida escolar do seu filho, receba relatórios de desenvolvimento e tenha controle total sobre o conteúdo acessado."
        canonical="https://educasense.com.br/para-pais"
      />
      <DesktopHeader isAuthenticated={false} />
      
      <main className="max-w-6xl mx-auto px-6 py-12 sm:py-20">
        
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          <div className="space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-indigo-900 leading-tight">
              A tranquilidade que você precisa, o <span className="text-green-500">apoio</span> que seu filho merece.
            </h1>
            <p className="text-xl text-gray-600 leading-relaxed">
              Sabemos que conciliar trabalho e o acompanhamento escolar é um desafio diário. O Educa Sense é o seu co-piloto nessa jornada, traduzindo o desempenho escolar em ações simples.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-lg hover:bg-indigo-700 transition-colors"
              >
                Criar Conta Grátis
              </button>
            </div>
          </div>
          <div className="relative">
             <div className="aspect-square bg-indigo-100 rounded-[40px] relative overflow-hidden shadow-inner">
                {/* Abstract visualization of "peace of mind" */}
                <div className="absolute inset-0 flex items-center justify-center">
                   <div className="bg-white p-6 rounded-3xl shadow-xl max-w-xs animate-float">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="size-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                          <span className="material-symbols-outlined">check</span>
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Tarefa de Matemática</p>
                          <p className="text-xs text-gray-500">Concluída há 5 min</p>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 w-full"></div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all border border-gray-100">
            <span className="material-symbols-outlined text-4xl text-blue-500 mb-6">visibility</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Visibilidade Total</h3>
            <p className="text-gray-600">
              Chega de surpresas no boletim. Saiba exatamente quais atividades foram concluídas e quais habilidades seu filho está desenvolvendo em tempo real.
            </p>
          </div>
          
          <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all border border-gray-100">
            <span className="material-symbols-outlined text-4xl text-purple-500 mb-6">shield</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Segurança Digital</h3>
            <p className="text-gray-600">
              Um ambiente fechado e livre de anúncios. Sem chats abertos perigosos, sem algoritmos viciantes. Apenas conteúdo curado e educativo.
            </p>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm hover:shadow-md transition-all border border-gray-100">
            <span className="material-symbols-outlined text-4xl text-orange-500 mb-6">timer</span>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Controle Saudável</h3>
            <p className="text-gray-600">
              Configure limites de tempo e horários de estudo. Jogos e recompensas só são liberados após o dever cumprido.
            </p>
          </div>
        </div>

        {/* Testimonial */}
        <section className="bg-indigo-50 rounded-[40px] p-10 sm:p-16 text-center">
           <span className="material-symbols-outlined text-5xl text-indigo-300 mb-6">format_quote</span>
           <h2 className="text-2xl sm:text-3xl font-bold text-indigo-900 max-w-4xl mx-auto mb-8 leading-relaxed">
             "Antes eu precisava brigar para ele fazer o dever. Agora, ele pede para entrar no Educa Sense porque quer ganhar os pontos para desbloquear o jogo do robô."
           </h2>
           <div className="flex items-center justify-center gap-4">
             <div className="size-12 bg-indigo-200 rounded-full"></div>
             <div className="text-left">
               <p className="font-bold text-indigo-900">Patrícia Gomes</p>
               <p className="text-sm text-indigo-600">Mãe do Lucas (8 anos)</p>
             </div>
           </div>
        </section>

      </main>
    </div>
  );
};
