import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '@/hooks/useSearch';
import { useCategories } from '@/hooks/useCategories';
import SearchBar from '@/components/SearchBar/SearchBar';
import VideoCard from '@/components/VideoCard/VideoCard';
import VideoCardSkeleton from '@/components/VideoCard/VideoCardSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Search() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  
  useDocumentTitle(initialQuery ? `Search: ${initialQuery} - FocusedTube` : 'Search - FocusedTube');
  
  const {
    query,
    results,
    totalCount,
    isLoading,
    isSearching,
    error,
    filters,
    hasResults,
    shouldSearch,
    search,
    updateFilters,
    clearFilters,
  } = useSearch({ debounceMs: 300 });

  const { categories } = useCategories();
  
  const [sortBy, setSortBy] = useState('relevance');
  const [viewMode, setViewMode] = useState('grid');

  // Initialize search from URL
  useEffect(() => {
    if (initialQuery) {
      search(initialQuery);
    }
  }, [initialQuery]);

  // Update URL when query changes
  const handleSearch = useCallback((newQuery) => {
    search(newQuery);
    setSearchParams(newQuery ? { q: newQuery } : {});
  }, [search, setSearchParams]);

  // Sort results
  const sortedResults = useMemo(() => {
    if (!results.length) return [];
    
    const sorted = [...results];
    
    switch (sortBy) {
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'channel':
        sorted.sort((a, b) => a.channel_name.localeCompare(b.channel_name));
        break;
      case 'date':
        sorted.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
        break;
      case 'duration':
        sorted.sort((a, b) => (a.duration_seconds || 0) - (b.duration_seconds || 0));
        break;
      case 'relevance':
      default:
        // Already sorted by relevance from API
        break;
    }
    
    return sorted;
  }, [results, sortBy]);

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-display-md font-bold text-text-primary mb-4">
            Search
          </h1>
          
          {/* Search Bar */}
          <SearchBar
            value={query}
            onChange={handleSearch}
            onSearch={handleSearch}
            autoFocus={!initialQuery}
            size="lg"
            className="max-w-2xl"
          />
        </div>

        {/* Results Info & Filters */}
        {shouldSearch && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              {/* Results Count */}
              <div className="flex items-center gap-3">
                {isSearching ? (
                  <span className="text-body-sm text-text-tertiary">Searching...</span>
                ) : (
                  <span className="text-body-sm text-text-secondary">
                    {totalCount} result{totalCount !== 1 ? 's' : ''} 
                    {query && ` for "${query}"`}
                  </span>
                )}
              </div>

              {/* Sort & View Options */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-surface-raised border border-border-subtle rounded-lg
                           text-body-sm text-text-secondary focus:outline-none focus:border-accent-blue"
                >
                  <option value="relevance">Relevance</option>
                  <option value="title">Title</option>
                  <option value="channel">Channel</option>
                  <option value="date">Date</option>
                  <option value="duration">Duration</option>
                </select>

                <div className="flex bg-surface-raised rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-surface-hover' : ''}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-surface-hover' : ''}`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2">
              {/* Status Filters */}
              {['in_progress', 'completed', 'watch_later'].map((status) => (
                <button
                  key={status}
                  onClick={() => updateFilters({ 
                    status: filters.status === status ? null : status 
                  })}
                  className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors
                    ${filters.status === status 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-surface-raised text-text-secondary hover:bg-surface-hover'
                    }`}
                >
                  {status === 'in_progress' ? '▶️ In Progress' : 
                   status === 'completed' ? '✅ Completed' : '🕐 Watch Later'}
                </button>
              ))}

              {/* Favorite Filter */}
              <button
                onClick={() => updateFilters({ 
                  isFavorite: filters.isFavorite ? null : true 
                })}
                className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors
                  ${filters.isFavorite 
                    ? 'bg-yellow-400/20 text-yellow-400' 
                    : 'bg-surface-raised text-text-secondary hover:bg-surface-hover'
                  }`}
              >
                ⭐ Favorites
              </button>

              {/* Category Filter */}
              {categories.slice(0, 5).map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => updateFilters({ 
                    category: filters.category === cat.name ? null : cat.name 
                  })}
                  className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors
                    ${filters.category === cat.name 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-surface-raised text-text-secondary hover:bg-surface-hover'
                    }`}
                >
                  {cat.emoji} {cat.name}
                </button>
              ))}

              {/* Clear Filters */}
              {(filters.status || filters.category || filters.isFavorite) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 rounded-full text-caption text-error 
                           hover:bg-error/10 transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <VideoCardSkeleton key={i} variant={viewMode === 'list' ? 'horizontal' : 'default'} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
            title="Search failed"
            message="There was an error performing your search. Please try again."
          />
        ) : !shouldSearch ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title="Search your library"
            description="Search by video title, channel name, or category to find exactly what you're looking for."
          />
        ) : !hasResults ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            title="No results found"
            description={`We couldn't find any videos matching "${query}". Try a different search term or clear your filters.`}
            action={
              <Button onClick={clearFilters} variant="secondary">
                Clear Filters
              </Button>
            }
          />
        ) : (
          <motion.div
            layout
            className={`grid gap-4 ${
              viewMode === 'grid' 
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                : 'grid-cols-1'
            }`}
          >
            <AnimatePresence mode="popLayout">
              {sortedResults.map((video, index) => (
                <motion.div
                  key={video.video_id || video.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <VideoCard
                    thumbnail={video.thumbnail_url}
                    title={video.title}
                    channel={video.channel_name}
                    duration={video.duration_seconds}
                    youtubeId={video.youtube_id}
                    viewCount={video.view_count}
                    publishedAt={video.published_at}
                    progress={video.progress_seconds}
                    status={video.status}
                    isBookmarked={video.is_bookmarked}
                    isLiked={video.is_liked}
                    isFavorite={video.is_favorite}
                    variant={viewMode === 'list' ? 'horizontal' : 'default'}
                    to={`/watch/${video.youtube_id || video.id}`}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}