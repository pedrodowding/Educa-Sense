import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Entitlements } from '../billing/entitlements';
import { MercadoPagoProvider } from '../billing/providers/mercadoPagoProvider';
import { useAuth } from '../contexts/AuthContext';
import { PLAN_CONFIG } from '../config/plans';
import { supabase } from '../services/supabase';

const SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const currentTier = Entitlements.getUserTier();
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const userId = user?.id || 'guest_user';
      // Use MercadoPagoProvider instead of Mock
      const { checkoutUrl } = await MercadoPagoProvider.createCheckoutSession(userId, 'PRO');
      
      if (!checkoutUrl) {
         throw new Error('URL de checkout inválida');
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Failed to start checkout', error);
      alert('Erro ao iniciar assinatura. Tente novamente.');
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Re-fetch entitlements/profile from DB to see if webhook processed it
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_tier, subscription_status')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (profile?.subscription_status === 'active' && 
         (profile.subscription_tier === 'pro' || profile.subscription_tier === 'PRO')) {
        Entitlements.setUserTier('PRO');
        alert("Assinatura restaurada com sucesso! Você é PRO.");
        window.location.reload();
      } else {
        alert("Nenhuma assinatura ativa encontrada para este usuário.");
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao restaurar compras.");
    } finally {
      setLoading(false);
    }
  };

  // Debug function to reset to FREE
  const handleResetDebug = () => {
    Entitlements.setUserTier('FREE');
    window.location.reload();
  };

  return (
    <div className="min-h-full bg-gray-50 dark:bg-black pb-10">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header with Close Button */}
        <header className="p-6 pt-10 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">close</span>
          </button>
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Planos</span>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        <main className="px-6 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white">
            Desbloqueie o <span className="text-primary">Educa Sense Pro</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
            Potencialize o aprendizado com ferramentas exclusivas para pais e professores.
          </p>
        </div>

        {/* Comparative Cards */}
        <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
          
          {/* FREE CARD */}
          <div className="bg-white dark:bg-surface-dark p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm opacity-80 scale-95 origin-top">
            <div className="mb-4">
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-full text-xs font-bold uppercase tracking-wider">
                Atual
              </span>
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-4">Free</h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="material-symbols-outlined text-lg text-gray-400">check</span>
                <span>1 Correção de foto por semana</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="material-symbols-outlined text-lg text-gray-400">check</span>
                <span>Relatórios básicos de progresso</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400">
                <span className="material-symbols-outlined text-lg text-gray-400">check</span>
                <span>Plano de estudos diário (limitado)</span>
              </li>
            </ul>
          </div>

          {/* PRO CARD */}
          <div className="relative bg-white dark:bg-surface-dark p-6 rounded-[32px] border-2 border-primary shadow-xl scale-100 z-10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
              Recomendado
            </div>
            <div className="mb-4 pt-2">
              <span className="text-3xl font-black text-gray-900 dark:text-white">R$ {PLAN_CONFIG.PRO.price.toFixed(2).replace('.', ',')}</span>
              <span className="text-gray-500 text-sm font-medium">/mês</span>
            </div>
            <h3 className="text-xl font-black text-primary mb-4">Pro</h3>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                <span>Correções de foto <strong>ilimitadas</strong></span>
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                <span>Relatórios avançados e detalhados</span>
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                <span>Modo Docente (perfil de professor)</span>
              </li>
              <li className="flex items-start gap-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                <span>Geração ilimitada de atividades</span>
              </li>
            </ul>

            <button
              onClick={handleSubscribe}
              disabled={loading || currentTier === 'PRO'}
              className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              ) : currentTier === 'PRO' ? (
                <>
                  <span className="material-symbols-outlined">verified</span>
                  Você já é Pro
                </>
              ) : (
                "Assinar Agora"
              )}
            </button>
            
            <p className="text-center text-[10px] text-gray-400 mt-3 font-medium">
              Cancele quando quiser. Sem fidelidade.
            </p>
          </div>
        </div>

        {/* Secondary Actions */}
        <div className="text-center space-y-4 pt-4">
          <button 
            onClick={handleRestore}
            className="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 uppercase tracking-wider"
          >
            Restaurar Compra
          </button>
        </div>

        {/* Debug Area (Hidden in Prod usually, visible for dev) */}
        <div className="mt-12 pt-8 border-t border-dashed border-gray-200 dark:border-gray-800 text-center">
           <p className="text-[10px] font-mono text-gray-300 mb-2">DEV AREA</p>
           {currentTier === 'PRO' && (
             <button 
               onClick={handleResetDebug}
               className="text-xs text-red-400 underline"
             >
               [Debug] Resetar para Free
             </button>
           )}
        </div>
      </main>
      </div>
    </div>
  );
};

export default SubscriptionPage;
