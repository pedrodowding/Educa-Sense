import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

export const ConnectivityBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [errorType, setErrorType] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Tenta um fetch simples para verificar conectividade com Supabase
        // Usamos rest/v1/ que deve retornar 404 ou 200, mas se der erro de rede (Failed to fetch) é bloqueio.
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl) return;

        // AbortController para timeout (5s) para evitar false positives em conexões lentas
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
            // Usando GET ao invés de HEAD para evitar bloqueios de CORS/WAF em alguns ambientes
            const res = await fetch(`${supabaseUrl}/rest/v1/`, { 
                method: 'GET',
                headers: {
                    'apikey': anonKey,
                    'Authorization': `Bearer ${anonKey}`
                },
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            // Se chegou aqui, conectou (mesmo que seja 404 ou 200)
            setIsOffline(false);
        } catch (fetchErr: any) {
            clearTimeout(timeoutId);
            throw fetchErr;
        }

      } catch (err: any) {
        console.error('[ConnectivityBanner] Connection check failed:', err);
        // Se for erro de fetch/network ou abort
        if (err.name === 'AbortError' || err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
            setIsOffline(true);
            setErrorType('network');
        }
      }
    };

    // Check on mount and when window gets focus
    checkConnection();
    window.addEventListener('focus', checkConnection);
    window.addEventListener('online', () => setIsOffline(false));
    window.addEventListener('offline', () => setIsOffline(true));

    return () => {
      window.removeEventListener('focus', checkConnection);
      window.removeEventListener('online', () => setIsOffline(false));
      window.removeEventListener('offline', () => setIsOffline(true));
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="bg-red-500 text-white px-4 py-3 text-center text-sm font-bold fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 shadow-lg animate-slide-down">
      <span className="material-symbols-outlined text-lg">wifi_off</span>
      <span>
        {errorType === 'network' 
          ? 'Não foi possível conectar ao servidor. Verifique sua internet ou desbloqueie conexões (AdBlock/Firewall).' 
          : 'Você está offline. Verifique sua conexão.'}
      </span>
      <button 
        onClick={() => window.location.reload()} 
        className="ml-4 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-colors"
      >
        Tentar novamente
      </button>
    </div>
  );
};
