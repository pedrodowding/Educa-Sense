import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Child } from '../../../types';
import { useFriends, useFriendRequests, useMyFriendCode } from '../../../hooks/useFriends';
import { useNotifications } from '../../../hooks/useNotifications';
import { FriendsList } from './components/FriendsList';
import { FriendInvites } from './components/FriendInvites';
import { AddFriendByCode } from './components/AddFriendByCode';
import { useStudent } from '../../../contexts/StudentContext';
import { useFamilyChildren } from '../../../contexts/FamilyChildrenContext';

export const FriendsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { student } = useStudent();
  const { familyChildren } = useFamilyChildren();
  const child = (location.state as any)?.child as Child || student || familyChildren[0];

  if (!child) {
    navigate('/'); 
    return null;
  }

  const [activeTab, setActiveTab] = useState<'friends' | 'invites' | 'add'>('friends');
  
  // Hooks
  const { friends, loading: loadingFriends } = useFriends(child.id);
  const { requests, loading: loadingRequests, sendRequest, respondRequest, cancelRequest } = useFriendRequests(child.id);
  const { code: myCode, loading: loadingCode } = useMyFriendCode(child.id);
  const { notifications, markAsRead, refresh: refreshNotifications } = useNotifications(child.id);

  const [loadingAction, setLoadingAction] = useState<string | null>(null);

  // Mark notifications as read on mount
  useEffect(() => {
    const markAllRead = async () => {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await markAsRead(n.id);
      }
      if (unread.length > 0) {
        refreshNotifications();
      }
    };
    if (notifications.length > 0) {
      markAllRead();
    }
  }, [notifications.length]); // Dependency on length to trigger when loaded

  if (child.friendsEnabled === false) {
    return (
      <div className="min-h-screen bg-background-light pb-20">
        <header className="bg-white px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <h1 className="text-xl font-black text-text-main flex-1">Meus Amigos</h1>
          <div className="w-10" />
        </header>
        <div className="p-6 max-w-lg mx-auto">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-gray-400">lock</span>
            </div>
            <h2 className="text-lg font-black text-text-main mb-2">Recurso desativado</h2>
            <p className="text-sm text-text-sub">Seu responsável desativou o uso de amigos.</p>
          </div>
        </div>
      </div>
    );
  }

  const showToast = (message: string) => {
     const toast = document.createElement('div');
     toast.className = 'fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full font-bold shadow-xl z-50 animate-bounce flex items-center gap-2';
     toast.innerHTML = `<span class="material-symbols-outlined">celebration</span> ${message}`;
     document.body.appendChild(toast);
     setTimeout(() => toast.remove(), 3000);
  };

  const handleAccept = async (id: string) => {
    setLoadingAction(id);
    const result = await respondRequest(id, 'accept');
    setLoadingAction(null);

    if (result.success) {
      // Refresh notifications to clear any "Invite Received" notification associated with this
      refreshNotifications();
      
      if ((result as any).hasNewSocialEvent) {
         showToast('Novo amigo adicionado 🎉');
      }
    }
  };

  const handleReject = async (id: string) => {
    setLoadingAction(id);
    await respondRequest(id, 'reject');
    setLoadingAction(null);
    refreshNotifications();
  };

  const handleCancel = async (id: string) => {
    setLoadingAction(id);
    await cancelRequest(id);
    setLoadingAction(null);
  };

  // Badge count
  const pendingCount = requests.filter(r => r.to_child_id === child.id && r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background-light pb-20">
      {/* Header Simples */}
      <header className="bg-white px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <button 
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-black text-text-main flex-1">Meus Amigos</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="p-4 max-w-lg mx-auto w-full">
        {/* Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl mb-6">
          <button
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'friends' 
                ? 'bg-white text-primary-dark shadow-sm' 
                : 'text-text-sub hover:bg-gray-200/50'
            }`}
          >
            Amigos
            {friends.length > 0 && (
              <span className="ml-1.5 bg-gray-200 text-gray-600 text-[10px] px-1.5 py-0.5 rounded-full">
                {friends.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all relative ${
              activeTab === 'invites' 
                ? 'bg-white text-primary-dark shadow-sm' 
                : 'text-text-sub hover:bg-gray-200/50'
            }`}
          >
            Convites
            {pendingCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'add' 
                ? 'bg-white text-primary-dark shadow-sm' 
                : 'text-text-sub hover:bg-gray-200/50'
            }`}
          >
            Adicionar
          </button>
        </div>

        {/* Content */}
        <div className="min-h-[300px]">
          {activeTab === 'friends' && (
            <FriendsList friends={friends} loading={loadingFriends} myChild={child} />
          )}

          {activeTab === 'invites' && (
            <FriendInvites 
              requests={requests} 
              childId={child.id}
              onAccept={handleAccept}
              onReject={handleReject}
              onCancel={handleCancel}
              loadingAction={loadingAction}
            />
          )}

          {activeTab === 'add' && (
            <AddFriendByCode 
              myCode={myCode} 
              loadingCode={loadingCode}
              onSendRequest={async (code) => {
                 const res = await sendRequest(code);
                 if (res.success) {
                    showToast('Convite enviado! 🚀');
                 }
                 return res;
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default FriendsPage;
