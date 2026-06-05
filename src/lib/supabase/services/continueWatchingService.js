import { supabase } from '../client';
import { handleSupabaseError } from '@/lib/supabase/errorHandler';

export const continueWatchingService = {
  async getContinueWatching(limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase.rpc('get_continue_watching', {
        p_limit: limit,
        p_offset: offset,
      });
      if (error) throw handleSupabaseError(error, { operation: 'getContinueWatching' });
      return { videos: data || [], totalCount: data?.[0]?.total_count || 0 };
    } catch (error) {
      console.error('Error getting continue watching:', error);
      return { videos: [], totalCount: 0 };
    }
  },

  async getRecentlyWatched(limit = 20, offset = 0, includeCompleted = false) {
    try {
      const { data, error } = await supabase.rpc('get_recently_watched', {
        p_limit: limit,
        p_offset: offset,
        p_include_completed: includeCompleted,
      });
      if (error) throw handleSupabaseError(error, { operation: 'getRecentlyWatched' });
      return { videos: data || [], totalCount: data?.[0]?.total_count || 0 };
    } catch (error) {
      console.error('Error getting recently watched:', error);
      return { videos: [], totalCount: 0 };
    }
  },

  async getStats() {
    try {
      const { data, error } = await supabase.rpc('get_continue_watching_stats');
      if (error) throw handleSupabaseError(error, { operation: 'getStats' });
      return data || {};
    } catch (error) {
      console.error('Error getting stats:', error);
      return {};
    }
  },

  async removeFromContinueWatching(videoId) {
    try {
      const { data, error } = await supabase.rpc('remove_from_continue_watching', {
        p_video_id: videoId,
      });
      if (error) throw handleSupabaseError(error, { operation: 'removeFromContinueWatching' });
      return data;
    } catch (error) {
      console.error('Error removing from continue watching:', error);
      throw error;
    }
  },
};

export default continueWatchingService;