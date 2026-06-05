import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';

export function useBookmarks(videoId) {
  const [bookmarks, setBookmarks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchBookmarks = useCallback(async () => {
    if (!videoId) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('video_id', videoId)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  const addBookmark = useCallback(async (bookmarkData) => {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .insert({
          video_id: videoId,
          ...bookmarkData,
        })
        .select()
        .single();

      if (error) throw error;
      setBookmarks(prev => [...prev, data].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds));
    } catch (error) {
      console.error('Error adding bookmark:', error);
      throw error;
    }
  }, [videoId]);

  const deleteBookmark = useCallback(async (bookmarkId) => {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', bookmarkId);

      if (error) throw error;
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      throw error;
    }
  }, []);

  return {
    bookmarks,
    isLoading,
    addBookmark,
    deleteBookmark,
    refetch: fetchBookmarks,
  };
}