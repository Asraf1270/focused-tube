import { supabase } from '../client';
import { handleSupabaseError } from '@/lib/supabase/errorHandler';

export const bookmarkService = {
  async createBookmark(data) {
    try {
      const { data: result, error } = await supabase.rpc('create_bookmark', {
        p_video_id: data.videoId,
        p_timestamp_seconds: data.timestampSeconds,
        p_label: data.label || null,
        p_description: data.description || null,
        p_color_hex: data.color || '#FFD700',
        p_icon: data.icon || '🔖',
        p_category: data.category || null,
        p_tags: data.tags || [],
        p_snapshot_url: data.snapshotUrl || null,
      });
      if (error) throw handleSupabaseError(error, { operation: 'createBookmark' });
      return result;
    } catch (error) {
      console.error('Error creating bookmark:', error);
      throw error;
    }
  },

  async quickBookmark(videoId, timestampSeconds) {
    try {
      const { data, error } = await supabase.rpc('quick_bookmark', {
        p_video_id: videoId,
        p_timestamp_seconds: Math.floor(timestampSeconds),
      });
      if (error) throw handleSupabaseError(error, { operation: 'quickBookmark' });
      return data;
    } catch (error) {
      console.error('Error quick bookmarking:', error);
      throw error;
    }
  },

  async deleteBookmark(bookmarkId) {
    try {
      const { data, error } = await supabase.rpc('delete_bookmark', { p_bookmark_id: bookmarkId });
      if (error) throw handleSupabaseError(error, { operation: 'deleteBookmark' });
      return data;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      throw error;
    }
  },

  async getVideoBookmarks(videoId, category = null) {
    try {
      const { data, error } = await supabase.rpc('get_video_bookmarks', {
        p_video_id: videoId,
        p_category: category,
      });
      if (error) throw handleSupabaseError(error, { operation: 'getVideoBookmarks' });
      return data || [];
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  },

  async getAllBookmarks({ limit = 50, offset = 0, category = null, search = null } = {}) {
    try {
      const { data, error } = await supabase.rpc('get_all_bookmarks', {
        p_limit: limit,
        p_offset: offset,
        p_category: category,
        p_search: search,
      });
      if (error) throw handleSupabaseError(error, { operation: 'getAllBookmarks' });
      return { bookmarks: data || [], totalCount: data?.[0]?.total_count || 0 };
    } catch (error) {
      console.error('Error getting all bookmarks:', error);
      return { bookmarks: [], totalCount: 0 };
    }
  },
};

export default bookmarkService;