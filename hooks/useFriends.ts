import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { FriendRequest, Friendship } from '../types';

export function useMyFriendCode(childId: string) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!childId) return;

    const fetchCode = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('rpc_get_my_friend_code', {
          p_child_id: childId
        });

        if (error) throw error;
        setCode(data as string);
      } catch (err: any) {
        console.error('Error fetching friend code:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCode();
  }, [childId]);

  return { code, loading, error };
}

export function useFriends(childId: string) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFriends = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_get_my_friends', {
        p_child_id: childId
      });

      if (error) throw error;
      
      // Mapear retorno da RPC para interface Friendship
      // Se data já vier no formato correto (do novo RPC JSONB), o map ainda funciona se as chaves baterem.
      // O novo RPC retorna { friendship_id, friend_id, friend_name... }
      const mapped: Friendship[] = (data || []).map((item: any) => ({
        id: item.friendship_id || item.id, // Fallback para compatibilidade
        friend_id: item.friend_id,
        friend_name: item.friend_name,
        friend_avatar: item.friend_avatar,
        friend_xp: item.friend_xp
      }));

      console.log(`[Friends] Fetched ${mapped.length} friends`);
      setFriends(mapped);
    } catch (err: any) {
      console.error('[Friends] Error fetching friends:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  return { friends, loading, error, refresh: fetchFriends };
}

export function useFriendRequests(childId: string) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Buscar requests recebidos e enviados (pending)
  const fetchRequests = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    console.log('Buscando convites para childId:', childId);
    try {
      const { data, error } = await supabase.rpc('rpc_get_friend_requests', {
        p_child_id: childId
      });

      console.log('Resultado rpc_get_friend_requests:', { data, error });

      if (error) throw error;
      
      const requests = data as FriendRequest[];
      console.log(`[FriendRequests] Fetched ${requests.length} requests`, requests);
      setRequests(requests);
    } catch (err) {
      console.error('[FriendRequests] Error fetching requests:', err);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Ações
  const sendRequest = async (friendCode: string) => {
    try {
      const { data, error } = await supabase.rpc('rpc_send_friend_request_by_code', {
        p_from_child_id: childId,
        p_friend_code: friendCode
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);
      
      await fetchRequests();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const respondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const { data, error } = await supabase.rpc('rpc_respond_friend_request', {
        p_child_id: childId,
        p_request_id: requestId,
        p_action: action
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      await fetchRequests();
      return { success: true, hasNewSocialEvent: data.has_new_social_event };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('rpc_cancel_friend_request', {
        p_child_id: childId,
        p_request_id: requestId
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      await fetchRequests();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const blockUser = async (blockedChildId: string, reason?: string) => {
    try {
      const { data, error } = await supabase.rpc('rpc_block_child', {
        p_child_id: childId,
        p_blocked_child_id: blockedChildId,
        p_reason: reason
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      await fetchRequests(); // Refresh requests as they might be cancelled
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { requests, loading, refresh: fetchRequests, sendRequest, respondRequest, cancelRequest, blockUser };
}

export function useFriendProfile(myChildId: string, friendId: string) {
  const [profile, setProfile] = useState<any>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc('rpc_get_friend_profile', {
          p_my_child_id: myChildId,
          p_friend_child_id: friendId
        });

        if (error) throw error;
        if (data && !data.success) throw new Error(data.error);

        setProfile(data.profile);
        setBadges(data.badges);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (myChildId && friendId) {
      fetchProfile();
    }
  }, [myChildId, friendId]);

  return { profile, badges, loading, error };
}

export function useParentPendingFriendRequests(childId: string) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rpc_parent_list_pending_friend_requests', {
        p_child_id: childId
      });

      if (error) throw error;
      setRequests(data as FriendRequest[]);
    } catch (err) {
      console.error('[ParentPendingRequests] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const respondRequest = async (requestId: string, action: 'accept' | 'reject') => {
    try {
      const { data, error } = await supabase.rpc('rpc_parent_respond_friend_request', {
        p_request_id: requestId,
        p_action: action
      });

      if (error) throw error;
      if (data && !data.success) throw new Error(data.error);

      await fetchRequests();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return { requests, loading, refresh: fetchRequests, respondRequest };
}
