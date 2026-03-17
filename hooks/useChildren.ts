
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Child, Subject } from '../types';
import { logAuditEvent } from '../services/audit';
import { getChildSafeSelect } from '../services/databaseSchema';

export const useChildren = () => {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChildren = async () => {
    // If auth is loading, we can't determine user yet, so keep loading true
    if (authLoading) return;

    // Caso A: Usuário logado via Auth (Responsável)
    if (user) {
        try {
            const { data, error } = await supabase
              .from('children')
              .select(getChildSafeSelect())
              .eq('guardian_id', user.id);
      
            if (error) throw error;
      
            const mappedChildren: Child[] = data.map((c: any) => ({
              id: c.id,
              name: c.name,
              age: c.age,
              grade: c.grade,
              avatar: c.avatar,
              accessCode: c.access_code,
              difficultySubjects: c.difficulty_subjects as Subject[] || [],
              xp: c.xp,
              stars: c.stars,
              streak: c.streak,
              friendsEnabled: c.friends_enabled,
              friendsParentApprovalRequired: c.friends_parent_approval_required,
              socialInteractionsEnabled: c.social_interactions_enabled,
              // Sprint 8B & 9
              gameEnabled: c.game_enabled,
              gameTimeLimit: c.game_time_limit,
              storyEnabled: c.story_enabled,
              drawingEnabled: c.drawing_enabled,
              badges: [], // TODO: Implementar badges no banco
              guardianId: c.guardian_id
            }));
      
            setChildren(mappedChildren);
          } catch (error) {
            console.error('Error fetching children:', error);
          } finally {
            setLoading(false);
          }
          return;
    }

    // Caso B: Nem Auth
    setChildren([]);
    setLoading(false);
  };

  // Re-fetch when user changes OR when auth finishes loading
  useEffect(() => {
    // Reset loading to true when user changes to ensure we don't show stale data
    if (user) setLoading(true);
    fetchChildren();
  }, [user?.id, authLoading]);

  const addChild = async (child: Omit<Child, 'id' | 'xp' | 'stars' | 'streak'>) => {
    if (!user) return null;
    try {
      const newChild = {
        name: child.name,
        age: child.age,
        grade: child.grade,
        avatar: child.avatar,
        access_code: child.accessCode,
        difficulty_subjects: child.difficultySubjects,
      };

      const { data, error } = await supabase.functions.invoke('create-student', {
        body: newChild
      });

      if (error) {
        // Tenta fazer o parse do erro se for uma string JSON
        try {
            const parsed = JSON.parse(error.message);
            throw parsed;
        } catch (e) {
            // Se não for JSON, lança o erro original ou um objeto com a mensagem
            if (error instanceof Error) throw error;
            throw new Error(error.message || "Erro desconhecido ao criar estudante");
        }
      }

      const createdChild: Child = {
        id: data.id,
        name: data.name,
        age: data.age,
        grade: data.grade,
        avatar: data.avatar,
        accessCode: data.access_code,
        difficultySubjects: data.difficulty_subjects || [],
        xp: data.xp || 0,
        stars: data.stars || 0,
        streak: data.streak || 0,
        friendsEnabled: data.friends_enabled,
        friendsParentApprovalRequired: data.friends_parent_approval_required,
        socialInteractionsEnabled: true // Default
      };

      setChildren(prev => [...prev, createdChild]);
      logAuditEvent({
        action: 'child_created',
        entityType: 'child',
        entityId: createdChild.id,
        metadata: {
          grade: createdChild.grade,
          age: createdChild.age
        }
      });
      return createdChild;
    } catch (error: any) {
      console.error('Error adding child:', error);
      throw error;
    }
  };

  const revokeAccess = async (childId: string) => {
    try {
      const newCode = `ACC-${Math.floor(1000 + Math.random() * 9000)}`;
      const { error } = await supabase
        .from('children')
        .update({ access_code: newCode })
        .eq('id', childId);

      if (error) throw error;

      setChildren(prev => prev.map(c => 
        c.id === childId ? { ...c, accessCode: newCode } : c
      ));

      logAuditEvent({
        action: 'child_access_revoked',
        entityType: 'child',
        entityId: childId
      });
      
      // Sync Auth Password (Fire and forget)
      // Call student-auth to ensure the Auth User password matches the new access code
      supabase.functions.invoke('student-auth', {
        body: { accessCode: newCode }
      }).then(({ error }) => {
        if (error) console.warn('[useChildren] Password sync warning:', error);
        else console.log('[useChildren] Password synced for new code');
      });

      return newCode;
    } catch (error) {
      console.error('Error revoking access:', error);
      return null;
    }
  };

  const updateChild = async (id: string, updates: Partial<Child>) => {
    try {
      const dbUpdates: any = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.age) dbUpdates.age = updates.age;
      if (updates.grade) dbUpdates.grade = updates.grade;
      if (updates.avatar) dbUpdates.avatar = updates.avatar;
      if (updates.accessCode) dbUpdates.access_code = updates.accessCode;
      if (updates.difficultySubjects) dbUpdates.difficulty_subjects = updates.difficultySubjects;
      if (updates.xp !== undefined) dbUpdates.xp = updates.xp;
      if (updates.stars !== undefined) dbUpdates.stars = updates.stars;
      if (updates.streak !== undefined) dbUpdates.streak = updates.streak;
      if (updates.gameEnabled !== undefined) {
        const { error } = await supabase.rpc('rpc_toggle_reward', { 
          p_child_id: id, 
          p_reward_type: 'game', 
          p_enabled: updates.gameEnabled 
        });
        if (error) throw error;
      }
      if (updates.gameTimeLimit !== undefined) dbUpdates.game_time_limit = updates.gameTimeLimit;
      
      if (updates.storyEnabled !== undefined) {
        const { error } = await supabase.rpc('rpc_toggle_reward', { 
          p_child_id: id, 
          p_reward_type: 'story', 
          p_enabled: updates.storyEnabled 
        });
        if (error) throw error;
      }
      
      if (updates.drawingEnabled !== undefined) {
        const { error } = await supabase.rpc('rpc_toggle_reward', { 
          p_child_id: id, 
          p_reward_type: 'drawing', 
          p_enabled: updates.drawingEnabled 
        });
        if (error) throw error;
      }

      const hasFriendsUpdates = updates.friendsEnabled !== undefined || updates.friendsParentApprovalRequired !== undefined;
      if (hasFriendsUpdates) {
        const currentChild = children.find(c => c.id === id);
        const nextEnabled = updates.friendsEnabled ?? currentChild?.friendsEnabled ?? true;
        const nextRequireApproval = updates.friendsParentApprovalRequired ?? currentChild?.friendsParentApprovalRequired ?? false;

        const { error: friendsError } = await supabase.rpc('rpc_parent_update_friends_settings', {
          p_child_id: id,
          p_enabled: nextEnabled,
          p_require_approval: nextRequireApproval
        });

        if (friendsError) throw friendsError;
      }

      if (updates.socialInteractionsEnabled !== undefined) {
        const { error: toggleError } = await supabase.rpc('rpc_toggle_social_interactions', {
          p_child_id: id,
          p_enabled: updates.socialInteractionsEnabled
        });
        if (toggleError) throw toggleError;
      }

      if (Object.keys(dbUpdates).length > 0) {
        const { error } = await supabase
          .from('children')
          .update(dbUpdates)
          .eq('id', id);

        if (error) throw error;
      }

      setChildren(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
      logAuditEvent({
        action: 'child_updated',
        entityType: 'child',
        entityId: id,
        metadata: {
          updates: Object.keys({
            ...dbUpdates,
            ...(hasFriendsUpdates ? { friends_enabled: true } : {}),
            ...(hasFriendsUpdates ? { friends_parent_approval_required: true } : {})
          })
        }
      });
    } catch (error) {
      console.error('Error updating child:', error);
    }
  };

  return { 
    children, 
    updateChild, 
    addChild, 
    revokeAccess,
    loading 
  };
};
