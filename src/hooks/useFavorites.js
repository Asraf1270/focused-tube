import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { favoriteService } from '@/lib/supabase/services/favoriteService';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Custom hook for favorites management
 */
export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Toggle favorite mutation
  const toggleMutation = useMutation({
    mutationFn: favoriteService.toggleFavorite,
    onMutate: async (videoId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['favorites'] });
      
      // Snapshot previous value
      const previousFavorites = queryClient.getQueryData(['favorites']);
      
      // Optimistically update
      queryClient.setQueryData(['favorites'], (old) => {
        if (!old?.pages) return old;
        
        return {
          ...old,
          pages: old.pages.map(page => ({
            ...page,
            favorites: page.favorites.map(fav => 
              fav.video_id === videoId 
                ? { ...fav, is_favorited: !fav.is_favorited }
                : fav
            ),
          })),
        };
      });
      
      return { previousFavorites };
    },
    onSuccess: (data) => {
      if (data.favorited) {
        toast.success('Added to favorites! ⭐', { icon: '❤️' });
      } else {
        toast.success('Removed from favorites');
      }
      
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-stats'] });
    },
    onError: (error, videoId, context) => {
      // Rollback on error
      queryClient.setQueryData(['favorites'], context.previousFavorites);
      toast.error(error.message || 'Failed to update favorite');
    },
  });

  // Get favorites with infinite scroll
  const useFavoritesQuery = (filters = {}) => {
    return useInfiniteQuery({
      queryKey: ['favorites', filters],
      queryFn: ({ pageParam = 0 }) => 
        favoriteService.getFavorites({
          ...filters,
          offset: pageParam * (filters.limit || 20),
          limit: filters.limit || 20,
        }),
      getNextPageParam: (lastPage, allPages) => {
        const totalFetched = allPages.reduce((sum, page) => 
          sum + page.favorites.length, 0
        );
        return totalFetched < lastPage.totalCount 
          ? allPages.length 
          : undefined;
      },
      initialPageParam: 0,
      enabled: !!user,
    });
  };

  // Get favorite stats
  const useFavoriteStats = () => {
    return useQuery({
      queryKey: ['favorite-stats'],
      queryFn: favoriteService.getFavoriteStats,
      enabled: !!user,
      staleTime: 5 * 60 * 1000,
    });
  };

  // Toggle favorite
  const toggleFavorite = useCallback(async (videoId) => {
    return toggleMutation.mutateAsync(videoId);
  }, [toggleMutation]);

  // Check if favorited
  const isFavorited = useCallback(async (videoId) => {
    return favoriteService.isFavorited(videoId);
  }, []);

  // Bulk add favorites
  const bulkAddFavorites = useCallback(async (videoIds) => {
    try {
      const result = await favoriteService.bulkAddFavorites(videoIds);
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['favorite-stats'] });
      
      if (result.added > 0) {
        toast.success(`${result.added} videos added to favorites!`);
      }
      
      return result;
    } catch (error) {
      toast.error('Failed to add favorites');
      throw error;
    }
  }, [queryClient]);

  return {
    toggleFavorite,
    isFavorited,
    bulkAddFavorites,
    useFavoritesQuery,
    useFavoriteStats,
    isToggling: toggleMutation.isPending,
  };
}

export default useFavorites;