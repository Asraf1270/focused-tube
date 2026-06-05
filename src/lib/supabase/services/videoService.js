import { supabase } from '../client';
import { handleSupabaseError, DatabaseError } from '@/lib/supabase/errorHandler';

/**
 * Video Service
 * Handles all video-related database operations
 */
export const videoService = {
  /**
   * Add video to database and user's library
   */
  async addVideo(videoData, options = {}) {
    const {
      status = 'watch_later',
      personalTags = [],
    } = options;

    try {
      // Use the database function for atomic operation
      const { data, error } = await supabase
        .rpc('add_video_to_library', {
          p_youtube_id: videoData.id || videoData.youtubeId,
          p_title: videoData.title,
          p_description: videoData.description || '',
          p_thumbnail_url: videoData.thumbnails?.high?.url || 
                          videoData.thumbnails?.medium?.url ||
                          videoData.thumbnailUrl || null,
          p_duration_seconds: videoData.duration || videoData.durationSeconds || null,
          p_channel_name: videoData.channelTitle || videoData.channelName || 'Unknown Channel',
          p_channel_id: videoData.channelId || '',
          p_channel_thumbnail_url: videoData.channelThumbnail || null,
          p_published_at: videoData.publishedAt || null,
          p_view_count: videoData.viewCount || 0,
          p_like_count: videoData.likeCount || 0,
          p_category: videoData.categoryId || videoData.category || null,
          p_tags: videoData.tags || [],
          p_language: videoData.language || 'en',
          p_is_short: videoData.isShort || false,
          p_has_captions: videoData.hasCaptions || false,
          p_status: status,
          p_personal_tags: personalTags,
          p_metadata: videoData.metadata || {},
        });

      if (error) {
        throw handleSupabaseError(error, { 
          operation: 'addVideo',
          videoId: videoData.id,
        });
      }

      return data;
    } catch (error) {
      console.error('Error adding video:', error);
      throw error;
    }
  },

  /**
   * Get video by YouTube ID
   */
  async getVideoByYoutubeId(youtubeId) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .eq('youtube_id', youtubeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw handleSupabaseError(error, { 
          operation: 'getVideoByYoutubeId',
          youtubeId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting video:', error);
      throw error;
    }
  },

  /**
   * Get user's videos with full details
   */
  async getUserVideos({ 
    status, 
    category, 
    search, 
    limit = 20, 
    offset = 0,
    orderBy = 'last_watched_at',
    ascending = false,
  } = {}) {
    try {
      let query = supabase
        .from('user_videos')
        .select(`
          *,
          video:videos(*)
        `, { count: 'exact' })
        .range(offset, offset + limit - 1);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }

      if (orderBy) {
        query = query.order(orderBy, { ascending });
      }

      // Filter by category through videos table
      if (category) {
        query = query.eq('video.category', category);
      }

      // Full-text search on video title
      if (search) {
        query = query.textSearch('video.title', search, {
          type: 'websearch',
          config: 'english',
        });
      }

      const { data, error, count } = await query;

      if (error) {
        throw handleSupabaseError(error, { 
          operation: 'getUserVideos',
        });
      }

      return { data, count };
    } catch (error) {
      console.error('Error getting user videos:', error);
      throw error;
    }
  },

  /**
   * Check if video exists in user's library
   */
  async isVideoInLibrary(youtubeId) {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          id,
          user_videos!inner(user_id)
        `)
        .eq('youtube_id', youtubeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return false;
        }
        throw error;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking video in library:', error);
      return false;
    }
  },

  /**
   * Update video status
   */
  async updateVideoStatus(videoId, status) {
    try {
      const { data, error } = await supabase
        .from('user_videos')
        .update({ 
          status,
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        })
        .eq('video_id', videoId)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error, { 
          operation: 'updateVideoStatus',
          videoId,
          status,
        });
      }

      return data;
    } catch (error) {
      console.error('Error updating video status:', error);
      throw error;
    }
  },

  /**
   * Delete video from user's library
   */
  async removeVideo(videoId) {
    try {
      const { error } = await supabase
        .from('user_videos')
        .delete()
        .eq('video_id', videoId);

      if (error) {
        throw handleSupabaseError(error, { 
          operation: 'removeVideo',
          videoId,
        });
      }

      return true;
    } catch (error) {
      console.error('Error removing video:', error);
      throw error;
    }
  },

  /**
   * Get video statistics
   */
  async getVideoStats() {
    try {
      const { data, error } = await supabase
        .from('user_videos')
        .select('status, count', { count: 'exact' })
        .order('status');

      if (error) throw error;

      const stats = {
        total: 0,
        watchLater: 0,
        inProgress: 0,
        completed: 0,
        dropped: 0,
      };

      data?.forEach(item => {
        stats.total += item.count;
        switch (item.status) {
          case 'watch_later':
            stats.watchLater = item.count;
            break;
          case 'in_progress':
            stats.inProgress = item.count;
            break;
          case 'completed':
            stats.completed = item.count;
            break;
          case 'dropped':
            stats.dropped = item.count;
            break;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting video stats:', error);
      throw error;
    }
  },

  /**
   * Bulk add videos to library
   */
  async bulkAddVideos(videos, status = 'watch_later') {
    try {
      const results = [];
      const errors = [];

      for (const video of videos) {
        try {
          const result = await this.addVideo(video, { status });
          results.push(result);
        } catch (error) {
          errors.push({
            videoId: video.id,
            error: error.message,
          });
        }
      }

      return {
        success: results,
        errors,
        totalProcessed: videos.length,
        successCount: results.length,
        errorCount: errors.length,
      };
    } catch (error) {
      console.error('Error bulk adding videos:', error);
      throw error;
    }
  },
};

export default videoService;