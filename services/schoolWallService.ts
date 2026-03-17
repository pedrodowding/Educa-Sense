
import { supabase } from './supabase';
import { SchoolBulletinPost, BulletinLog, BulletinPostType } from '../types';

export const schoolWallService = {
  // Posts
  async getPosts(schoolId: string, classId?: string) {
    let query = supabase
      .from('school_bulletin_posts')
      .select(`
        *,
        author:author_user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('school_id', schoolId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (classId) {
      // Se tiver classId, busca posts dessa classe OU globais (class_id is null)
      query = query.or(`class_id.eq.${classId},class_id.is.null`);
    } else {
      // Se não tiver classId (ex: visão geral da escola), mostra tudo ou só globais?
      // Normalmente mostra globais. Para ver de uma classe específica, o usuário filtra.
      // Vamos assumir que sem classId busca tudo da escola por enquanto.
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SchoolBulletinPost[];
  },

  async createPost(post: Omit<SchoolBulletinPost, 'id' | 'created_at' | 'author'>) {
    const { data, error } = await supabase
      .from('school_bulletin_posts')
      .insert(post)
      .select()
      .single();

    if (error) throw error;

    // Log action
    await this.logAction({
      school_id: post.school_id,
      post_id: data.id,
      user_id: post.author_user_id,
      action: 'create',
      details: { title: post.title, type: post.type }
    });

    return data;
  },

  async deletePost(postId: string, schoolId: string, userId: string) {
    const { error } = await supabase
      .from('school_bulletin_posts')
      .delete()
      .eq('id', postId);

    if (error) throw error;

    // Log action
    await this.logAction({
      school_id: schoolId,
      post_id: postId,
      user_id: userId,
      action: 'delete',
      details: { postId }
    });
  },

  async togglePin(postId: string, isPinned: boolean, schoolId: string, userId: string) {
    const { error } = await supabase
      .from('school_bulletin_posts')
      .update({ pinned: isPinned })
      .eq('id', postId);

    if (error) throw error;

    // Log action
    await this.logAction({
      school_id: schoolId,
      post_id: postId,
      user_id: userId,
      action: isPinned ? 'pin' : 'unpin',
      details: { pinned: isPinned }
    });
  },

  // Logs
  async getLogs(schoolId: string) {
    const { data, error } = await supabase
      .from('school_bulletin_logs')
      .select(`
        *,
        user:user_id (
          email
        )
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data as BulletinLog[];
  },

  async logAction(log: Omit<BulletinLog, 'id' | 'created_at'>) {
    const { error } = await supabase
      .from('school_bulletin_logs')
      .insert(log);
    
    if (error) console.error('Error logging action:', error);
  }
};
