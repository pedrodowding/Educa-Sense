import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';

const AuthResetPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsSessionValid(!!session);
    });

    // Listen for auth changes specifically for password recovery flow
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsSessionValid(true);
      } else if (event === 'SIGNED_OUT') {
        setIsSessionValid(false);
      } else {
        setIsSessionValid(!!session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: password });
      if (error) throw error;
      setSuccess(true);
    } catch (err: any) {
      console.error('Reset password error:', err);
      setError(err.message || 'Erro ao redefinir senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (isSessionValid === false) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="size-24 bg-red-100 rounded-full flex items-center justify-center mb-6 text-red-600 shadow-lg">
          <span className="material-symbols-outlined text-5xl">link_off</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Link Expirado</h1>
        <p className="text-gray-500 font-medium mb-8 max-w-xs mx-auto">
          Este link de recuperação de senha é inválido ou já expirou.
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="w-full max-w-xs h-14 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Enviar Novo Link
        </button>
      </div>
    );
  }

  if (isSessionValid === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="size-24 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 shadow-lg">
          <span className="material-symbols-outlined text-5xl">lock_open</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Senha Atualizada!</h1>
        <p className="text-gray-500 font-medium mb-8">
          Sua senha foi alterada com sucesso.
        </p>
        <button 
          onClick={() => navigate('/login')}
          className="w-full max-w-xs h-14 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          Entrar Agora
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-background-dark flex flex-col items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="size-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-primary shadow-sm">
            <span className="material-symbols-outlined text-4xl">password</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Criar Nova Senha</h1>
          <p className="text-gray-500 mt-2">Digite sua nova senha abaixo.</p>
        </div>

        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Nova Senha</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary" 
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Confirmar Senha</label>
            <input 
              type="password" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary" 
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3 mt-6"
          >
            {loading ? 'Salvando...' : 'Salvar Nova Senha'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthResetPage;
