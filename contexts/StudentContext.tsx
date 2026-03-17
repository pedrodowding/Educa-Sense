import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from './AuthContext';
import { Child, Subject } from '../types';
import { getStudentSession } from '../services/studentSession';
import { getChildSafeSelect, getChildBaseSelect } from '../services/databaseSchema';

interface StudentContextType {
  student: Child | null;
  loading: boolean;
  error: string | null;
  refreshStudent: () => Promise<void>;
}

const StudentContext = createContext<StudentContextType | undefined>(undefined);

export const StudentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [student, setStudent] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchStudentProfile = async () => {
    // If auth is loading, wait.
    if (authLoading) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);
    setStudent(null);

    try {
      let childData = null;
      const session = getStudentSession();
      const selectFields = getChildSafeSelect();

      if (session?.childId) {
        console.log(`[StudentContext] sessionSource=code childId=${session.childId}`);
        const { data, error } = await supabase
          .from('children')
          .select(selectFields)
          .eq('id', session.childId)
          .maybeSingle();
        if (requestId !== requestIdRef.current) return;
        if (error) throw error;
        childData = data;
      } else if (user) {
        const { data, error } = await supabase
          .from('children')
          .select(selectFields)
          .eq('user_id', user.id)
          .maybeSingle();
        if (requestId !== requestIdRef.current) return;
        if (error) throw error;
        childData = data;
        console.log(`[StudentContext] sessionSource=auth childId=${childData?.id || 'none'}`);
      } else {
        if (requestId !== requestIdRef.current) return;
        setStudent(null);
        return;
      }

      if (childData) {
        const mappedStudent: Child = {
          id: childData.id,
          name: childData.name,
          age: childData.age,
          grade: childData.grade,
          avatar: childData.avatar,
          accessCode: childData.access_code || '',
          difficultySubjects: (childData.difficulty_subjects as Subject[]) || [],
          xp: childData.xp || 0,
          stars: childData.stars || 0,
          streak: childData.streak || 0,
          badges: [],
          friendsEnabled: childData.friends_enabled,
          friendsParentApprovalRequired: childData.friends_parent_approval_required,
          socialInteractionsEnabled: childData.social_interactions_enabled,
          gameEnabled: childData.game_enabled ?? true,
          gameTimeLimit: childData.game_time_limit,
          guardianId: childData.guardian_id
        };
        const sessionSource = session?.childId ? 'code' : 'auth';
        console.log('[StudentContext] sessionSource=' + sessionSource + ' studentId=' + mappedStudent.id + ' guardianId=' + (mappedStudent.guardianId || 'null'));
        if (requestId === requestIdRef.current) {
          setStudent(mappedStudent);
        }
      } else {
        const childId = session?.childId || 'unknown';
        console.log(`[StudentContext] no student found for childId=${childId}`);
        if (requestId === requestIdRef.current) {
          setStudent(null);
        }
      }
    } catch (err: any) {
      const message = err?.message || '';
      const isSchemaMismatch = typeof message === 'string' && message.includes('does not exist') && message.includes('column');
      if (isSchemaMismatch) {
        console.error('[StudentContext] schema mismatch', { message });
        try {
          const session = getStudentSession();
          const basicFields = getChildBaseSelect();
          let basicData = null;

          if (session?.childId) {
            const { data, error } = await supabase
              .from('children')
              .select(basicFields)
              .eq('id', session.childId)
              .maybeSingle();
            if (requestId !== requestIdRef.current) return;
            if (error) throw error;
            basicData = data;
          } else if (user) {
            const { data, error } = await supabase
              .from('children')
              .select(basicFields)
              .eq('user_id', user.id)
              .maybeSingle();
            if (requestId !== requestIdRef.current) return;
            if (error) throw error;
            basicData = data;
          } else {
            if (requestId !== requestIdRef.current) return;
            setStudent(null);
            return;
          }

          if (basicData && requestId === requestIdRef.current) {
            const mappedStudent: Child = {
              id: basicData.id,
              name: basicData.name,
              age: 0,
              grade: '',
              avatar: '',
              accessCode: '',
              difficultySubjects: [],
              xp: 0,
              stars: 0,
              streak: 0,
              guardianId: basicData.guardian_id
            };
            const sessionSource = session?.childId ? 'code' : 'auth';
            console.log('[StudentContext] sessionSource=' + sessionSource + ' studentId=' + mappedStudent.id + ' guardianId=' + (mappedStudent.guardianId || 'null'));
            setStudent(mappedStudent);
          } else if (requestId === requestIdRef.current) {
            setStudent(null);
          }
        } catch (fallbackError) {
          console.error('[StudentContext] Error:', fallbackError);
          if (requestId === requestIdRef.current) {
            setError('Unknown error');
            setStudent(null);
          }
        }
      } else {
        console.error('[StudentContext] Error:', err);
        if (requestId === requestIdRef.current) {
          setError(err.message || 'Unknown error');
          setStudent(null);
        }
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // Re-run fetch if auth loads OR if we manually call refresh
  // We also listen to storage events to detect login from other tabs/windows
  useEffect(() => {
    fetchStudentProfile();
    
    const handleStorageChange = () => {
        fetchStudentProfile();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id, authLoading]);

  return (
    <StudentContext.Provider value={{ student, loading, error, refreshStudent: fetchStudentProfile }}>
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (context === undefined) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
