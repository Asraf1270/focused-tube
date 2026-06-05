import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { videoService } from '@/lib/supabase/services/videoService';
import toast from 'react-hot-toast';

export function useVideoActions() {
  const queryClient = useQueryClient();

  const toggleBookmark = useCallback(async (videoId) => {
    try {
      await videoService.toggleEngagement(videoId, 'bookmark');
      queryClient.invalidateQueries({ queryKey: ['videos'] });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      toast.error('Failed to update bookmark');
    }
  }, [queryClient]);

  const updateStatus = useCallback(async (videoId, status) => {
    try {
      await videoService.updateVideoStatus(videoId, status);
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success(`Video marked as ${status.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  }, [queryClient]);

  return {
    toggleBookmark,
    updateStatus,
  };
}