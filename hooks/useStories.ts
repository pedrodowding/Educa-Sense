import { useState, useEffect, useCallback } from 'react';
import { storyService, Story } from '../services/storyService';

export const useStories = (childId?: string) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const data = await storyService.getStories(childId);
      setStories(data);
    } catch (err: any) {
      console.error('Error fetching stories:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [childId]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  return { stories, loading, error, refresh: fetchStories };
};
