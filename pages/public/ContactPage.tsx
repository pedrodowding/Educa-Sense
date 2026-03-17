
import React, { useState } from 'react';
import { SEO } from '../../components/SEO';
import { DesktopHeader } from '../../components/DesktopHeader';

export const ContactPage: React.FC = () => {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('submitting');
    // Simulate submission
    setTimeout(() => {
      setFormStatus('success');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <SEO 
        title="Contato | Educa Sense" 
        description="Entre em contato com a equipe do Educa Sense. Estamos prontos para ajudar pais, alunos e escolas."
        canonical="https://educasense.com.br/contato"
      />
      <DesktopHeader isAuthenticated={false} />
      
      <main>
        {/* Hero Section */}
        <section className="bg-indigo-900 text-white py-20 px-6 rounded-b-[48px] shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
             <div className="absolute top-10 right-10 w-64 h-64 bg-yellow-400 rounded-full blur-3xl"></div>
             <div className="absolute bottom-10 left-10 w-64 h-64 bg-pink-500 rounded-full blur-3xl"></div>
          </div>
          
          <div className="max-w-4xl mx-auto text-center relative z-10">
            <h1 className="text-4xl sm:text-6xl font-black mb-6 leading-tight">
              Como podemos <span className="text-yellow-400">ajudar?</span>
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto leading-relaxed">
              Dúvidas sobre a plataforma, sugestões ou suporte técnico. Nossa equipe está pronta para atender você.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-6 -mt-10 mb-20 relative z-20">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Contact Info Cards */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="size-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl">mail</span>
                </div>
                <h3 className="text-xl font-bold mb-2">E-mail</h3>
                <p className="text-gray-600 mb-4 text-sm">Para dúvidas gerais e parcerias.</p>
                <a href="mailto:contato@educasense.com" className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors flex items-center gap-2">
                  contato@educasense.com
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </a>
              </div>

              <div className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                <div className="size-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl">support_agent</span>
                </div>
                <h3 className="text-xl font-bold mb-2">Suporte</h3>
                <p className="text-gray-600 mb-4 text-sm">Segunda a Sexta, 9h às 18h.</p>
                <div className="text-gray-900 font-bold">
                  Tempo médio de resposta: <span className="text-green-600">2 horas</span>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 rounded-3xl shadow-lg text-white">
                <h3 className="text-xl font-bold mb-4">Perguntas Frequentes</h3>
                <p className="text-indigo-100 mb-6 text-sm">Muitas dúvidas já estão respondidas em nossa central de ajuda.</p>
                <a href="/como-funciona" className="inline-flex items-center justify-center w-full bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 rounded-xl transition-all border border-white/20">
                  Ver Central de Ajuda
                </a>
              </div>
            </div>

            {/* Contact Form */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 sm:p-10 rounded-[40px] shadow-lg border border-gray-100">
                {formStatus === 'success' ? (
                  <div className="text-center py-20">
                    <div className="size-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                      <span className="material-symbols-outlined text-4xl">check_circle</span>
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-4">Mensagem Enviada!</h2>
                    <p className="text-gray-600 text-lg max-w-md mx-auto">
                      Obrigado pelo contato. Nossa equipe retornará em breve para o e-mail informado.
                    </p>
                    <button 
                      onClick={() => setFormStatus('idle')}
                      className="mt-8 text-indigo-600 font-bold hover:underline"
                    >
                      Enviar outra mensagem
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-black text-gray-900 mb-8 flex items-center gap-3">
                      Envie uma mensagem
                      <span className="text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Resposta em até 24h</span>
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 ml-1">Nome completo</label>
                          <input 
                            required
                            type="text" 
                            className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                            placeholder="Seu nome" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-700 ml-1">E-mail</label>
                          <input 
                            required
                            type="email" 
                            className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all" 
                            placeholder="seu@email.com" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Assunto</label>
                        <select className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer">
                          <option>Dúvida sobre Planos</option>
                          <option>Suporte Técnico</option>
                          <option>Sugestão de Melhoria</option>
                          <option>Parcerias / Escolas</option>
                          <option>Outros</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 ml-1">Mensagem</label>
                        <textarea 
                          required
                          className="w-full p-4 rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all h-40 resize-none" 
                          placeholder="Descreva como podemos ajudar..."
                        ></textarea>
                      </div>

                      <button 
                        disabled={formStatus === 'submitting'}
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold text-lg py-4 rounded-2xl hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {formStatus === 'submitting' ? (
                          <>
                            <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Enviando...
                          </>
                        ) : (
                          <>
                            Enviar Mensagem
                            <span className="material-symbols-outlined">send</span>
                          </>
                        )}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
