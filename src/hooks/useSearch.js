import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/lib/supabase/services/searchService';
import { useDebounce } from '@/hooks/useDebounce';

/**
 * High-performance search hook with debouncing and caching
 */
export function useSearch(options = {}) {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    cacheResults = true,
    limit = 20,
  } = options;

  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [filters, setFilters] = useState({
    status: null,
    category: null,
    isFavorite: null,
  });

  const debouncedQuery = useDebounce(query, debounceMs);
  const cacheRef = useRef(new Map());

  // Determine if search should execute
  const shouldSearch = debouncedQuery.trim().length >= minQueryLength;

  // Main search query
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: async () => {
      if (!shouldSearch) {
        return { results: [], totalCount: 0 };
      }

      setIsSearching(true);

      // Check cache
      const cacheKey = JSON.stringify({ query: debouncedQuery, filters });
      if (cacheResults && cacheRef.current.has(cacheKey)) {
        setIsSearching(false);
        return cacheRef.current.get(cacheKey);
      }

      try {
        const result = await searchService.searchVideos(debouncedQuery, {
          ...filters,
          limit,
        });

        // Cache result
        if (cacheResults) {
          cacheRef.current.set(cacheKey, result);
          // Limit cache size
          if (cacheRef.current.size > 50) {
            const firstKey = cacheRef.current.keys().next().value;
            cacheRef.current.delete(firstKey);
          }
        }

        return result;
      } finally {
        setIsSearching(false);
      }
    },
    enabled: shouldSearch,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // Quick search for autocomplete
  const {
    data: suggestions = [],
    isLoading: suggestionsLoading,
  } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    queryFn: () => searchService.quickSearch(debouncedQuery, 6),
    enabled: shouldSearch && debouncedQuery.length >= 2,
    staleTime: 30 * 1000,
  });

  // Clear cache on unmount
  useEffect(() => {
    return () => cacheRef.current.clear();
  }, []);

  const search = useCallback((searchQuery) => {
    setQuery(searchQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQuery('');
    cacheRef.current.clear();
  }, []);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ status: null, category: null, isFavorite: null });
  }, []);

  return {
    // State
    query,
    debouncedQuery,
    results: data?.results || [],
    totalCount: data?.totalCount || 0,
    suggestions,
    
    // Loading states
    isLoading,
    isSearching,
    suggestionsLoading,
    
    // Error
    error,
    
    // Filters
    filters,
    
    // Actions
    search,
    clearSearch,
    updateFilters,
    clearFilters,
    refetch,
    
    // Helpers
    hasQuery: query.trim().length > 0,
    hasResults: (data?.results?.length || 0) > 0,
    shouldSearch,
  };
}

export default useSearch;