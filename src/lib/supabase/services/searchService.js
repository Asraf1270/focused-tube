import { supabase } from '../client';
import { handleSupabaseError } from '@/lib/supabase/errorHandler';

/**
 * High-performance search service
 */
export const searchService = {
  /**
   * Full-text search with ranking
   */
  async searchVideos(query, options = {}) {
    const {
      status = null,
      category = null,
      isFavorite = null,
      limit = 20,
      offset = 0,
    } = options;

    if (!query?.trim()) {
      return { results: [], totalCount: 0 };
    }

    try {
      const { data, error } = await supabase
        .rpc('search_videos', {
          p_query: query.trim(),
          p_status: status,
          p_category: category,
          p_is_favorite: isFavorite,
          p_limit: limit,
          p_offset: offset,
        });

      if (error) {
        throw handleSupabaseError(error, { operation: 'searchVideos', query });
      }

      return {
        results: data || [],
        totalCount: data?.[0]?.total_count || 0,
      };
    } catch (error) {
      console.error('Search error:', error);
      // Fallback to basic search if full-text fails
      return this.basicSearch(query, options);
    }
  },

  /**
   * Basic search fallback
   */
  async basicSearch(query, options = {}) {
    const { limit = 20, offset = 0 } = options;

    try {
      let dbQuery = supabase
        .from('user_videos')
        .select(`
          video_id,
          video:videos!inner(
            id, youtube_id, title, channel_name, thumbnail_url, 
            duration_seconds, category, tags, published_at, view_count
          ),
          status, progress_seconds, is_favorite, is_bookmarked, is_liked
        `, { count: 'exact' })
        .or(`video.title.ilike.%${query}%,video.channel_name.ilike.%${query}%`)
        .range(offset, offset + limit - 1)
        .order('video(title)');

      const { data, error, count } = await dbQuery;

      if (error) throw error;

      return {
        results: data?.map(item => ({
          ...item.video,
          video_id: item.video_id,
          status: item.status,
          progress_seconds: item.progress_seconds,
          is_favorite: item.is_favorite,
          is_bookmarked: item.is_bookmarked,
          is_liked: item.is_liked,
        })) || [],
        totalCount: count || 0,
      };
    } catch (error) {
      console.error('Basic search error:', error);
      return { results: [], totalCount: 0 };
    }
  },

  /**
   * Quick search for autocomplete
   */
  async quickSearch(query, limit = 8) {
    if (!query?.trim() || query.trim().length < 2) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .rpc('quick_search', {
          p_query: query.trim(),
          p_limit: limit,
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Quick search error:', error);
      return [];
    }
  },

  /**
   * Get search suggestions
   */
  async getSuggestions(query, limit = 5) {
    if (!query?.trim() || query.trim().length < 2) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .rpc('get_search_suggestions', {
          p_query: query.trim(),
          p_limit: limit,
        });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  },
};

export default searchService;