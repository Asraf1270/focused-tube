import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookmarkService } from '@/lib/supabase/services/bookmarkService';
import toast from 'react-hot-toast';

export function useBookmarks(videoId) {
  const queryClient = useQueryClient();
  const lastAddedRef = useRef(null);

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks', videoId],
    queryFn: () => bookmarkService.getVideoBookmarks(videoId),
    enabled: !!videoId,
    staleTime: 30 * 1000,
  });

  const addBookmarkMutation = useMutation({
    mutationFn: (data) => bookmarkService.createBookmark({ ...data, videoId }),
    onSuccess: (data) => {
      lastAddedRef.current = data.id;
      queryClient.invalidateQueries({ queryKey: ['bookmarks', videoId] });
      toast.success('Bookmark added! 🔖');
    },
    onError: (error) => {
      if (error.message?.includes('duplicate')) {
        toast.error('Bookmark already exists at this timestamp');
      } else {
        toast.error('Failed to add bookmark');
      }
    },
  });

  const quickBookmarkMutation = useMutation({
    mutationFn: (timestampSeconds) => bookmarkService.quickBookmark(videoId, timestampSeconds),
    onSuccess: (data) => {
      lastAddedRef.current = data.id;
      queryClient.invalidateQueries({ queryKey: ['bookmarks', videoId] });
      toast.success('Bookmarked! ⚡', { duration: 1500 });
    },
    onError: () => {
      // Silently fail for quick bookmark (might be duplicate)
    },
  });

  const deleteBookmarkMutation = useMutation({
    mutationFn: (bookmarkId) => bookmarkService.deleteBookmark(bookmarkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookmarks', videoId] });
      toast.success('Bookmark removed');
    },
    onError: () => toast.error('Failed to remove bookmark'),
  });

  const addBookmark = useCallback(async (data) => {
    return addBookmarkMutation.mutateAsync(data);
  }, [addBookmarkMutation]);

  const quickBookmark = useCallback(async (timestampSeconds) => {
    return quickBookmarkMutation.mutateAsync(timestampSeconds);
  }, [quickBookmarkMutation]);

  const deleteBookmark = useCallback(async (bookmarkId) => {
    return deleteBookmarkMutation.mutateAsync(bookmarkId);
  }, [deleteBookmarkMutation]);

  // Check if a timestamp has a bookmark
  const hasBookmarkAt = useCallback((timestampSeconds) => {
    const tolerance = 2; // 2 second tolerance
    return bookmarks.some(b => 
      Math.abs(b.timestamp_seconds - Math.floor(timestampSeconds)) <= tolerance
    );
  }, [bookmarks]);

  // Get bookmark at specific timestamp
  const getBookmarkAt = useCallback((timestampSeconds) => {
    const tolerance = 2;
    return bookmarks.find(b => 
      Math.abs(b.timestamp_seconds - Math.floor(timestampSeconds)) <= tolerance
    );
  }, [bookmarks]);

  return {
    bookmarks,
    isLoading,
    addBookmark,
    quickBookmark,
    deleteBookmark,
    hasBookmarkAt,
    getBookmarkAt,
    lastAddedId: lastAddedRef.current,
    isAdding: addBookmarkMutation.isPending,
  };
}