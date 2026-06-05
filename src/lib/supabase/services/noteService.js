import { supabase } from '../client';
import { handleSupabaseError } from '@/lib/supabase/errorHandler';

export const noteService = {
  async createNote(data) {
    try {
      const { data: result, error } = await supabase.rpc('create_note', {
        p_video_id: data.videoId,
        p_content: data.content,
        p_type: data.type || 'general',
        p_format: data.format || 'plain',
        p_title: data.title || null,
        p_timestamp_seconds: data.timestampSeconds || null,
        p_end_timestamp_seconds: data.endTimestampSeconds || null,
        p_importance_rating: data.importance || null,
        p_tags: data.tags || [],
        p_color_hex: data.color || '#3EA6FF',
        p_playlist_id: data.playlistId || null,
      });
      if (error) throw handleSupabaseError(error, { operation: 'createNote' });
      return result;
    } catch (error) {
      console.error('Error creating note:', error);
      throw error;
    }
  },

  async updateNote(noteId, data) {
    try {
      const { data: result, error } = await supabase.rpc('update_note', {
        p_note_id: noteId,
        p_content: data.content,
        p_type: data.type,
        p_format: data.format,
        p_title: data.title,
        p_timestamp_seconds: data.timestampSeconds,
        p_end_timestamp_seconds: data.endTimestampSeconds,
        p_importance_rating: data.importance,
        p_comprehension_level: data.comprehension,
        p_tags: data.tags,
        p_color_hex: data.color,
        p_is_pinned: data.isPinned,
        p_change_description: data.changeDescription,
      });
      if (error) throw handleSupabaseError(error, { operation: 'updateNote', noteId });
      return result;
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  },

  async deleteNote(noteId) {
    try {
      const { data, error } = await supabase.rpc('delete_note', { p_note_id: noteId });
      if (error) throw handleSupabaseError(error, { operation: 'deleteNote', noteId });
      return data;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  },

  async getVideoNotes(videoId, type = null) {
    try {
      const { data, error } = await supabase.rpc('get_video_notes', {
        p_video_id: videoId,
        p_type: type,
      });
      if (error) throw handleSupabaseError(error, { operation: 'getVideoNotes', videoId });
      return data || [];
    } catch (error) {
      console.error('Error getting notes:', error);
      throw error;
    }
  },

  async searchNotes(query, options = {}) {
    try {
      const { data, error } = await supabase.rpc('search_notes', {
        p_query: query,
        p_video_id: options.videoId || null,
        p_type: options.type || null,
        p_tag: options.tag || null,
        p_limit: options.limit || 50,
        p_offset: options.offset || 0,
      });
      if (error) throw handleSupabaseError(error, { operation: 'searchNotes' });
      return { notes: data || [], totalCount: data?.[0]?.total_count || 0 };
    } catch (error) {
      console.error('Error searching notes:', error);
      throw error;
    }
  },

  async getNoteStatistics(videoId = null) {
    try {
      const { data, error } = await supabase.rpc('get_note_statistics', {
        p_video_id: videoId,
      });
      if (error) throw handleSupabaseError(error, { operation: 'getNoteStatistics' });
      return data;
    } catch (error) {
      console.error('Error getting note stats:', error);
      return null;
    }
  },

  async getNoteRevisions(noteId) {
    try {
      const { data, error } = await supabase
        .from('note_revisions')
        .select('*')
        .eq('note_id', noteId)
        .order('revision_number', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting revisions:', error);
      return [];
    }
  },
};

export default noteService;