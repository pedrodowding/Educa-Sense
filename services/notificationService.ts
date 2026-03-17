import { supabase } from './supabase';
import { retryOperation } from './retry';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    return await retryOperation(async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((n: any) => ({
        id: n.id,
        userId: n.user_id,
        title: n.title,
        message: n.message,
        type: n.type,
        read: n.read,
        createdAt: n.created_at
      }));
    }, 3, 1000, 2, 'fetchNotifications');
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
};

export const markAsRead = async (notificationId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
  }
};

export const markAllAsRead = async (userId: string) => {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Error marking all as read:', error);
  }
};

export const createNotification = async (userId: string, title: string, message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      title,
      message,
      type
    });

  if (error) {
    console.error('Error creating notification:', error);
  }
};
