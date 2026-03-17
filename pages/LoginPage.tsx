
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child } from '../types';
import { supabase } from '../services/supabase';
import { buildDeviceInfo, getOrCreateDeviceId } from '../services/device';
import { setStudentSession } from '../services/studentSession';

interface Props {
  onLogin?: (email: string, role: 'guardian' | 'teacher', name?: string) => void; // Mantendo opcional para compatibilidade temporária
  childrenList: Child[]; // Renomeado para evitar conflito com children do React
}

const LoginPage: React.FC<Props> = ({ childrenList }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'parent' | 'child' | 'teacher'>('parent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage(null);
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/#/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: redirectUrl,
      });

      if (error) throw error;

      setResetMessage({
        type: 'success',
        text: 'Link enviado! Verifique seu e-mail para redefinir a senha.'
      });
    } catch (err: any) {
      console.error('Password reset error:', err);
      setResetMessage({
        type: 'error',
        text: 'Erro ao enviar link. Verifique o e-mail e tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/#/auth/confirmed`,
            data: {
              role: activeTab === 'teacher' ? 'teacher' : 'guardian',
              name: email.split('@')[0], // Nome provisório
              avatar: `https://api.dicebear.com/9.x/avataaars/svg?seed=${email}`
            }
          }
        });
        if (signUpError) throw signUpError;
        alert('Conta criada! Verifique seu e-mail ou faça login (se o auto-confirm estiver ativo).');
        setIsSignUp(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (signInError) throw signInError;
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (!userId) throw new Error('Não foi possível carregar seu usuário.');

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (profileError) throw profileError;

        if (profile?.role === 'teacher') navigate('/teacher');
        else if (profile?.role === 'admin') navigate('/admin/gestao-exclusiva');
        else navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChildLoginRemote = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const deviceId = getOrCreateDeviceId();
      const normalizedAccessCode = accessCode.trim().toUpperCase().replace(/\s/g, '');
      
      console.log('[Login] Authenticating...');
      let authData;

      // 1. Tentar validação via RPC (Recomendado - Bypass RLS seguro)
      // Requer que a função 'validate_student_access_code' tenha sido criada no banco
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('validate_student_access_code', { p_access_code: normalizedAccessCode });

      if (!rpcError) {
        // RPC funcionou (função existe)
        if (rpcData && rpcData.error) {
           throw new Error(rpcData.error === 'INVALID_CODE' ? 'Código inválido. Verifique e tente novamente.' : rpcData.error);
        }
        if (rpcData && rpcData.childId) {
            console.log('[Login] RPC validation success');
            authData = rpcData;
        } else {
            // Resposta estranha, fallback
            console.warn('[Login] RPC returned invalid data:', rpcData);
        }
      } else {
        console.warn('[Login] RPC failed (function might not exist), trying fallback...', rpcError);
        
        // 2. Fallback: Edge Function (Original)
        // Usado caso a função RPC ainda não tenha sido criada no banco
        const { data: funcData, error: funcError } = await supabase.functions.invoke('student-auth', {
          body: { accessCode: normalizedAccessCode }
        });

        if (funcError) {
           console.error('[Login] Edge Function Error:', funcError);
           let message = 'Erro ao conectar com servidor de login.';
           const errAny = funcError as any;
           if (errAny.context?.response) {
             const status = errAny.context.response.status;
             if (status === 404) message = 'Código inválido. Verifique e tente novamente.';
             else if (status === 400) message = 'Código obrigatório.';
             else if (status === 500) message = 'Erro interno no servidor (500). Por favor, contate o suporte.';
             
             try {
                const body = await errAny.context.response.json();
                if (body?.error) message = body.error;
             } catch (e) { /* ignore */ }
           }
           throw new Error(message);
        }
        
        authData = funcData;
      }

      if (authData?.error) {
        console.warn('[Login] Function Logic Error:', authData.error);
        throw new Error(authData.error);
      }

      if (!authData?.childId) {
        console.error('[Login] Invalid Response (missing childId):', authData);
        throw new Error('Resposta inválida do servidor.');
      }

      console.log('[Login] validation success', { childId: authData.childId });

      // 2. Register Device (Analytics/Tracking) - Fire and forget
      supabase.rpc('register_child_device', {
        p_access_code: normalizedAccessCode,
        p_device_id: deviceId,
        p_info: buildDeviceInfo()
      }).then(({ error }) => {
        if (error) console.warn('[Login] Device registration warning:', error);
      });

      // 3. Local Session Setup (No Auth User)
      // We store the validated childId directly using the new service
      setStudentSession({
        childId: authData.childId,
        guardianId: authData.guardianId,
        accessCode: normalizedAccessCode,
        createdAt: Date.now(),
        permissions: {
          game: authData.gameEnabled,
          story: authData.storyEnabled,
          drawing: authData.drawingEnabled
        }
      });
      
      // Also set the old access code for compatibility (Legacy)
      sessionStorage.setItem('educasense_access_code', normalizedAccessCode);
      
      console.log('[Login] Session stored, redirecting...');

      // 4. Navigate
      // Alterado para redirecionar para a página do aluno (/student) em vez de ir direto para o jogo
      navigate('/student');
      
    } catch (err: any) {
      console.error('[Login] Flow Error:', err);
      setError(err?.message || 'Não foi possível entrar. Verifique o código.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-background-dark p-6 sm:p-8">
      <div className="flex-1 flex flex-col justify-center gap-8 max-w-md mx-auto w-full">
        <div className="space-y-4">
           <div className={`size-16 ${isSignUp && activeTab !== 'child' ? 'bg-indigo-600 text-white' : 'bg-primary text-black'} rounded-[24px] flex items-center justify-center font-black text-2xl shadow-glow transition-all duration-500`}>
             {isSignUp && activeTab !== 'child' ? (
               <span className="material-symbols-outlined text-3xl">person_add</span>
             ) : (
               'ES'
             )}
           </div>
           <h1 className="text-4xl font-black leading-tight transition-all duration-300">
              {activeTab === 'child' ? 'Acesse o' : (isSignUp ? 'Crie sua conta' : 'Acesse o')} <br/>
              <span className="text-primary italic">Educa Sense</span>
           </h1>
        </div>

        {/* Tabs de Perfis */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1.5 rounded-[24px]">
           {(['parent', 'child', 'teacher'] as const).map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`flex-1 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white dark:bg-surface-dark shadow-sm text-primary' : 'text-gray-400'}`}
             >
               {tab === 'parent' ? 'Família' : tab === 'child' ? 'Aluno' : 'Equipe'}
             </button>
           ))}
        </div>

        {activeTab !== 'child' ? (
          <form onSubmit={handleLogin} className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">E-mail de acesso</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={activeTab === 'teacher' ? "edu.professor@escola.com" : "familia@email.com"}
                className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary" 
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black uppercase text-text-sub tracking-widest">Senha</label>
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-16 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 font-bold focus:ring-2 focus:ring-primary"
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-bold">
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSignUp(v => !v)}
              className="w-full h-12 border border-gray-200 dark:border-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-text-sub active:bg-gray-50 transition-colors"
            >
              {isSignUp ? 'Já tenho conta' : 'Criar conta'}
            </button>
            <button 
              type="submit"
              disabled={loading}
              className={`w-full h-16 ${isSignUp ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-primary text-black'} font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3`}
            >
              {loading ? 'Aguarde...' : (isSignUp ? 'Criar conta' : `Entrar como ${activeTab === 'teacher' ? 'Docente' : 'Responsável'}`)}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleChildLoginRemote} className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1 text-center block">Seu Código Mágico</label>
              <input 
                type="text" 
                required
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                placeholder="Ex: LUC-123"
                className="w-full h-20 bg-primary/5 border-2 border-dashed border-primary/30 text-center text-3xl font-black rounded-3xl tracking-[8px] focus:ring-0" 
              />
            </div>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl p-4 text-xs font-bold">
                {error}
              </div>
            )}
            <button 
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? 'Validando...' : 'Iniciar Aventura'}
              <span className="material-symbols-outlined">rocket_launch</span>
            </button>
          </form>
        )}
      </div>
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-surface-dark w-full max-w-sm p-6 rounded-[32px] shadow-2xl relative">
            <button 
              onClick={() => { setShowForgotPassword(false); setResetMessage(null); setResetEmail(''); }}
              className="absolute top-4 right-4 size-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined text-gray-500">close</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="size-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary">
                <span className="material-symbols-outlined text-3xl">lock_reset</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white">Recuperar Senha</h3>
              <p className="text-xs text-gray-500 mt-2 max-w-[240px] mx-auto">
                Vamos enviar um link para você redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Seu E-mail</label>
                <input 
                  type="email" 
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full h-14 bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 font-bold focus:ring-2 focus:ring-primary" 
                />
              </div>

              {resetMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold text-center ${resetMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {resetMessage.text}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-14 bg-primary text-black font-black rounded-xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Enviando...' : 'Enviar Link'}
              </button>
            </form>
          </div>
        </div>
      )}
      <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-4">© 2025 Educa Sense • Versão 3.0</p>
    </div>
  );
};

export default LoginPage;
