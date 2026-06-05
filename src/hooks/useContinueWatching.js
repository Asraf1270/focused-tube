import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { continueWatchingService } from '@/lib/supabase/services/continueWatchingService';
import toast from 'react-hot-toast';

export function useContinueWatching() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['continue-watching'],
    queryFn: () => continueWatchingService.getContinueWatching(50),
    staleTime: 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ['continue-watching-stats'],
    queryFn: () => continueWatchingService.getStats(),
    staleTime: 5 * 60 * 1000,
  });

  const removeMutation = useMutation({
    mutationFn: (videoId) => continueWatchingService.removeFromContinueWatching(videoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
      queryClient.invalidateQueries({ queryKey: ['continue-watching-stats'] });
      toast.success('Removed from Continue Watching');
    },
    onError: () => toast.error('Failed to remove video'),
  });

  const removeVideo = useCallback((videoId) => {
    removeMutation.mutate(videoId);
  }, [removeMutation]);

  return {
    videos: data?.videos || [],
    totalCount: data?.totalCount || 0,
    stats,
    isLoading,
    error,
    removeVideo,
    refetch,
  };
}