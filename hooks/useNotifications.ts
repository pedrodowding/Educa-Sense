import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { ChildNotification } from '../types';
import { retryOperation } from '../services/retry';

export function useNotifications(childId: string) {
  const [notifications, setNotifications] = useState<ChildNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      // Fetch list
      // Note: We pass p_child_id explicitly to support Guardian view.
      // The RPC is robust enough to handle null if we wanted to rely on session,
      // but passing it is safer for the current Guardian-centric UI.
      const mappedNotifications = await retryOperation(async () => {
        const { data: listData, error: listError } = await supabase.rpc('rpc_list_notifications', {
          p_child_id: childId,
          p_limit: 20
        });

        if (listError) {
          // Guardrail: If function not found or other RPC error, don't crash app
          // PGRST202: Function not found (often schema cache issue)
          // 42883: Undefined function
          if (listError.code === 'PGRST202' || listError.message?.includes('function') || listError.code === '42883') {
            console.warn('[Notifications] RPC issue (PGRST202/42883). Returning empty list safely.', listError);
            return [];
          }
          throw listError;
        }
        
        // Map RPC result to ChildNotification
        return (listData || []).map((n: any) => ({
          id: n.id,
          type: n.type,
          // Sprint 7.3 Compatibility: Support both message and body
          message: n.message || n.body || '',
          title: n.title || 'Nova notificação',
          metadata: n.metadata,
          read: n.read,
          createdAt: n.created_at
        }));
      }, 3, 1000, 2, 'fetchNotificationsList');

      setNotifications(mappedNotifications);

      // Fetch count
      const count = await retryOperation(async () => {
        const { data: countData, error: countError } = await supabase.rpc('rpc_get_unread_notifications_count', {
          p_child_id: childId
        });

        if (countError) {
           if (countError.code === 'PGRST202' || countError.message?.includes('function') || countError.code === '42883') {
              console.warn('[Notifications] Count RPC issue. Defaulting to 0.');
              return 0;
           }
           throw countError;
        }
        return countData as number;
      }, 3, 1000, 2, 'fetchNotificationsCount');

      setUnreadCount(count);

    } catch (error) {
      console.error('[Notifications] Error fetching:', error);
      // Fallback state
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  const markAsRead = async (notificationId: string) => {
    try {
      const { data, error } = await supabase.rpc('rpc_mark_notification_read', {
        p_notification_id: notificationId
      });

      if (error) throw error;
      if (data) {
        setNotifications(prev => prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('[Notifications] Error marking as read:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Optional: Real-time subscription could go here
  }, [fetchNotifications]);

  return { 
    notifications, 
    unreadCount, 
    loading, 
    refresh: fetchNotifications,
    markAsRead
  };
}
