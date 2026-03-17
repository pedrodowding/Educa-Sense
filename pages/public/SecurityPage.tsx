
import React from 'react';
import { SEO } from '../../components/SEO';
import { DesktopHeader } from '../../components/DesktopHeader';
import { useNavigate } from 'react-router-dom';

export const SecurityPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <SEO 
        title="Segurança e Privacidade" 
        description="Levamos a segurança dos dados e a privacidade das crianças a sério. Conheça nossas políticas e compromissos."
        canonical="https://educasense.com.br/seguranca-e-privacidade"
      />
      <DesktopHeader isAuthenticated={false} />
      
      <main className="max-w-4xl mx-auto px-6 py-12 sm:py-20">
        
        <div className="text-center mb-16">
          <div className="size-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-4xl">lock</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mb-6">Segurança em Primeiro Lugar</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Entendemos que a confiança é a base de tudo. Por isso, construímos o Educa Sense seguindo os mais rigorosos padrões de proteção de dados.
          </p>
        </div>
        
        <div className="space-y-8 bg-white p-10 rounded-[32px] shadow-sm border border-gray-100 mb-12">
          <section className="flex gap-6 items-start">
            <div className="size-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
               <span className="material-symbols-outlined text-2xl">shield_person</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Proteção de Dados Infantis</h2>
              <p className="text-gray-600 leading-relaxed">
                O Educa Sense segue rigorosamente as diretrizes da LGPD (Lei Geral de Proteção de Dados) e COPPA. 
                Não coletamos dados desnecessários de crianças e todas as informações são criptografadas.
                <span className="block mt-2 font-bold text-gray-800">Nenhum dado é vendido para terceiros ou utilizado para publicidade.</span>
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-6 items-start">
            <div className="size-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
               <span className="material-symbols-outlined text-2xl">block</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Ambiente Seguro (Ad-Free)</h2>
              <p className="text-gray-600 leading-relaxed">
                Nossa plataforma é livre de anúncios. Isso garante que as crianças não sejam expostas a conteúdo comercial ou inapropriado enquanto estudam.
                Além disso, todas as interações sociais dentro da plataforma são monitoradas e limitadas a círculos aprovados pelos pais.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          <section className="flex gap-6 items-start">
            <div className="size-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
               <span className="material-symbols-outlined text-2xl">manage_accounts</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Controle Total dos Pais</h2>
              <p className="text-gray-600 leading-relaxed">
                Os responsáveis têm total acesso e direito de solicitar a exclusão de quaisquer dados da conta da criança a qualquer momento, 
                através do painel de configurações ou entrando em contato com nosso suporte.
              </p>
            </div>
          </section>
        </div>

        <div className="bg-indigo-50 rounded-2xl p-8 text-center">
          <h3 className="text-lg font-bold text-indigo-900 mb-2">Dúvidas sobre privacidade?</h3>
          <p className="text-indigo-700 mb-6">Nosso time de Data Protection está à disposição.</p>
          <button 
            onClick={() => navigate('/contato')}
            className="text-indigo-600 font-bold hover:underline"
          >
            Falar com Encarregado de Dados (DPO)
          </button>
        </div>

      </main>
    </div>
  );
};
