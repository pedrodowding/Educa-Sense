import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useFriendProfile, useFriendRequests } from '../../../hooks/useFriends';
import { useSocialInteractions, SocialUpdate } from '../../../hooks/useSocialInteractions';
import { calculateLevel } from '../../../services/gamificationService';
import { Child } from '../../../types';
import { useStudent } from '../../../contexts/StudentContext';
import { useFamilyChildren } from '../../../contexts/FamilyChildrenContext';

export const FriendProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { friendId } = useParams();
  const location = useLocation();
  const { student } = useStudent();
  const { familyChildren } = useFamilyChildren();
  const myChild = (location.state as any)?.child as Child || student || familyChildren[0]; 

  const { profile, badges, loading, error: profileError } = useFriendProfile(myChild?.id, friendId || '');
  const { blockUser } = useFriendRequests(myChild?.id);
  const { sendQuickMessage, sendChallenge, sendReaction, fetchUpdates, updates, isSending, error: socialError } = useSocialInteractions(myChild?.id || '');
  
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [localActionLoading, setLocalActionLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const interactionsEnabled = myChild?.socialInteractionsEnabled !== false;

  useEffect(() => {
    if (interactionsEnabled) {
      fetchUpdates();
    }
  }, [interactionsEnabled, fetchUpdates]);

  if (!myChild) {
      return (
        <div className="min-h-screen bg-background-light p-6 flex flex-col items-center justify-center text-center">
           <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">error</span>
           <p className="text-text-sub font-bold">Contexto do aluno perdido.</p>
           <button onClick={() => navigate('/student')} className="mt-4 text-primary font-bold">Voltar ao Início</button>
        </div>
      );
  }

  const showToastMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    // Sprint 7.3: Never show technical errors to child
    const safeMsg = type === 'error' ? 'Não foi possível enviar agora' : msg;
    setToast(safeMsg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleBlock = async () => {
    if (!friendId) return;
    setBlocking(true);
    const result = await blockUser(friendId, 'Bloqueado pelo perfil');
    setBlocking(false);
    setShowBlockConfirm(false);

    if (result.success) {
      showToastMessage('Usuário bloqueado');
      setTimeout(() => navigate(-1), 1000);
    } else {
      // Log error but show safe message
      console.error(result.error);
      showToastMessage('Erro ao bloquear', 'error');
    }
  };

  const handleSendMessage = async (msgLabel: string) => {
    if (!friendId || isSending) return;
    
    const msgMap: Record<string, string> = {
      'Boa!': 'boa',
      'Parabéns!': 'parabens',
      'Bora jogar?': 'bora_jogar',
      'Você consegue!': 'voce_consegue'
    };
    const msgId = msgMap[msgLabel];
    
    const success = await sendQuickMessage(friendId, msgId);

    if (success) {
      showToastMessage('Mensagem enviada 😊');
    } else {
      showToastMessage('Não foi possível enviar agora', 'error');
    }
  };

  const handleChallenge = async () => {
    if (!friendId || localActionLoading) return;
    setLocalActionLoading(true);
    const result = await sendChallenge(friendId, 'complete_daily_plan');
    setLocalActionLoading(false);

    if (result === true) {
      showToastMessage('Desafio enviado!');
    } else if (result === 'ALREADY_PENDING') {
      showToastMessage('Já existe um desafio pendente!');
    } else {
      showToastMessage('Não foi possível enviar', 'error');
    }
  };


  const handleReaction = async (eventId: string, reactionEmoji: string) => {
    if (!friendId) return;
    const reactionMap: Record<string, string> = {
      '👍': 'parabens',
      '⭐': 'muito_bem',
      '🚀': 'bora'
    };
    const reactionType = reactionMap[reactionEmoji];
    
    const result = await sendReaction(friendId, eventId, reactionType);
    if (result) {
      showToastMessage('Reação enviada!');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background-light flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-4xl text-primary">progress_activity</span>
      </div>
    );
  }

  // Fallback seguro se falhar o perfil
  if (profileError || !profile) {
    return (
      <div className="min-h-screen bg-background-light p-6">
        <header className="flex items-center gap-4 mb-6">
           <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="material-symbols-outlined">arrow_back</span></button>
           <h1 className="text-xl font-black">Ops!</h1>
        </header>
        <div className="p-8 text-center bg-white rounded-3xl shadow-sm">
           <p className="text-text-sub font-bold">Não conseguimos carregar o perfil agora.</p>
           <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold text-sm">Voltar</button>
        </div>
      </div>
    );
  }

  const level = calculateLevel(profile.xp);
  const friendUpdates = updates.filter(u => u.child_id === friendId);

  return (
    <div className="min-h-screen bg-background-light pb-20">
      {toast && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full font-bold shadow-xl z-50 animate-bounce flex items-center gap-2 whitespace-nowrap ${toast.includes('Não') ? 'bg-red-500 text-white' : 'bg-gray-800 text-white'}`}>
           <span className="material-symbols-outlined text-sm">{toast.includes('Não') ? 'error' : 'check_circle'}</span> {toast}
        </div>
      )}

      <header className="bg-primary/10 px-6 pt-6 pb-20 relative">
        <div className="flex items-center gap-4 relative z-10">
          <button 
            onClick={() => navigate(`/student/messages/${friendId}`)}
            className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-text-main active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">chat</span>
          </button>
          <button 
            onClick={() => navigate('/student/friends')}
            className="w-10 h-10 rounded-full bg-white/50 backdrop-blur-sm flex items-center justify-center text-text-main active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <h1 className="text-xl font-black text-primary-dark flex-1 text-center pr-10">Perfil do Amigo</h1>
        </div>
      </header>

      <div className="px-6 -mt-16 relative z-10">
         <div className="bg-white rounded-[40px] shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
            <div className="size-24 rounded-3xl bg-gray-100 border-4 border-white shadow-lg overflow-hidden mb-4">
               <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover" />
            </div>
            <h2 className="text-2xl font-black text-text-main mb-1">{profile.name}</h2>
            <div className="flex items-center gap-2 mb-4">
               <span className="bg-primary/10 text-primary-dark px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide">
                 Nível {level}
               </span>
               <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide flex items-center gap-1">
                 <span className="material-symbols-outlined text-sm filled">local_fire_department</span>
                 {profile.streak} Dias
               </span>
            </div>
            
            <div className="bg-blue-50 text-blue-600 px-4 py-3 rounded-2xl text-sm font-bold w-full mb-4">
               Vocês estão aprendendo juntos! 🚀
            </div>

            <button 
              onClick={() => setShowBlockConfirm(true)}
              className="text-red-400 text-xs font-bold uppercase tracking-widest hover:text-red-600 transition-colors flex items-center gap-1"
            >
               <span className="material-symbols-outlined text-sm">block</span>
               Bloquear Usuário
            </button>
         </div>
      </div>

      {interactionsEnabled && (
        <div className="px-6 mt-6 space-y-6">
           {/* Mensagens Rápidas */}
           <div>
             <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-500">forum</span>
                Mandar Mensagem
             </h3>
             <div className="grid grid-cols-2 gap-3 mb-3">
                <button 
                  onClick={() => navigate(`/student/messages/${friendId}`)}
                  className="col-span-2 py-3 px-4 bg-purple-500 text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">chat_bubble</span>
                  Abrir Conversa
                </button>
                {['Boa!', 'Parabéns!', 'Bora jogar?', 'Você consegue!'].map(msg => (
                  <button 
                    key={msg}
                    onClick={() => handleSendMessage(msg)}
                    disabled={isSending}
                    className={`py-3 px-4 bg-white border-2 border-purple-100 text-purple-700 rounded-2xl font-bold text-sm shadow-sm active:scale-95 active:bg-purple-50 transition-all hover:border-purple-200 ${isSending ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {msg}
                  </button>
                ))}
             </div>
             {/* Sprint 7.3: Remove technical error text below buttons */}
           </div>

           {/* Desafios */}
           <div>
             <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-orange-500">flag</span>
                Desafiar
             </h3>
             <button 
               onClick={handleChallenge}
               disabled={localActionLoading}
               className="w-full py-4 bg-gradient-to-r from-orange-400 to-red-400 text-white rounded-2xl font-black shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
             >
                <span className="material-symbols-outlined">task_alt</span>
                Desafiar: Completar Plano de Hoje
             </button>
           </div>

           {/* Atualizações e Reações */}
           {/* Sprint 7.3: Fallback Narrativo para Feed Vazio */}
           <div>
             <h3 className="font-black text-lg mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-500">feed</span>
                Atividades Recentes
             </h3>
             {friendUpdates.length > 0 ? (
               <div className="space-y-3">
                  {friendUpdates.map(update => (
                    <div key={update.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                       <div className="flex items-center gap-3 mb-3">
                          <div className="size-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                             <span className="material-symbols-outlined">
                                {update.activity_type === 'daily_plan_completed' ? 'verified' : 'military_tech'}
                             </span>
                          </div>
                          <div>
                             <p className="font-bold text-sm leading-tight">
                                {update.activity_type === 'daily_plan_completed' ? 'Completou o Plano Diário!' : 'Ganhou uma Medalha!'}
                             </p>
                             <p className="text-[10px] text-text-sub font-bold uppercase">
                                {new Date(update.completed_date).toLocaleDateString('pt-BR')}
                             </p>
                          </div>
                       </div>
                       
                       {update.has_reacted ? (
                         <div className="bg-gray-50 text-gray-400 py-2 rounded-xl text-center text-xs font-bold uppercase tracking-wide">
                           Você já reagiu 👍
                         </div>
                       ) : (
                         <div className="flex gap-2">
                            {['👍','⭐','🚀'].map(emoji => (
                              <button 
                                key={emoji}
                                onClick={() => handleReaction(update.id, emoji)}
                                className="flex-1 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-xl transition-colors active:scale-90"
                              >
                                {emoji}
                              </button>
                            ))}
                         </div>
                       )}
                    </div>
                  ))}
               </div>
             ) : (
               <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                  <span className="text-4xl mb-2 block">🎮</span>
                  <p className="text-sm font-bold text-gray-600">Seu amigo também está jogando hoje!</p>
                  <p className="text-xs text-gray-400 mt-1">Que tal mandar uma mensagem?</p>
               </div>
             )}
           </div>
        </div>
      )}

      <div className="px-6 mt-6">
         <h3 className="font-black text-lg mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-yellow-500 filled">emoji_events</span>
            Conquistas Recentes
         </h3>
         
         {badges.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-3xl border border-gray-100">
               <p className="text-sm text-text-sub font-bold">Ainda sem conquistas visíveis.</p>
            </div>
         ) : (
            <div className="grid grid-cols-3 gap-3">
               {badges.map((badge: any, idx: number) => (
                  <div key={idx} className="bg-white p-3 rounded-2xl border border-gray-100 flex flex-col items-center gap-2 shadow-sm">
                     <div className="size-10 bg-yellow-100 text-yellow-600 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined">{badge.icon || 'star'}</span>
                     </div>
                     <span className="text-[10px] font-black uppercase text-center leading-tight line-clamp-2">{badge.name}</span>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Block Confirmation Modal */}
      {showBlockConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-6 max-w-sm w-full animate-fade-in-up">
            <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4 mx-auto">
              <span className="material-symbols-outlined text-2xl">block</span>
            </div>
            <h3 className="text-xl font-black text-center mb-2">Bloquear {profile.name}?</h3>
            <p className="text-center text-text-sub text-sm mb-6">
              Vocês deixarão de ser amigos e ele não poderá enviar novos convites.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowBlockConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-text-sub font-bold text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={handleBlock}
                disabled={blocking}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20"
              >
                {blocking ? '...' : 'Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
