import { supabase } from '../client';

export const playlistService = {
  // Create playlist
  async createPlaylist({ name, description, isLearningPath = false, color, emoji }) {
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        name,
        description,
        is_learning_path: isLearningPath,
        color_hex: color || '#3EA6FF',
        emoji,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get all playlists
  async getPlaylists() {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_videos(count)
      `)
      .order('sort_order');

    if (error) throw error;
    return data;
  },

  // Get playlist with videos
  async getPlaylist(playlistId) {
    const { data, error } = await supabase
      .from('playlists')
      .select(`
        *,
        playlist_videos(
          position,
          added_at,
          video:videos(
            *,
            user_videos(status, progress_seconds, is_liked)
          )
        )
      `)
      .eq('id', playlistId)
      .order('position', { foreignTable: 'playlist_videos' })
      .single();

    if (error) throw error;
    return data;
  },

  // Add video to playlist
  async addToPlaylist(playlistId, videoId, position) {
    const { data, error } = await supabase
      .from('playlist_videos')
      .insert({
        playlist_id: playlistId,
        video_id: videoId,
        position: position || 999, // Add to end if no position
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Reorder playlist videos
  async reorderVideos(playlistId, videoIds) {
    const updates = videoIds.map((videoId, index) => ({
      playlist_id: playlistId,
      video_id: videoId,
      position: index,
    }));

    const { error } = await supabase
      .from('playlist_videos')
      .upsert(updates, {
        onConflict: 'playlist_id,video_id',
      });

    if (error) throw error;
  },

  // Delete playlist
  async deletePlaylist(playlistId) {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (error) throw error;
  },
};