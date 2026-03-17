import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { fetchNotifications, markAsRead, markAllAsRead, Notification } from '../../services/notificationService';

const NotificationsBell: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (user) {
      loadNotifications();
      // Optional: Polling or Subscription
      const interval = setInterval(loadNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    if (!user) return;
    const data = await fetchNotifications(user.id);
    setNotifications(data);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllAsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-500 hover:text-primary transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 size-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white dark:border-background-dark">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-surface-dark rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <h3 className="font-bold text-sm">Notificações</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[10px] text-primary font-bold hover:underline">
                Marcar todas como lidas
              </button>
            )}
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                Nenhuma notificação
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {notifications.map(n => (
                  <div key={n.id} className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${n.read ? 'opacity-60' : 'bg-blue-50/30 dark:bg-blue-900/10'}`}>
                    <div className="flex gap-3">
                      <div className={`mt-1 size-2 rounded-full shrink-0 ${
                        n.type === 'error' ? 'bg-red-500' :
                        n.type === 'success' ? 'bg-green-500' :
                        n.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                      }`} />
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-bold leading-tight">{n.title}</p>
                        <p className="text-xs text-text-sub">{n.message}</p>
                        <p className="text-[10px] text-gray-300">{new Date(n.createdAt).toLocaleDateString()} {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                      </div>
                      {!n.read && (
                        <button 
                          onClick={() => handleMarkAsRead(n.id)}
                          className="self-start text-gray-400 hover:text-primary"
                          title="Marcar como lida"
                        >
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsBell;
