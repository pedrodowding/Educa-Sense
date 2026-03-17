import { useState, useCallback } from 'react';
import { supabase } from '../services/supabase';

export interface SocialUpdate {
  id: string; // event_id (activity_completions.id)
  activity_type: string;
  completed_date: string;
  child_id: string;
  child_name: string;
  child_avatar: string;
  metadata: any;
  has_reacted: boolean;
}

export const useSocialInteractions = (childId: string) => {
  const [loading, setLoading] = useState(false);
  const [updates, setUpdates] = useState<SocialUpdate[]>([]);
  
  // Sprint 7.1: New State for Message Sending
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUpdates = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_friend_activities', { p_child_id: childId });
      if (error) throw error;
      setUpdates(data || []);
    } catch (err) {
      if (import.meta.env.DEV) {
         console.error('Error fetching social updates:', err);
      }
      setUpdates([]); // Fallback to empty feed
    } finally {
      setLoading(false);
    }
  }, [childId]);

  const sendReaction = async (toChildId: string, eventId: string, reactionType: string) => {
    try {
      const { data, error } = await supabase.rpc('rpc_send_reaction', {
        p_from_child_id: childId,
        p_to_child_id: toChildId,
        p_event_id: eventId,
        p_reaction_type: reactionType
      });
      if (error) throw error;
      if (data.success) {
        // Optimistic update
        setUpdates(prev => prev.map(u => 
          u.id === eventId ? { ...u, has_reacted: true } : u
        ));
        return true;
      } else {
        console.warn('Reaction failed:', data.error);
        return false;
      }
    } catch (err) {
      console.error('Error sending reaction:', err);
      return false;
    }
  };

  // Sprint 7.1: Corrected sendMessage function
  const sendQuickMessage = async (toChildId: string, messageId: string) => {
    if (isSending) return;
    
    // Guard clause to prevent 400 Bad Request
    if (!childId || !toChildId) {
        console.error('[sendQuickMessage] Missing IDs:', { childId, toChildId });
        return false;
    }

    setIsSending(true);
    setError(null);
    
    try {
      // Passo 1: Diagnóstico obrigatório
      console.log('[sendQuickMessage] Calling rpc_send_predefined_message', {
        p_from_child_id: childId,
        p_to_child_id: toChildId,
        p_message_id: messageId
      });

      const { data, error } = await supabase.rpc('rpc_send_predefined_message', {
        p_from_child_id: childId,
        p_to_child_id: toChildId,
        p_message_id: messageId
      });

      if (error) {
        console.error('[sendQuickMessage] RPC Error Detail:', error);
        throw error;
      }

      if (data.success) {
        setIsSending(false);
        return true;
      } else {
        const errCode = data.error;
        let userMsg = 'Não foi possível enviar agora';
        
        if (errCode === 'DAILY_LIMIT_REACHED') userMsg = 'Você já enviou muitas mensagens hoje! Tente amanhã.';
        else if (errCode === 'SOCIAL_DISABLED_SENDER') userMsg = 'Suas interações estão desligadas.';
        else if (errCode === 'SOCIAL_DISABLED_RECEIVER') userMsg = 'O amigo não pode receber mensagens agora.';
        else if (errCode === 'NOT_FRIENDS') userMsg = 'Vocês não são amigos.';

        setError(userMsg);
        setIsSending(false);
        return false;
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Sprint 7.3: Frontend Hardening - Fail Gracefully
      setError('Não foi possível conectar. Tente novamente em instantes.');
      setIsSending(false);
      return false;
    }
  };

  const sendChallenge = async (toChildId: string, challengeType: string) => {
    try {
      const { data, error } = await supabase.rpc('rpc_create_challenge', {
        p_from_child_id: childId,
        p_to_child_id: toChildId,
        p_challenge_type: challengeType
      });
      if (error) throw error;
      if (data.success) {
        return true;
      } else {
        if (data.error === 'ALREADY_PENDING') return 'ALREADY_PENDING';
        return false;
      }
    } catch (err) {
      console.error('Error sending challenge:', err);
      return false;
    }
  };

  return {
    loading,
    updates,
    fetchUpdates,
    sendReaction,
    sendMessage: sendQuickMessage, // Alias for backward compatibility if needed, but UI should use new props
    sendQuickMessage,
    sendChallenge,
    isSending,
    error
  };
};
