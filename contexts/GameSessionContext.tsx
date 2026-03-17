import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { getStudentSession } from '../services/studentSession';

type SessionStatus = 'loading' | 'pending' | 'active' | 'expired' | 'blocked' | 'error';

interface GameSessionContextType {
  status: SessionStatus;
  timeLeft: number;
  duration: number;
  startSession: () => Promise<void>;
  checkSession: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const GameSessionContext = createContext<GameSessionContextType | undefined>(undefined);

export const useGameSession = () => {
  const context = useContext(GameSessionContext);
  if (!context) {
    throw new Error('useGameSession must be used within a GameSessionProvider');
  }
  return context;
};

export const GameSessionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<SessionStatus>('loading');
  const [timeLeft, setTimeLeft] = useState(0);
  const [duration, setDuration] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSession = useCallback(async () => {
    setIsLoading(true);
    setStatus('loading');
    setError(null);

    // 1. Get Session from LocalStorage (Simple & Fast)
    const session = getStudentSession();
    
    if (!session || !session.childId) {
      console.log('[GSC] No student session found locally');
      setStatus('blocked');
      setIsLoading(false);
      return;
    }

    const childId = session.childId;
    console.log('[GSC] Checking session for child:', childId);

    try {
      // 2. RPC Check
      const { data, error } = await supabase.rpc('rpc_get_game_session_status', {
        p_child_id: childId
      });

      if (error) throw error;

      if (!data.allowed) {
        setStatus('blocked');
        setError(data.reason || 'Acesso bloqueado');
        return;
      }

      const totalDuration = (data.duration_minutes || 20) * 60;
      setDuration(data.duration_minutes || 20);

      if (data.status === 'active') {
        const startedAt = new Date(data.started_at).getTime();
        const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
        const remaining = Math.max(0, totalDuration - elapsedSeconds);
        
        setTimeLeft(remaining);
        setStatus(remaining > 0 ? 'active' : 'expired');
      } else {
        setStatus('pending');
        setTimeLeft(totalDuration);
      }
    } catch (err) {
      console.error('[GSC] Error checking session:', err);
      setStatus('error');
      setError('Erro ao verificar sessão');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const startSession = async () => {
    const session = getStudentSession();
    if (!session || !session.childId) return;
    
    const childId = session.childId;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.rpc('rpc_consume_game_reward', {
        p_child_id: childId
      });

      if (error || (data && !data.success)) {
        throw error || new Error(data?.error || 'Erro ao iniciar');
      }

      await checkSession();
    } catch (err) {
      console.error('Error starting session:', err);
      await checkSession();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  // Timer Effect
  useEffect(() => {
    if (status !== 'active') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [status]);

  return (
    <GameSessionContext.Provider value={{
      status,
      timeLeft,
      duration,
      startSession,
      checkSession,
      isLoading,
      error
    }}>
      {children}
    </GameSessionContext.Provider>
  );
};
