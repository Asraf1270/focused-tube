import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideos } from '@/hooks/useVideos';
import SearchBar from '@/components/SearchBar/SearchBar';
import CategoryFilters from '@/components/CategoryFilters/CategoryFilters';
import VideoGrid from '@/components/VideoGrid/VideoGrid';
import VideoCard from '@/components/VideoCard/VideoCard';
import VideoCardSkeleton from '@/components/VideoCard/VideoCardSkeleton';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Home() {
  useDocumentTitle('FocusedTube - Your Learning Space');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  const {
    videos,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  } = useVideos({
    search: searchQuery,
    category: selectedCategory !== 'all' ? selectedCategory : undefined,
    sortBy,
  });

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
  }, []);

  const handleCategoryChange = useCallback((category) => {
    setSelectedCategory(category);
  }, []);

  const handleSortChange = useCallback((sort) => {
    setSortBy(sort);
  }, []);

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-[1920px] mx-auto">
        {/* Header Section */}
        <div className="sticky top-0 z-30 bg-surface-base/95 backdrop-blur-xl border-b border-border-subtle">
          <div className="px-4 py-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              {/* Search Bar */}
              <div className="flex-1 max-w-2xl">
                <SearchBar
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search your learning library..."
                />
              </div>

              {/* Sort Options */}
              <div className="flex items-center gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortChange(e.target.value)}
                  className="px-3 py-2 bg-surface-raised border border-border-subtle rounded-lg
                           text-body-sm text-text-secondary focus:outline-none focus:border-accent-blue
                           cursor-pointer hover:border-border-default transition-colors"
                >
                  <option value="recent">Recently Added</option>
                  <option value="last_watched">Last Watched</option>
                  <option value="title">Alphabetical</option>
                  <option value="duration">Duration</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Filters */}
          <div className="px-4 pb-3">
            <CategoryFilters
              selected={selectedCategory}
              onChange={handleCategoryChange}
            />
          </div>
        </div>

        {/* Content Area */}
        <div className="px-4 py-6">
          {/* Error State */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-error/10 border border-error/20 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-error flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-body-sm text-error">
                  {error.message || 'Failed to load videos'}
                </p>
              </div>
              <Button onClick={refetch} variant="secondary" size="sm">
                Try Again
              </Button>
            </motion.div>
          )}

          {/* Loading State */}
          {isLoading && videos.length === 0 && (
            <VideoGrid>
              {Array.from({ length: 12 }).map((_, index) => (
                <VideoCardSkeleton key={index} />
              ))}
            </VideoGrid>
          )}

          {/* Empty State */}
          {!isLoading && !error && videos.length === 0 && (
            <EmptyState
              icon={
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              }
              title={searchQuery ? 'No videos found' : 'Your library is empty'}
              description={
                searchQuery
                  ? `No videos matching "${searchQuery}". Try a different search term.`
                  : 'Start building your learning library by adding educational videos.'
              }
              action={
                !searchQuery && (
                  <Button
                    onClick={() => window.location.href = '/add-video'}
                    variant="primary"
                  >
                    Add Your First Video
                  </Button>
                )
              }
            />
          )}

            {/* Continue Watching Section */}
            {continueWatchingVideos.length > 0 && (
            <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <div className="flex items-center justify-between mb-4">
                <h2 className="text-heading-lg font-semibold text-text-primary">
                    Continue Watching
                </h2>
                <Link 
                    to="/continue-watching"
                    className="text-body-sm text-accent-blue hover:text-accent-blue-hover transition-colors"
                >
                    View All →
                </Link>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {continueWatchingVideos.slice(0, 4).map((video) => (
                    <ContinueWatchingCard
                    key={video.video_id}
                    video={video}
                    onRemove={removeVideo}
                    />
                ))}
                </div>
            </motion.section>
            )}
          {/* Video Grid */}
          {videos.length > 0 && (
            <>
              <VideoGrid>
                <AnimatePresence mode="popLayout">
                  {videos.map((video, index) => (
                    <motion.div
                      key={video.id || video.video_id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        duration: 0.3,
                        delay: index * 0.05,
                        type: 'spring',
                        stiffness: 100,
                      }}
                    >
                      <VideoCard video={video} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </VideoGrid>

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button
                    onClick={loadMore}
                    variant="secondary"
                    size="lg"
                    loading={isLoading}
                  >
                    Load More Videos
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}