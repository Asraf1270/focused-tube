import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFavorites } from '@/hooks/useFavorites';
import { useCategories } from '@/hooks/useCategories';
import VideoCard from '@/components/VideoCard/VideoCard';
import VideoCardSkeleton from '@/components/VideoCard/VideoCardSkeleton';
import FavoriteButton from '@/components/FavoriteButton/FavoriteButton';
import SearchBar from '@/components/SearchBar/SearchBar';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Favorites() {
  useDocumentTitle('Favorites - FocusedTube');
  
  const { toggleFavorite, useFavoritesQuery, useFavoriteStats } = useFavorites();
  const { categories } = useCategories();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('recent');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const filters = useMemo(() => ({
    sortBy,
    searchQuery: searchQuery || null,
    categoryId: selectedCategory,
    limit: 24,
  }), [sortBy, searchQuery, selectedCategory]);

  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useFavoritesQuery(filters);

  const { data: stats } = useFavoriteStats();

  // Flatten pages data
  const favorites = useMemo(() => 
    data?.pages?.flatMap(page => page.favorites) || [],
  [data]);

  const totalCount = data?.pages?.[0]?.totalCount || 0;

  const handleToggleFavorite = useCallback(async (videoId) => {
    await toggleFavorite(videoId);
  }, [toggleFavorite]);

  const sortOptions = [
    { value: 'recent', label: 'Recently Added' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'title', label: 'Title A-Z' },
    { value: 'channel', label: 'Channel' },
    { value: 'duration', label: 'Duration' },
  ];

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-display-md font-bold text-text-primary">
                    Favorites
                  </h1>
                  <p className="text-body-base text-text-secondary">
                    {totalCount} video{totalCount !== 1 ? 's' : ''} saved
                  </p>
                </div>
              </div>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2 bg-surface-raised rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-surface-hover text-text-primary' 
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-surface-hover text-text-primary' 
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex gap-4 text-body-sm text-text-tertiary">
              <span>{stats.this_week} added this week</span>
              <span>•</span>
              <span>{stats.this_month} added this month</span>
            </div>
          )}
        </motion.div>

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="sticky top-0 z-20 bg-surface-base/95 backdrop-blur-xl pb-4 mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search favorites..."
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 bg-surface-raised border border-border-subtle rounded-xl
                       text-body-sm text-text-secondary focus:outline-none focus:border-accent-blue
                       cursor-pointer hover:border-border-default transition-colors"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="px-4 py-2.5 bg-surface-raised border border-border-subtle rounded-xl
                       text-body-sm text-text-secondary focus:outline-none focus:border-accent-blue
                       cursor-pointer hover:border-border-default transition-colors"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Content */}
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
            title="Failed to load favorites"
            message={error.message}
          />
        ) : favorites.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            }
            title={searchQuery ? 'No favorites found' : 'No favorites yet'}
            description={
              searchQuery
                ? `No favorites matching "${searchQuery}". Try a different search term.`
                : 'Start building your favorites collection by clicking the heart icon on any video.'
            }
            action={
              !searchQuery && (
                <Button onClick={() => window.location.href = '/'} variant="primary">
                  Discover Videos
                </Button>
              )
            }
          />
        ) : (
          <>
            {/* Videos Grid/List */}
            <motion.div
              layout
              className={`grid gap-4 ${
                viewMode === 'grid' 
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'grid-cols-1'
              }`}
            >
              <AnimatePresence mode="popLayout">
                {favorites.map((video, index) => (
                  <motion.div
                    key={video.favorite_id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <div className="relative group">
                      <VideoCard
                        thumbnail={video.thumbnail_url}
                        title={video.title}
                        channel={video.channel_name}
                        duration={video.duration_seconds}
                        youtubeId={video.youtube_id}
                        viewCount={video.view_count}
                        publishedAt={video.published_at}
                        progress={video.progress_seconds}
                        status={video.watch_status}
                        variant={viewMode === 'list' ? 'horizontal' : 'default'}
                        to={`/watch/${video.youtube_id}`}
                      />
                      
                      {/* Favorite Button Overlay */}
                      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <FavoriteButton
                          isFavorited={true}
                          onToggle={() => handleToggleFavorite(video.video_id)}
                          size="sm"
                        />
                      </div>

                      {/* Favorited Date */}
                      <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="px-2 py-1 bg-black/70 text-white text-caption rounded-md backdrop-blur-sm">
                          ❤️ {new Date(video.favorited_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Load More */}
            {hasNextPage && (
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => fetchNextPage()}
                  variant="secondary"
                  size="lg"
                  loading={isFetchingNextPage}
                >
                  Load More Favorites
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}