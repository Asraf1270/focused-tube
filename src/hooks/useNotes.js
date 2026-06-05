import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noteService } from '@/lib/supabase/services/noteService';
import toast from 'react-hot-toast';

export function useNotes(videoId) {
  const queryClient = useQueryClient();
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const { data: notes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['notes', videoId],
    queryFn: () => noteService.getVideoNotes(videoId),
    enabled: !!videoId,
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => noteService.createNote({ ...data, videoId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', videoId] });
      queryClient.invalidateQueries({ queryKey: ['note-stats', videoId] });
      toast.success('Note added! 📝');
    },
    onError: (error) => toast.error(error.message || 'Failed to add note'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }) => noteService.updateNote(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', videoId] });
      setEditingNoteId(null);
      toast.success('Note updated!');
    },
    onError: (error) => toast.error(error.message || 'Failed to update note'),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId) => noteService.deleteNote(noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes', videoId] });
      queryClient.invalidateQueries({ queryKey: ['note-stats', videoId] });
      toast.success('Note deleted');
    },
    onError: (error) => toast.error(error.message || 'Failed to delete note'),
  });

  const addNote = useCallback(async (data) => {
    return createMutation.mutateAsync(data);
  }, [createMutation]);

  const updateNote = useCallback(async (noteId, data) => {
    return updateMutation.mutateAsync({ id: noteId, ...data });
  }, [updateMutation]);

  const deleteNote = useCallback(async (noteId) => {
    return deleteMutation.mutateAsync(noteId);
  }, [deleteMutation]);

  const startEditing = useCallback((noteId) => setEditingNoteId(noteId), []);
  const stopEditing = useCallback(() => setEditingNoteId(null), []);

  const filteredNotes = activeTab === 'all' ? notes : notes.filter(n => n.type === activeTab);
  const pinnedNotes = filteredNotes.filter(n => n.is_pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.is_pinned);

  return {
    notes: filteredNotes,
    pinnedNotes,
    unpinnedNotes,
    isLoading,
    error,
    editingNoteId,
    activeTab,
    setActiveTab,
    addNote,
    updateNote,
    deleteNote,
    startEditing,
    stopEditing,
    refetch,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}