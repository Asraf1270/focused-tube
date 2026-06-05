import { supabase } from '../client';
import { handleSupabaseError } from '@/lib/supabase/errorHandler';

/**
 * Favorites Service
 */
export const favoriteService = {
  /**
   * Toggle favorite status for a video
   */
  async toggleFavorite(videoId) {
    try {
      const { data, error } = await supabase
        .rpc('toggle_favorite', {
          p_video_id: videoId,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'toggleFavorite',
          videoId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      throw error;
    }
  },

  /**
   * Check if video is favorited
   */
  async isFavorited(videoId) {
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('video_id', videoId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking favorite status:', error);
      return false;
    }
  },

  /**
   * Get favorites with full video details
   */
  async getFavorites({
    limit = 50,
    offset = 0,
    sortBy = 'recent',
    categoryId = null,
    searchQuery = null,
  } = {}) {
    try {
      const { data, error } = await supabase
        .rpc('get_favorites', {
          p_limit: limit,
          p_offset: offset,
          p_sort_by: sortBy,
          p_category_id: categoryId,
          p_search_query: searchQuery,
        });

      if (error) {
        throw handleSupabaseError(error, { operation: 'getFavorites' });
      }

      return {
        favorites: data || [],
        totalCount: data?.[0]?.total_count || 0,
      };
    } catch (error) {
      console.error('Error getting favorites:', error);
      throw error;
    }
  },

  /**
   * Bulk add to favorites
   */
  async bulkAddFavorites(videoIds) {
    try {
      const { data, error } = await supabase
        .rpc('bulk_add_favorites', {
          p_video_ids: videoIds,
        });

      if (error) {
        throw handleSupabaseError(error, { operation: 'bulkAddFavorites' });
      }

      return data;
    } catch (error) {
      console.error('Error bulk adding favorites:', error);
      throw error;
    }
  },

  /**
   * Get favorite statistics
   */
  async getFavoriteStats() {
    try {
      const { data, error } = await supabase
        .rpc('get_favorite_stats');

      if (error) {
        throw handleSupabaseError(error, { operation: 'getFavoriteStats' });
      }

      return data;
    } catch (error) {
      console.error('Error getting favorite stats:', error);
      return {
        total: 0,
        this_week: 0,
        this_month: 0,
        by_category: {},
      };
    }
  },

  /**
   * Remove from favorites (alternative to toggle)
   */
  async removeFavorite(videoId) {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('video_id', videoId);

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'removeFavorite',
          videoId,
        });
      }

      // Update user_videos
      await supabase
        .from('user_videos')
        .update({ is_favorite: false })
        .eq('video_id', videoId);

      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      throw error;
    }
  },
};

export default favoriteService;