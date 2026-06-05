import { supabase } from '../client';

export const noteService = {
  // Create note
  async createNote({ videoId, content, type = 'general', timestampSeconds = null, importance = null }) {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        video_id: videoId,
        content,
        type,
        timestamp_seconds: timestampSeconds,
        importance_rating: importance,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Get notes for a video
  async getVideoNotes(videoId) {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('video_id', videoId)
      .order('timestamp_seconds', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Search notes
  async searchNotes(query) {
    const { data, error } = await supabase
      .rpc('search_user_notes', {
        search_query: query,
      });

    if (error) throw error;
    return data;
  },

  // Update note
  async updateNote(noteId, updates) {
    const { data, error } = await supabase
      .from('notes')
      .update(updates)
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete note
  async deleteNote(noteId) {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
  },
};