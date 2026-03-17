import { supabase } from './supabase';

export interface AlbumItem {
  id: string;
  name: string;
  rarity: 'common' | 'rare' | 'epic';
  image_url: string;
  theme?: string;
}

export interface ChildAlbumItem extends AlbumItem {
  level: number;
  earned_count: number;
  first_earned_at: string;
  last_earned_at: string;
}

export interface ClaimRewardResult {
  ok: boolean;
  item: AlbumItem;
  level: number;
  is_new: boolean;
  already_claimed?: boolean;
  error?: string;
}

export const claimDailyAlbumReward = async (childId: string): Promise<ClaimRewardResult | null> => {
  const today = new Date().toISOString().split('T')[0];
  
  try {
    const { data, error } = await supabase.rpc('claim_daily_album_reward', {
      p_child_id: childId,
      p_date: today
    });

    if (error) throw error;
    return data as ClaimRewardResult;
  } catch (err) {
    console.error('Error claiming daily reward:', err);
    return null;
  }
};

export const fetchChildAlbum = async (childId: string): Promise<ChildAlbumItem[]> => {
  try {
    const { data, error } = await supabase
      .from('child_album')
      .select(`
        level,
        earned_count,
        first_earned_at,
        last_earned_at,
        album_items (
          id,
          name,
          rarity,
          image_url,
          theme
        )
      `)
      .eq('child_id', childId);

    if (error) throw error;

    return data.map((row: any) => ({
      ...row.album_items,
      level: row.level,
      earned_count: row.earned_count,
      first_earned_at: row.first_earned_at,
      last_earned_at: row.last_earned_at
    }));
  } catch (err) {
    console.error('Error fetching child album:', err);
    return [];
  }
};

export const checkDailyRewardStatus = async (childId: string): Promise<boolean> => {
  const today = new Date().toISOString().split('T')[0];
  const { data } = await supabase
    .from('daily_rewards')
    .select('id')
    .eq('child_id', childId)
    .eq('date', today)
    .eq('reward_type', 'album')
    .maybeSingle();
    
  return !!data;
};
