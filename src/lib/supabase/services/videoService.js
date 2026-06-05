import { supabase } from '../client';

export const videoService = {
  // Add video to user's library
  async addVideo(videoData) {
    // First, upsert the video (shared data)
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .upsert({
        youtube_id: videoData.youtubeId,
        title: videoData.title,
        description: videoData.description,
        thumbnail_url: videoData.thumbnailUrl,
        duration_seconds: videoData.durationSeconds,
        channel_name: videoData.channelName,
        channel_id: videoData.channelId,
        published_at: videoData.publishedAt,
        category: videoData.category,
      }, {
        onConflict: 'youtube_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (videoError) throw videoError;

    // Then, create user-video relationship
    const { data: userVideo, error: userError } = await supabase
      .from('user_videos')
      .upsert({
        video_id: video.id,
        status: videoData.status || 'watch_later',
        tags: videoData.tags || [],
      }, {
        onConflict: 'user_id,video_id',
      })
      .select()
      .single();

    if (userError) throw userError;
    return { video, userVideo };
  },

  // Get user's videos with filters
  async getUserVideos({ status, category, search, limit = 20, offset = 0 } = {}) {
    let query = supabase
      .from('user_videos')
      .select(`
        *,
        video:videos(*)
      `)
      .order('last_watched_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (category) {
      query = query.eq('video.category', category);
    }

    if (search) {
      query = query.textSearch('video.title', search, {
        type: 'websearch',
      });
    }

    const { data, error, count } = await query;
    if (error) throw error;
    return { data, count };
  },

  // Update watch progress
  async updateProgress(videoId, progressSeconds, status = 'in_progress') {
    const { data, error } = await supabase
      .from('user_videos')
      .update({
        progress_seconds: progressSeconds,
        last_position_seconds: progressSeconds,
        status,
        last_watched_at: new Date().toISOString(),
      })
      .eq('video_id', videoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Toggle like/bookmark
  async toggleEngagement(videoId, type) {
    const { data: current } = await supabase
      .from('user_videos')
      .select(type === 'like' ? 'is_liked' : 'is_bookmarked')
      .eq('video_id', videoId)
      .single();

    const newValue = !current[type === 'like' ? 'is_liked' : 'is_bookmarked'];

    const { data, error } = await supabase
      .from('user_videos')
      .update({
        [type === 'like' ? 'is_liked' : 'is_bookmarked']: newValue,
      })
      .eq('video_id', videoId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get video details with user data
  async getVideoDetails(videoId) {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        user_videos(*),
        notes(*),
        video_categories(
          category:categories(*)
        )
      `)
      .eq('id', videoId)
      .single();

    if (error) throw error;
    return data;
  },
};