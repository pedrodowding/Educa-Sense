
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Guardian } from '../types';
import { endUserSession, startUserSession } from '../services/sessions';
import { RoleManager } from '../services/roleManager';
import { setUserTier } from '../billing/entitlements';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Guardian | null;
  loading: boolean;
  updateProfile: (updates: Partial<Guardian>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

import { retryOperation } from '../services/retry';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Guardian | null>(null);
  const [loading, setLoading] = useState(true);

  const normalizeRole = (value?: string | null): Guardian['role'] => {
    const normalized = (value || '').toLowerCase();
    if (normalized === 'teacher' || normalized === 'director' || normalized === 'admin') {
      return normalized as Guardian['role'];
    }
    return 'guardian';
  };

  useEffect(() => {
    // Check active session
    let mounted = true;
    
    const initSession = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (!mounted) return;

            if (error) {
                console.error('[Auth] Error getting session:', error);
                if (error.message && (error.message.includes('Refresh Token') || error.message.includes('Invalid session'))) {
                    console.warn('[Auth] Invalid session detected. Clearing storage...');
                    await signOut();
                } else {
                    setLoading(false);
                }
                return;
            }
            
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                await fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error('[Auth] Init session failed:', err);
            if (mounted) setLoading(false);
        }
    };

    initSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[Auth] Event: ${event}`);
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
         setProfile(null);
         setSession(null);
         setUser(null);
         setLoading(false);
         return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Global error handler for auth issues
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && typeof reason === 'object' && 'message' in reason) {
          const msg = (reason as any).message || '';
          if (typeof msg === 'string' && (msg.includes('Refresh Token') || msg.includes('Invalid session'))) {
              console.warn('[Auth] Caught unhandled auth error. Forcing sign out.');
              // Avoid calling signOut directly in event handler if possible, or debounce it
              // signOut(); 
          }
      }
    };
    
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Listen for Role Changes (Local Override)
  useEffect(() => {
    const handleRoleChange = () => {
      const stored = RoleManager.getStoredRole();
      if (profile && stored && stored !== profile.role) {
        console.log("AuthContext: Switching role to", stored);
        setProfile({ ...profile, role: stored });
      } else if (profile && !stored) {
        // If role cleared, re-fetch to get original DB role
        if (user) fetchProfile(user.id);
      }
    };
    window.addEventListener('role-change', handleRoleChange);
    return () => window.removeEventListener('role-change', handleRoleChange);
  }, [profile, user]);

  useEffect(() => {
    if (!user?.id) return;
    startUserSession();

    const handleBeforeUnload = () => {
      endUserSession();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      endUserSession();
    };
  }, [user?.id]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await retryOperation(async () => {
        return await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
      }, 3, 1000, 2, 'fetchProfile');

      if (error) {
        console.error('Error fetching profile:', error);
        await setFallbackProfile();
      } else if (data) {
        const storedRole = RoleManager.getStoredRole();
        
        // Normalize plan: 'pro', 'Pro', 'premium' -> 'Premium' (PRO tier)
        const rawPlan = (data.plan || '').toLowerCase();
        const isPro = rawPlan === 'pro' || rawPlan === 'premium' || rawPlan === 'active';
        
        // Sync with local storage entitlements system
        setUserTier(isPro ? 'PRO' : 'FREE');
        console.log(`[Auth] Profile loaded. Plan: ${data.plan} -> Normalized: ${isPro ? 'Premium' : 'Free'}`);

        setProfile({
          id: data.id,
          name: data.name,
          email: data.email,
          role: normalizeRole(storedRole || data.role),
          avatar: data.avatar,
          plan: isPro ? 'Premium' : 'Free'
        });
      }
    } catch (error) {
      console.error('Error:', error);
      // Ensure profile is set even on critical failure to prevent redirect loops
      await setFallbackProfile();
    } finally {
      setLoading(false);
    }
  };

  const setFallbackProfile = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
           const storedRole = RoleManager.getStoredRole();
           // Default to Free on error/fallback
           setUserTier('FREE');

           setProfile({
            id: user.id,
            name: user.user_metadata.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: normalizeRole(storedRole || user.user_metadata.role),
            avatar: user.user_metadata.avatar || '',
            plan: 'Free'
          });
          console.warn('[Auth] Using fallback profile due to fetch error');
        }
    } catch (e) {
        console.error('[Auth] Failed to set fallback profile:', e);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const signOut = async () => {
    try {
      await endUserSession();
    } catch (e) {
      console.error('[Auth] Error ending user session:', e);
    }

    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error('[Auth] Error signing out from Supabase:', e);
    }

    // Force clear all local storage to ensure clean slate
    localStorage.clear();
    
    setProfile(null);
    setSession(null);
    setUser(null);
    
    // Force reload to clear any memory state
    window.location.href = '/';
  };

  const updateProfile = async (updates: Partial<Guardian>) => {
    if (!user) return;
    setLoading(true);
    try {
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;
      if (updates.plan !== undefined) dbUpdates.plan = updates.plan;
      if (updates.role !== undefined) dbUpdates.role = updates.role;
      if (updates.email !== undefined) dbUpdates.email = updates.email;

      if (updates.email && updates.email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email: updates.email });
        if (error) throw error;
      }

      if (Object.keys(dbUpdates).length > 0) {
        const { data, error } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', user.id)
          .select('*')
          .single();

        if (error) throw error;

        setProfile({
          id: data.id,
          name: data.name,
          email: data.email,
          role: normalizeRole(data.role),
          avatar: data.avatar,
          plan: data.plan as 'Free' | 'Premium'
        });
      } else if (profile) {
        setProfile({ ...profile, ...updates });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, loading, updateProfile, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
