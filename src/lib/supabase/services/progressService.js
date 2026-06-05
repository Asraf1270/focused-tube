import { supabase } from '../client';
import { handleSupabaseError } from '@/lib/supabase/errorHandler';

/**
 * Progress Service
 * Handles watch progress tracking, saving, and resuming
 */
export const progressService = {
  /**
   * Update watch progress
   */
  async updateProgress(videoId, positionSeconds, options = {}) {
    const {
      durationSeconds,
      status = 'in_progress',
      createSnapshot = false,
    } = options;

    try {
      // Update progress in database
      const { data, error } = await supabase
        .rpc('update_watch_progress', {
          p_video_id: videoId,
          p_position_seconds: Math.floor(positionSeconds),
          p_duration_seconds: durationSeconds,
          p_status: status,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'updateProgress',
          videoId,
        });
      }

      // Create snapshot for analytics
      if (createSnapshot && durationSeconds) {
        await this.createSnapshot(videoId, positionSeconds, durationSeconds);
      }

      return data;
    } catch (error) {
      console.error('Error updating progress:', error);
      throw error;
    }
  },

  /**
   * Save playback state for exact resume
   */
  async savePlaybackState(videoId, state) {
    try {
      const { data, error } = await supabase
        .rpc('save_playback_state', {
          p_video_id: videoId,
          p_current_time_seconds: Math.floor(state.currentTime || 0),
          p_playback_rate: state.playbackRate || 1.0,
          p_volume: state.volume ?? 100,
          p_is_muted: state.isMuted || false,
          p_quality: state.quality || null,
          p_captions_enabled: state.captionsEnabled || false,
          p_caption_language: state.captionLanguage || 'en',
        });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving playback state:', error);
      // Don't throw - playback state is non-critical
      return null;
    }
  },

  /**
   * Get resume data for a video
   */
  async getResumeData(videoId) {
    try {
      const { data, error } = await supabase
        .rpc('get_resume_data', {
          p_video_id: videoId,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'getResumeData',
          videoId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting resume data:', error);
      return null;
    }
  },

  /**
   * Get watch progress for a specific video
   */
  async getVideoProgress(videoId) {
    try {
      const { data, error } = await supabase
        .from('watch_progress')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No progress yet
        }
        throw handleSupabaseError(error, {
          operation: 'getVideoProgress',
          videoId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting video progress:', error);
      return null;
    }
  },

  /**
   * Get all in-progress videos
   */
  async getInProgressVideos(limit = 20) {
    try {
      const { data, error } = await supabase
        .rpc('get_watch_history', {
          p_limit: limit,
          p_status: 'in_progress',
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'getInProgressVideos',
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting in-progress videos:', error);
      return [];
    }
  },

  /**
   * Get watch history
   */
  async getWatchHistory({ limit = 20, offset = 0, status = null } = {}) {
    try {
      const { data, error } = await supabase
        .rpc('get_watch_history', {
          p_limit: limit,
          p_offset: offset,
          p_status: status,
        });

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'getWatchHistory',
        });
      }

      return data;
    } catch (error) {
      console.error('Error getting watch history:', error);
      return [];
    }
  },

  /**
   * Create progress snapshot for analytics
   */
  async createSnapshot(videoId, positionSeconds, durationSeconds) {
    try {
      await supabase
        .rpc('create_progress_snapshot', {
          p_video_id: videoId,
          p_position_seconds: Math.floor(positionSeconds),
          p_duration_seconds: durationSeconds,
        });
    } catch (error) {
      // Snapshots are non-critical
      console.warn('Failed to create progress snapshot:', error);
    }
  },

  /**
   * Start a watch session
   */
  async startWatchSession(videoId, options = {}) {
    const {
      startPosition = 0,
      playbackSpeed = 1.0,
      playlistId = null,
      isFocusMode = false,
      deviceInfo = {},
    } = options;

    try {
      const { data, error } = await supabase
        .from('watch_sessions')
        .insert({
          video_id: videoId,
          start_position_seconds: Math.floor(startPosition),
          playback_speed: playbackSpeed,
          playlist_id: playlistId,
          is_focus_mode: isFocusMode,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            language: navigator.language,
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            ...deviceInfo,
          },
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error starting watch session:', error);
      return null;
    }
  },

  /**
   * End a watch session
   */
  async endWatchSession(sessionId, endPosition, videoDuration) {
    try {
      const completionPercentage = videoDuration > 0 
        ? (endPosition / videoDuration) * 100 
        : 0;

      const { data, error } = await supabase
        .from('watch_sessions')
        .update({
          end_time: new Date().toISOString(),
          end_position_seconds: Math.floor(endPosition),
          duration_seconds: Math.floor(
            (new Date() - new Date(this.sessionStartTime)) / 1000
          ),
          completion_percentage: Math.round(completionPercentage * 100) / 100,
          is_completed: completionPercentage >= 90,
          completed_at: completionPercentage >= 90 ? new Date().toISOString() : null,
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error ending watch session:', error);
      return null;
    }
  },

  /**
   * Mark video as completed
   */
  async markAsCompleted(videoId) {
    try {
      const { data, error } = await supabase
        .from('watch_progress')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('video_id', videoId)
        .select()
        .single();

      if (error) {
        throw handleSupabaseError(error, {
          operation: 'markAsCompleted',
          videoId,
        });
      }

      return data;
    } catch (error) {
      console.error('Error marking as completed:', error);
      throw error;
    }
  },
};

export default progressService;