
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useStudent } from '../../../contexts/StudentContext';
import { useFamilyChildren } from '../../../contexts/FamilyChildrenContext';
import { messagesService, Message } from '../../../services/messagesService';
import { useFriendProfile } from '../../../hooks/useFriends';

export const StudentConversationPage: React.FC = () => {
  const navigate = useNavigate();
  const { friendId } = useParams();
  const { student } = useStudent();
  const { familyChildren } = useFamilyChildren();
  const selectedChild = student || familyChildren[0] || null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // Load friend profile for header
  const { profile: friend } = useFriendProfile(selectedChild?.id, friendId || '');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedChild && friendId) {
      loadMessages();
      // Mark as read immediately
      messagesService.markAsRead(selectedChild.id, friendId);
    }
  }, [selectedChild, friendId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    if (!selectedChild || !friendId) return;
    setLoading(true);
    try {
      const data = await messagesService.getMessages(selectedChild.id, friendId);
      setMessages(data);
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedChild || !friendId || !newMessage.trim() || sending) return;

    setSending(true);
    try {
      const msg = await messagesService.sendMessage(selectedChild.id, friendId, newMessage);
      setMessages(prev => [...prev, msg]);
      setNewMessage('');
    } catch (error) {
      alert('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (!selectedChild || !friendId) {
    navigate('/student');
    return null;
  }

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <button 
          onClick={() => navigate('/student/messages')}
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-text-main active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
           <div className="size-10 rounded-full bg-gray-200 overflow-hidden border border-gray-100 shrink-0">
              {friend?.avatar ? (
                <img src={friend.avatar} alt={friend.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>
              )}
           </div>
           <div className="min-w-0">
              <h1 className="text-base font-black text-text-main truncate">{friend?.name || 'Amigo'}</h1>
              <p className="text-[10px] text-green-500 font-bold flex items-center gap-1">
                 <span className="size-2 rounded-full bg-green-500 block"></span>
                 Online agora
              </p>
           </div>
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 p-4 overflow-y-auto space-y-4">
        {loading ? (
           <div className="text-center py-10">
              <div className="size-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
           </div>
        ) : messages.length === 0 ? (
           <div className="text-center py-20 opacity-50">
              <span className="text-4xl block mb-2">👋</span>
              <p className="text-sm font-bold">Diga oi para começar!</p>
           </div>
        ) : (
           messages.map(msg => {
             const isMe = msg.sender_id === selectedChild.id;
             return (
               <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium ${
                    isMe 
                      ? 'bg-purple-500 text-white rounded-br-none shadow-md' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none shadow-sm'
                  }`}>
                     {msg.body}
                     <div className={`text-[9px] mt-1 text-right ${isMe ? 'text-purple-200' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        {isMe && (
                           <span className="material-symbols-outlined text-[10px] ml-1 align-middle">
                              {msg.read_at ? 'done_all' : 'check'}
                           </span>
                        )}
                     </div>
                  </div>
               </div>
             );
           })
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* Input Area */}
      <footer className="bg-white p-3 border-t border-gray-100 sticky bottom-0">
         <form onSubmit={handleSend} className="flex gap-2 items-end max-w-md mx-auto">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escreva uma mensagem..."
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 max-h-32 resize-none"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button 
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="size-11 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
            >
               {sending ? (
                 <span className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
               ) : (
                 <span className="material-symbols-outlined text-xl ml-0.5">send</span>
               )}
            </button>
         </form>
      </footer>
    </div>
  );
};
