import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Entitlements } from '../billing/entitlements';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';

const BillingReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Determine initial status based on URL path
  const getInitialStatus = () => {
    if (location.pathname.includes('/erro')) return 'failure';
    if (location.pathname.includes('/pendente')) return 'pending';
    return 'verifying';
  };

  const [status, setStatus] = useState<'verifying' | 'success' | 'error' | 'failure' | 'pending'>(getInitialStatus());

  useEffect(() => {
    // If explicit failure or pending, don't poll
    if (status === 'failure' || status === 'pending') return;

    let attempts = 0;
    const maxAttempts = 15; // 30 seconds (2s interval)
    let intervalId: any = null;
    
    const checkSubscription = async () => {
      if (!user) return;

      try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('subscription_status, subscription_tier')
            .eq('id', user.id)
            .single();
        
        if (error) {
            console.error("Error checking subscription:", error);
            return;
        }

        console.log("Subscription Check:", profile);

        if (profile?.subscription_status === 'active' && 
           (profile.subscription_tier === 'pro' || profile.subscription_tier === 'PRO')) {
          
          // Sucesso!
          clearInterval(intervalId);
          Entitlements.setUserTier('PRO');
          setStatus('success');
          
          setTimeout(() => {
            navigate('/dashboard');
          }, 3000);
        } else {
           attempts++;
           if (attempts >= maxAttempts) {
             clearInterval(intervalId);
             setStatus('error'); // Timeout verifying
           }
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    };

    if (user && status === 'verifying') {
        // Initial check
        checkSubscription();
        // Start polling
        intervalId = setInterval(checkSubscription, 2000);
    }

    return () => {
        if (intervalId) clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, status]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white dark:bg-surface-dark text-center">
      {status === 'verifying' && (
        <div className="space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirmando pagamento...</h2>
          <p className="text-sm text-gray-500">Aguarde, estamos validando sua assinatura.</p>
          <p className="text-xs text-gray-400">Isso pode levar alguns segundos.</p>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-green-600">check_circle</span>
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Assinatura Ativada!</h2>
          <p className="text-gray-500">Bem-vindo ao Educa Sense Pro.</p>
          <p className="text-xs text-gray-400">Redirecionando...</p>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-4">
          <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-yellow-600">hourglass_empty</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Processamento Demorado</h2>
          <p className="text-gray-500 max-w-xs mx-auto">
            Ainda não recebemos a confirmação. Se você pagou, aguarde alguns minutos e verifique seu perfil.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-sm"
          >
            Ir para o App
          </button>
        </div>
      )}

      {status === 'failure' && (
        <div className="space-y-4">
          <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-red-600">cancel</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pagamento não realizado</h2>
          <p className="text-gray-500 max-w-xs mx-auto">
            O pagamento foi cancelado ou recusado. Tente novamente.
          </p>
          <button 
            onClick={() => navigate('/assinatura')}
            className="px-6 py-3 bg-primary text-black rounded-xl font-bold text-sm"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {status === 'pending' && (
        <div className="space-y-4">
          <div className="h-16 w-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl text-orange-600">pending</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pagamento Pendente</h2>
          <p className="text-gray-500 max-w-xs mx-auto">
            Estamos aguardando a confirmação do pagamento (ex: Boleto/PIX pode levar um tempo).
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-3 bg-gray-100 dark:bg-gray-800 rounded-xl font-bold text-sm"
          >
            Ir para o App
          </button>
        </div>
      )}
    </div>
  );
};

export default BillingReturnPage;
