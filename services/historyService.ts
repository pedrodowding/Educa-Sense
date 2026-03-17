import { supabase } from './supabase';

export type HistoryType = 'activity' | 'drawing' | 'creative_mission';

export interface HistoryEntry {
  type: HistoryType;
  program?: string;
  title?: string;
  summary?: string;
  score?: number;
  xp?: number;
  duration_sec?: number;
  status?: string;
  asset_url?: string;
  result_json?: any;
  child_id?: string;
}

// Helper to upload base64 image to Supabase Storage
export const uploadDrawingToStorage = async (base64Data: string, userId: string): Promise<string | null> => {
  try {
    // Convert base64 to Blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const fileName = `${userId}/${Date.now()}_drawing.png`;
    
    // Upload to 'drawings' bucket
    const { data, error } = await supabase.storage
      .from('drawings')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) {
      console.error('Error uploading drawing:', error);
      return null;
    }

    // Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('drawings')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (e) {
    console.error('Error processing image upload:', e);
    return null;
  }
};

const logEntry = async (entry: HistoryEntry) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { error } = await supabase
      .from('learning_history')
      .insert({
        user_id: session.user.id,
        child_id: entry.child_id, // Can be null
        type: entry.type,
        program: entry.program,
        title: entry.title,
        summary: entry.summary,
        score: entry.score,
        xp: entry.xp || 0,
        duration_sec: entry.duration_sec,
        status: entry.status || 'completed',
        asset_url: entry.asset_url,
        result_json: entry.result_json
      });

    if (error) {
      console.error('Error logging history entry:', error);
    }
  } catch (e) {
    console.error('Exception logging history entry:', e);
  }
};

export const historyService = {
  logActivity: async (data: Omit<HistoryEntry, 'type'>) => {
    return logEntry({ ...data, type: 'activity' });
  },

  logDrawing: async (data: Omit<HistoryEntry, 'type'>) => {
    return logEntry({ ...data, type: 'drawing' });
  },

  logCreativeMission: async (data: Omit<HistoryEntry, 'type'>) => {
    return logEntry({ ...data, type: 'creative_mission' });
  },
  
  uploadDrawing: uploadDrawingToStorage
};
