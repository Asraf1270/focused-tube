import { useState, useEffect, useCallback, useRef } from 'react';
import { videoService } from '@/lib/supabase/services/videoService';
import { useAuth } from '@/hooks/useAuth';

export function useVideos({ search, category, sortBy, limit = 24 } = {}) {
  const { user } = useAuth();
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const cacheRef = useRef(new Map());

  const fetchVideos = useCallback(async (pageNum = 0) => {
    if (!user) return;

    const cacheKey = JSON.stringify({ search, category, sortBy, page: pageNum });
    
    // Check cache
    if (pageNum === 0 && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey);
      setVideos(cached.data);
      setHasMore(cached.hasMore);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const offset = pageNum * limit;
      let status;

      // Map category to status filter
      if (['in_progress', 'completed', 'watch_later'].includes(category)) {
        status = category;
      }

      const { data, count } = await videoService.getUserVideos({
        search,
        status,
        category: !status ? category : undefined,
        limit,
        offset,
        orderBy: getOrderBy(sortBy),
      });

      const newVideos = pageNum === 0 ? data : [...videos, ...data];
      setVideos(newVideos);
      setHasMore(count > offset + limit);
      
      // Cache first page results
      if (pageNum === 0) {
        cacheRef.current.set(cacheKey, { data: newVideos, hasMore: count > limit });
      }
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [user, search, category, sortBy, limit]);

  // Reset and fetch on filter change
  useEffect(() => {
    setPage(0);
    setVideos([]);
    fetchVideos(0);
  }, [search, category, sortBy, fetchVideos]);

  const loadMore = useCallback(() => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage);
  }, [page, fetchVideos]);

  const refetch = useCallback(() => {
    setPage(0);
    cacheRef.current.clear();
    fetchVideos(0);
  }, [fetchVideos]);

  return {
    videos,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

function getOrderBy(sortBy) {
  switch (sortBy) {
    case 'last_watched':
      return 'last_watched_at';
    case 'title':
      return 'video(title)';
    case 'duration':
      return 'video(duration_seconds)';
    case 'recent':
    default:
      return 'created_at';
  }
}