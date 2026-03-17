import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Child, Subject } from '../types';
import { useChildren } from '../hooks/useChildren';
import { supabase } from '../services/supabase';
import { useStudent } from './StudentContext';
import { getStudentSession } from '../services/studentSession';
import { getChildSafeSelect } from '../services/databaseSchema';

interface SelectedChildContextType {
  selectedChild: Child | null;
  setSelectedChild: (child: Child | null) => void;
  loading: boolean;
}

const SelectedChildContext = createContext<SelectedChildContextType | undefined>(undefined);

export const SelectedChildProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { children: allChildren, loading: childrenLoading } = useChildren();
  const { student, loading: studentLoading } = useStudent();
  const [selectedChild, setSelectedChildState] = useState<Child | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hydratedChildren, setHydratedChildren] = useState<Child[]>([]);
  const [hydrationLoading, setHydrationLoading] = useState(false);

  const session = getStudentSession();
  const sessionSource = session?.childId ? 'code' : 'auth';

  useEffect(() => {
    if (sessionSource !== 'code') {
      setHydratedChildren([]);
      setHydrationLoading(false);
      return;
    }

    if (!student?.id || !student?.guardianId) {
      setHydrationLoading(true);
      return;
    }

    console.log('[SelectedChildContext] hydrating by guardianId', {
      studentId: student.id,
      guardianId: student.guardianId
    });

    let cancelled = false;
    const hydrateByGuardian = async () => {
      setHydrationLoading(true);
      const selectFields = getChildSafeSelect();

      try {
        const { data, error } = await supabase
          .from('children')
          .select(selectFields)
          .eq('guardian_id', student.guardianId);

        if (cancelled) return;
        if (error) throw error;

        const mappedChildren: Child[] = (data || []).map((child: any) => ({
          id: child.id,
          name: child.name,
          age: child.age || 0,
          grade: child.grade || '',
          avatar: child.avatar || '',
          accessCode: child.access_code || '',
          difficultySubjects: (child.difficulty_subjects as Subject[]) || [],
          xp: child.xp || 0,
          stars: child.stars || 0,
          streak: child.streak || 0,
          friendsEnabled: child.friends_enabled,
          friendsParentApprovalRequired: child.friends_parent_approval_required,
          socialInteractionsEnabled: child.social_interactions_enabled,
          gameEnabled: child.game_enabled,
          gameTimeLimit: child.game_time_limit,
          badges: [],
          guardianId: child.guardian_id
        }));

        setHydratedChildren(mappedChildren);

        const match = mappedChildren.find(c => c.id === student.id) || null;
        setSelectedChildState(match);
        if (match) {
          localStorage.setItem('educasense_selected_child_id', match.id);
        } else {
          localStorage.removeItem('educasense_selected_child_id');
        }

        console.log('[SelectedChildContext] hydrated', {
          count: mappedChildren.length,
          selectedChild: match?.id || null
        });
      } catch (err: any) {
        if (!cancelled) {
          console.error('[SelectedChildContext] hydration error', err);
          setHydratedChildren([]);
        }
      } finally {
        if (!cancelled) setHydrationLoading(false);
      }
    };

    hydrateByGuardian();

    return () => {
      cancelled = true;
    };
  }, [sessionSource, student?.id, student?.guardianId]);

  // Load from localStorage on mount
  // Fix: waitingForStudent should not block if student loading has finished and failed (student is null)
  const waitingForStudent = sessionSource === 'code' && studentLoading;
  
  const effectiveChildren = sessionSource === 'code' ? hydratedChildren : allChildren;
  const effectiveLoading = sessionSource === 'code' ? hydrationLoading || waitingForStudent : childrenLoading;

  useEffect(() => {
    if (effectiveLoading) {
      console.log('[SelectedChildContext] waiting for loading...', { hydrationLoading, waitingForStudent, childrenLoading });
      return;
    }

    if (sessionSource === 'code') {
      // If we are here, loading finished. 
      // If student is missing, we can't do anything - maybe session invalid.
      if (!student) {
         console.warn('[SelectedChildContext] sessionSource=code but no student found. Aborting hydration.');
         setIsInitialized(true);
         return;
      }

      console.log('[SelectedChildContext] children loaded', { count: effectiveChildren.length });
      const match = effectiveChildren.find(c => c.id === student?.id) || null;
      setSelectedChildState(match);
      if (match) {
        localStorage.setItem('educasense_selected_child_id', match.id);
      } else {
        localStorage.removeItem('educasense_selected_child_id');
      }
      console.log('[SelectedChildContext] selectedChild=' + (match?.id || 'null'));
      setIsInitialized(true);
      return;
    }

    console.log('[SelectedChildContext] children loaded', { count: effectiveChildren.length });

    const searchParams = new URLSearchParams(window.location.search);
    const urlChildId = searchParams.get('child');
    const savedChildId = localStorage.getItem('educasense_selected_child_id');

    if (urlChildId && effectiveChildren.length > 0) {
      const found = effectiveChildren.find(c => c.id === urlChildId);
      if (found) {
        setSelectedChildState(found);
        localStorage.setItem('educasense_selected_child_id', found.id);
      } else {
        if (savedChildId) {
          const saved = effectiveChildren.find(c => c.id === savedChildId);
          if (saved) setSelectedChildState(saved);
          else setSelectedChildState(effectiveChildren[0]);
        } else {
          setSelectedChildState(effectiveChildren[0]);
        }
      }
    } else if (savedChildId && effectiveChildren.length > 0) {
      const found = effectiveChildren.find(c => c.id === savedChildId);
      if (found) {
        setSelectedChildState(found);
      } else {
        localStorage.removeItem('educasense_selected_child_id');
        setSelectedChildState(effectiveChildren[0]);
      }
    } else if (effectiveChildren.length > 0 && !selectedChild) {
      setSelectedChildState(effectiveChildren[0]);
    } else if (effectiveChildren.length === 0) {
      setSelectedChildState(null);
    }

    const currentId = (selectedChild || effectiveChildren[0])?.id || 'null';
    console.log('[SelectedChildContext] selectedChild=' + currentId);
    setIsInitialized(true);
    console.log('[SelectedChildContext] initialized');
  }, [effectiveChildren, effectiveLoading, sessionSource, student?.id, student?.guardianId]);

  const setSelectedChild = (child: Child | null) => {
    setSelectedChildState(child);
    if (child) {
      localStorage.setItem('educasense_selected_child_id', child.id);
    } else {
      localStorage.removeItem('educasense_selected_child_id');
    }
  };

  return (
    <SelectedChildContext.Provider value={{ selectedChild, setSelectedChild, loading: effectiveLoading || !isInitialized }}>
      {children}
    </SelectedChildContext.Provider>
  );
};

export const useSelectedChild = () => {
  const context = useContext(SelectedChildContext);
  if (context === undefined) {
    throw new Error('useSelectedChild must be used within a SelectedChildProvider');
  }
  return context;
};
