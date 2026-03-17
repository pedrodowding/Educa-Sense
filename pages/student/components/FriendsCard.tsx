import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Child } from '../../../types';
import { useFriends } from '../../../hooks/useFriends';
import { useNotifications } from '../../../hooks/useNotifications';
import { useSocialInteractions } from '../../../hooks/useSocialInteractions';

interface Props {
  child: Child;
}

export const FriendsCard: React.FC<Props> = ({ child }) => {
  const navigate = useNavigate();
  const { friends, loading: friendsLoading } = useFriends(child.id);
  const { unreadCount, notifications, loading: notificationsLoading } = useNotifications(child.id);
  const { updates, fetchUpdates } = useSocialInteractions(child.id);

  useEffect(() => {
    if (child.friendsEnabled !== false) {
      fetchUpdates();
    }
  }, [child.id]);

  if (child.friendsEnabled === false) {
    return null;
  }

  const latestNotification = notifications.length > 0 ? notifications[0] : null;
  const latestActivity = updates.length > 0 ? updates[0] : null;
  const hasUnread = unreadCount > 0;

  // Sprint 7: Microfeedback Social & CTAs Contextuais
  const getCardContent = () => {
    if (friendsLoading) return { title: 'Amigos', subtitle: '...' };
    
    // Estado 1: 0 Amigos -> CTA: Adicionar
    if (friends.length === 0) {
      return {
        title: 'Amigos',
        subtitle: <span className="text-blue-600 font-black">Adicionar um amigo +</span>
      };
    }

    // Estado 2: Mensagem Social Não Lida (Sprint Audit: Consolidação)
    const unreadMessage = notifications.find(n => !n.read && n.type === 'social_message');
    if (unreadMessage) {
        return {
            title: 'Nova Mensagem!',
            subtitle: <span className="text-green-600 font-black truncate">Ler recados 💬</span>,
            action: () => navigate('/student/inbox')
        };
    }

    // Estado 3: Outras Notificações (Convites, etc)
    if (latestNotification && !latestNotification.read) {
        return {
            title: 'Novidades!',
            subtitle: <span className="text-blue-600 font-black truncate">{latestNotification.title || latestNotification.message}</span>,
            action: () => navigate('/student/friends', { state: { child } })
        };
    }

    // Estado 4: Atividade Recente
    if (latestActivity) {
        const name = latestActivity.child_name.split(' ')[0];
        return {
            title: 'Novidades!',
            subtitle: <span className="text-blue-600 font-black truncate">Ver o que {name} fez</span>,
            action: () => navigate('/student/friends', { state: { child } })
        };
    }

    // Estado 5: Com amigos, sem novidades
    return {
        title: 'Amigos',
        subtitle: <span className="text-purple-500 font-black">Mandar mensagem 💬</span>,
        action: () => navigate('/student/messages', { state: { child } })
    };
  };

  const { title, subtitle, action } = getCardContent();

  return (
    <div 
      onClick={action}
      className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 relative overflow-hidden active:scale-95 transition-all cursor-pointer group"
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 group-hover:bg-blue-100 transition-colors" />
      
      <div className="relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">group</span>
          </div>
          <div>
            <h3 className="font-black text-lg text-text-main leading-tight">{title}</h3>
            <p className="text-xs text-text-sub font-bold truncate max-w-[150px] sm:max-w-xs">
              {subtitle}
            </p>
          </div>
        </div>

        {hasUnread && (
          <div className="bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-md animate-bounce">
            {unreadCount}
          </div>
        )}

        {!hasUnread && (
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary group-hover:text-black transition-colors">
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        )}
      </div>
    </div>
  );
};
