import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '../services/supabase';
import { Child, Subject } from '../types';
import { useStudent } from './StudentContext';
import { getChildSafeSelect } from '../services/databaseSchema';

interface FamilyChildrenContextType {
  familyChildren: Child[];
  loading: boolean;
  error: string | null;
  refreshFamilyChildren: () => Promise<void>;
}

const FamilyChildrenContext = createContext<FamilyChildrenContextType | undefined>(undefined);

export const FamilyChildrenProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { student } = useStudent();
  const [familyChildren, setFamilyChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchFamilyChildren = async () => {
    const requestId = ++requestIdRef.current;
    const guardianId = student?.guardianId;

    if (!guardianId) {
      setFamilyChildren([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    console.log(`[FamilyChildren] fetching by guardianId=${guardianId}`);

    try {
      const { data, error: fetchError } = await supabase
        .from('children')
        .select(getChildSafeSelect())
        .eq('guardian_id', guardianId);

      if (requestId !== requestIdRef.current) return;
      if (fetchError) throw fetchError;

      const mappedChildren: Child[] = (data || []).map((child: any) => ({
        id: child.id,
        name: child.name,
        age: child.age,
        grade: child.grade,
        avatar: child.avatar,
        accessCode: child.access_code,
        difficultySubjects: (child.difficulty_subjects as Subject[]) || [],
        xp: child.xp,
        stars: child.stars,
        streak: child.streak,
        friendsEnabled: child.friends_enabled,
        friendsParentApprovalRequired: child.friends_parent_approval_required,
        socialInteractionsEnabled: child.social_interactions_enabled,
        gameEnabled: child.game_enabled,
        gameTimeLimit: child.game_time_limit,
        storyEnabled: child.story_enabled,
        drawingEnabled: child.drawing_enabled,
        badges: [],
        guardianId: child.guardian_id
      }));

      console.log(`[FamilyChildren] loaded count=${mappedChildren.length}`);
      if (requestId === requestIdRef.current) {
        setFamilyChildren(mappedChildren);
      }
    } catch (err: any) {
      if (requestId === requestIdRef.current) {
        setError(err.message || 'Unknown error');
        setFamilyChildren([]);
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchFamilyChildren();
  }, [student?.guardianId]);

  return (
    <FamilyChildrenContext.Provider value={{ familyChildren, loading, error, refreshFamilyChildren: fetchFamilyChildren }}>
      {children}
    </FamilyChildrenContext.Provider>
  );
};

export const useFamilyChildren = () => {
  const context = useContext(FamilyChildrenContext);
  if (context === undefined) {
    throw new Error('useFamilyChildren must be used within a FamilyChildrenProvider');
  }
  return context;
};
