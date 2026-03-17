import { supabase } from './supabase';

export interface Story {
  id: string;
  child_id: string;
  title: string;
  content: string;
  cover_image?: string;
  theme?: string;
  metadata?: any;
  created_at: string;
}

export const storyService = {
  async getStories(childId: string): Promise<Story[]> {
    const { data, error } = await supabase
      .from('child_stories')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getStoryById(storyId: string): Promise<Story | null> {
    const { data, error } = await supabase
      .from('child_stories')
      .select('*')
      .eq('id', storyId)
      .single();

    if (error) throw error;
    return data;
  },

  async saveStory(story: Omit<Story, 'id' | 'created_at'>): Promise<Story> {
    const { data, error } = await supabase
      .from('child_stories')
      .insert(story)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteStory(storyId: string): Promise<void> {
    const { error } = await supabase
      .from('child_stories')
      .delete()
      .eq('id', storyId);

    if (error) throw error;
  }
};
