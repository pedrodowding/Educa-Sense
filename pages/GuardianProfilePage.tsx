
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Guardian } from '../types';
import { RoleManager, AppRole } from '../services/roleManager';
import { schoolService } from '../services/schoolService';

import { Entitlements } from '../billing/entitlements';
import { MercadoPagoProvider } from '../billing/providers/mercadoPagoProvider';

interface Props {
  guardian: Guardian | null;
  onUpdate: (updates: Partial<Guardian>) => Promise<void>;
  onLogout: () => void;
}

const GuardianProfilePage: React.FC<Props> = ({ guardian, onUpdate, onLogout }) => {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();
  
  // Force refresh on mount to ensure we have latest plan status
  useEffect(() => {
    refreshProfile();
  }, []);

  const [name, setName] = useState(guardian?.name || '');
  const [email, setEmail] = useState(guardian?.email || '');
  const [saving, setSaving] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState(guardian?.avatar || '');
  
  // School Invite State
  const [showSchoolInvite, setShowSchoolInvite] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const currentTier = Entitlements.getUserTier();
  const isPro = currentTier === 'PRO';

  const avatarSeeds = [
    'Felix', 'Aneka', 'Willow', 'Bella', 'Trouble', 'Oscar', 
    'Callie', 'Buster', 'Coco', 'Milo', 'Luna', 'Simba'
  ];

  if (!guardian) return null;

  const handleManageSubscription = async () => {
    if (isPro) {
      const { portalUrl } = await MercadoPagoProvider.openCustomerPortal(guardian.id);
      window.open(portalUrl, '_blank');
    } else {
      navigate('/assinatura');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({ name, email, avatar: currentAvatar });
      alert('Perfil atualizado com sucesso!');
    } finally {
      setSaving(false);
    }
  };

  const handleSwitchRole = (newRole: AppRole) => {
    RoleManager.setRole(newRole);
    if (newRole === 'teacher') {
      navigate('/teacher');
    } else if (newRole === 'director') {
      navigate('/school');
    } else {
      navigate('/dashboard');
    }
  };

  const handleAcceptInvite = async () => {
      if (!inviteCode.trim()) return;
      setInviteStatus('loading');
      
      const res = await schoolService.acceptSchoolInvitation(inviteCode);
      if (res.success) {
          setInviteStatus('success');
          setTimeout(() => {
              setShowSchoolInvite(false);
              setInviteCode('');
              setInviteStatus('idle');
              // Se aceitou como professor, oferece troca
              if (confirm('Convite aceito! Deseja ir para o painel do professor agora?')) {
                  handleSwitchRole('teacher');
              }
          }, 1500);
      } else {
          setInviteStatus('error');
          alert('Erro ao aceitar convite: ' + (res.error === 'INVALID_OR_EXPIRED_CODE' ? 'Código inválido ou expirado' : res.error));
          setInviteStatus('idle');
      }
  };

  return (
    <div className="flex flex-col min-h-full pb-10 bg-gray-50 dark:bg-background-dark">
      <header className="p-6 pt-10 flex items-center justify-between bg-white dark:bg-surface-dark border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-2xl font-black text-primary leading-none">Seu Perfil</h1>
            <p className="text-[10px] font-bold text-text-sub uppercase tracking-widest mt-1">Gerencie sua conta</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="size-10 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 active:scale-95 transition-all"
          title="Sair"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </header>

      <main className="px-6 py-8 space-y-6">
        <div className="flex flex-col items-center">
          <div 
            className="size-32 rounded-[40px] bg-gray-200 overflow-hidden border-4 border-primary shadow-xl mb-4 relative cursor-pointer"
            onClick={() => setShowAvatarSelector(true)}
          >
             <img 
                src={currentAvatar} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                    const currentSrc = e.currentTarget.src;
                    if (currentSrc.includes('dicebear.com/7.x')) {
                        e.currentTarget.src = currentSrc.replace('7.x', '9.x');
                    } else {
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${name}&background=random`;
                    }
                }}
             />
             <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-white">photo_camera</span>
             </div>
          </div>
          <button onClick={() => setShowAvatarSelector(true)} className="text-xs font-black text-primary uppercase tracking-widest">Alterar Foto</button>
        </div>

        <section className="bg-white dark:bg-surface-dark p-6 rounded-[32px] shadow-soft border border-gray-100 dark:border-gray-800 space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Nome Completo</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold focus:ring-2 focus:ring-primary" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl h-14 px-4 font-bold focus:ring-2 focus:ring-primary" 
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1">Plano Atual</label>
            <div className={`w-full ${isPro ? 'bg-primary/10' : 'bg-gray-100'} rounded-2xl p-4 flex flex-col gap-3`}>
              <div className="flex items-center justify-between">
                <span className={`font-black ${isPro ? 'text-primary' : 'text-gray-600'} uppercase tracking-widest`}>
                  {isPro ? 'Plano: Pro · Assinatura ativa' : 'Plano: Free · Gratuito'}
                </span>
                <span className={`${isPro ? 'bg-primary text-black' : 'bg-gray-300 text-gray-600'} text-[10px] font-black px-2 py-1 rounded`}>
                  {isPro ? 'PRO' : 'FREE'}
                </span>
              </div>
              
              <button 
                onClick={handleManageSubscription}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95 ${
                  isPro 
                    ? 'bg-white border-2 border-primary text-primary' 
                    : 'bg-primary text-black shadow-lg shadow-primary/20'
                }`}
              >
                {isPro ? 'Gerenciar assinatura' : 'Assinar Plano Pro'}
              </button>
            </div>
            
            <section className="pt-4 border-t border-gray-100 dark:border-gray-800">
               <p className="text-[10px] font-black uppercase text-text-sub tracking-widest px-1 mb-3">Módulos Escolares (Acesso Rápido)</p>
               
               {/* Invite Banner */}
               <div 
                 onClick={() => setShowSchoolInvite(true)}
                 className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border-2 border-dashed border-orange-200 dark:border-orange-800 rounded-2xl flex items-center gap-3 cursor-pointer hover:bg-orange-100 transition-colors"
               >
                   <div className="size-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                       <span className="material-symbols-outlined">mail</span>
                   </div>
                   <div>
                       <p className="font-black text-sm text-orange-800 dark:text-orange-200">Tem um código de convite?</p>
                       <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">Entre em uma escola agora</p>
                   </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleSwitchRole('teacher')}
                    className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex flex-col items-center gap-2 border border-blue-100 dark:border-blue-800 hover:scale-[1.02] transition-transform"
                  >
                     <span className="material-symbols-outlined text-blue-500">school</span>
                     <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase">Sou Professor</span>
                  </button>
                  <button 
                    onClick={() => handleSwitchRole('director')}
                    className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex flex-col items-center gap-2 border border-purple-100 dark:border-purple-800 hover:scale-[1.02] transition-transform"
                  >
                     <span className="material-symbols-outlined text-purple-500">admin_panel_settings</span>
                     <span className="text-xs font-black text-purple-700 dark:text-purple-300 uppercase">Sou Diretor</span>
                  </button>
               </div>
            </section>
          </div>
        </section>

        <div className="space-y-3 pt-4">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="w-full h-16 bg-primary text-black font-black text-lg rounded-2xl shadow-glow active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          <button 
            onClick={onLogout}
            className="w-full h-14 border-2 border-red-500/20 text-red-500 font-bold uppercase text-[10px] tracking-widest rounded-2xl active:bg-red-500/10 transition-colors"
          >
            Sair da Conta
          </button>
        </div>
      </main>

      {/* Modal School Invite */}
      {showSchoolInvite && (
          <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[32px] p-8 shadow-2xl animate-fade-in">
                 <div className="flex justify-between items-center mb-6">
                     <h3 className="text-xl font-black">Entrar em uma Escola</h3>
                     <button onClick={() => setShowSchoolInvite(false)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                       <span className="material-symbols-outlined">close</span>
                     </button>
                 </div>
                 
                 {inviteStatus === 'success' ? (
                     <div className="text-center py-8 text-green-600">
                         <span className="material-symbols-outlined text-6xl mb-4">check_circle</span>
                         <h3 className="text-xl font-black">Bem-vindo!</h3>
                         <p className="text-sm font-bold mt-2">Você agora faz parte da escola.</p>
                     </div>
                 ) : (
                     <div className="space-y-4">
                         <p className="text-sm text-text-sub">Insira o código fornecido pelo diretor da escola.</p>
                         <input 
                             type="text"
                             value={inviteCode}
                             onChange={e => setInviteCode(e.target.value.toUpperCase())}
                             placeholder="Código (ex: A1B2C3D4)"
                             className="w-full h-16 text-center text-2xl font-black tracking-widest uppercase bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all"
                             maxLength={8}
                         />
                         <button 
                             onClick={handleAcceptInvite}
                             disabled={inviteStatus === 'loading' || !inviteCode}
                             className="w-full h-14 bg-primary text-black font-black rounded-2xl shadow-glow active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                         >
                             {inviteStatus === 'loading' ? 'Verificando...' : 'Entrar na Escola'}
                         </button>
                     </div>
                 )}
             </div>
          </div>
      )}

      {/* Modal Seleção de Avatar */}
      {showAvatarSelector && (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-end justify-center p-4">
           <div className="w-full max-w-md bg-white dark:bg-surface-dark rounded-[40px] p-8 shadow-2xl animate-fade-in-up">
              <div className="flex justify-between items-center mb-6">
                 <h2 className="text-xl font-black">Escolher Avatar</h2>
                 <button onClick={() => setShowAvatarSelector(false)} className="size-10 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                   <span className="material-symbols-outlined">close</span>
                 </button>
              </div>
              <div className="grid grid-cols-4 gap-4 max-h-[50vh] overflow-y-auto p-2">
                 {avatarSeeds.map(seed => {
                   const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`;
                   return (
                     <button 
                       key={seed}
                       type="button"
                       onClick={() => {
                         setCurrentAvatar(url);
                         setShowAvatarSelector(false);
                       }}
                       className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-primary hover:scale-105 transition-all bg-gray-100"
                     >
                        <img 
                            src={url} 
                            alt={seed} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                e.currentTarget.src = `https://ui-avatars.com/api/?name=${seed}&background=random`;
                            }}
                        />
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default GuardianProfilePage;
