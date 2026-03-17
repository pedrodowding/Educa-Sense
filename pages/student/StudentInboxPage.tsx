import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../contexts/StudentContext';
import { useFamilyChildren } from '../../contexts/FamilyChildrenContext';
import { useNotifications } from '../../hooks/useNotifications';
import { ChildNotification } from '../../types';

export const StudentInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const { student } = useStudent();
  const { familyChildren } = useFamilyChildren();
  const selectedChild = student || familyChildren[0] || null;
  
  if (!selectedChild) {
      navigate('/student');
      return null;
  }

  const { notifications, loading, markAsRead, refresh } = useNotifications(selectedChild.id);
  
  // Filter only social messages
  const messages = notifications.filter(n => n.type === 'social_message');
  
  useEffect(() => {
    refresh();
  }, []);

  // Sprint 9.1: Mark all visible social messages as read on open
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const unreadIds = messages.filter(m => !m.read).map(m => m.id);
      if (unreadIds.length > 0) {
        // Mark strictly the ones visible
        unreadIds.forEach(id => markAsRead(id));
      }
    }
  }, [loading, messages.length, markAsRead]); // Depend on length to avoid loops if markAsRead updates object ref but not length


  const handleRead = async (id: string) => {
      await markAsRead(id);
  };

  return (
    <div className="min-h-screen bg-background-light pb-20">
      <header className="bg-white px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <button 
          onClick={() => navigate('/student')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-black text-text-main flex-1">Meus Recados</h1>
      </header>

      <main className="p-6 max-w-md mx-auto space-y-4">
        {loading && (
            <div className="text-center py-10">
                <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs font-bold text-gray-400">Carregando...</p>
            </div>
        )}

        {!loading && messages.length === 0 && (
            <div className="text-center py-10 bg-white rounded-3xl border border-gray-100">
                <div className="size-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <span className="material-symbols-outlined text-3xl">inbox</span>
                </div>
                <h3 className="font-black text-gray-400">Nenhum recado novo por aqui 💌</h3>
                <p className="text-xs text-gray-400 mt-1">Peça para seus amigos mandarem um "Oi"!</p>
            </div>
        )}

        {messages.map(msg => (
            <div 
                key={msg.id} 
                className={`p-5 rounded-3xl border transition-all ${
                    msg.read 
                    ? 'bg-white border-gray-100 opacity-80' 
                    : 'bg-blue-50 border-blue-100 shadow-sm scale-100'
                }`}
                onClick={() => !msg.read && handleRead(msg.id)}
            >
                <div className="flex items-start gap-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${
                        msg.read ? 'bg-gray-100 text-gray-400' : 'bg-white text-blue-500 shadow-sm'
                    }`}>
                        <span className="material-symbols-outlined">
                            {msg.metadata?.message_id === 'parabens' ? 'celebration' : 
                             msg.metadata?.message_id === 'bora_jogar' ? 'videogame_asset' : 'chat'}
                        </span>
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                            <h3 className="font-black text-gray-900 text-sm">
                                {msg.metadata?.from_child_name || 'Amigo'}
                            </h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">
                                {new Date(msg.createdAt || Date.now()).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                            </span>
                        </div>
                        <p className="text-gray-600 font-medium leading-relaxed">
                            {msg.message}
                        </p>
                        {!msg.read && (
                            <div className="mt-3 flex justify-end">
                                <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-2 py-1 rounded-lg">
                                    NOVO
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        ))}
      </main>
    </div>
  );
};
