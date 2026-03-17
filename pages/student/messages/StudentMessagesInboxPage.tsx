
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudent } from '../../../contexts/StudentContext';
import { useFamilyChildren } from '../../../contexts/FamilyChildrenContext';
import { messagesService, Thread } from '../../../services/messagesService';

export const StudentMessagesInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const { student } = useStudent();
  const { familyChildren } = useFamilyChildren();
  const selectedChild = student || familyChildren[0] || null;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedChild) {
      loadInbox();
    }
  }, [selectedChild]);

  const loadInbox = async () => {
    if (!selectedChild) return;
    setLoading(true);
    try {
      const data = await messagesService.getInbox(selectedChild.id);
      setThreads(data);
    } catch (error) {
      console.error('Error loading inbox:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedChild) {
    navigate('/student');
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light pb-20">
      <header className="bg-white px-6 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
        <button 
          onClick={() => navigate('/student')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-xl font-black text-text-main flex-1">Minhas Conversas</h1>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-3">
        {loading ? (
          <div className="text-center py-10">
             <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
             <p className="text-xs font-bold text-gray-400">Carregando...</p>
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 p-6">
             <div className="size-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-300">
                <span className="material-symbols-outlined text-3xl">forum</span>
             </div>
             <h3 className="font-black text-gray-400">Nenhuma conversa ainda 👋</h3>
             <p className="text-xs text-gray-400 mt-1 mb-4">Mande um oi para seus amigos!</p>
             <button 
               onClick={() => navigate('/student/friends')}
               className="bg-purple-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
             >
               Ver Amigos
             </button>
          </div>
        ) : (
          threads.map(thread => (
            <button
              key={thread.threadKey}
              onClick={() => navigate(`/student/messages/${thread.friendId}`)}
              className="w-full bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-95 transition-all flex items-center gap-4 text-left"
            >
              <div className="relative">
                <div className="size-12 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                   {thread.friendAvatar ? (
                     <img src={thread.friendAvatar} alt={thread.friendName} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">👤</div>
                   )}
                </div>
                {thread.unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black size-5 flex items-center justify-center rounded-full border-2 border-white">
                    {thread.unreadCount}
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                   <h3 className="font-black text-gray-800 text-sm truncate">{thread.friendName}</h3>
                   <span className="text-[10px] font-bold text-gray-400">
                     {new Date(thread.lastMessage.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                   </span>
                </div>
                <p className={`text-xs truncate ${thread.unreadCount > 0 ? 'font-bold text-gray-800' : 'font-medium text-gray-500'}`}>
                   {thread.lastMessage.sender_id === selectedChild.id ? 'Você: ' : ''}{thread.lastMessage.body}
                </p>
              </div>
              
              <span className="material-symbols-outlined text-gray-300">chevron_right</span>
            </button>
          ))
        )}
      </main>
    </div>
  );
};
