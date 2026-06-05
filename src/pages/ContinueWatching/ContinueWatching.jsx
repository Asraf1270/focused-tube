import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useContinueWatching } from '@/hooks/useContinueWatching';
import ContinueWatchingCard from '@/components/ContinueWatchingCard/ContinueWatchingCard';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils/formatters';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function ContinueWatching() {
  useDocumentTitle('Continue Watching - FocusedTube');
  
  const { videos, totalCount, stats, isLoading, error, removeVideo } = useContinueWatching();
  const [sortBy, setSortBy] = useState('recent');
  const [filter, setFilter] = useState('all');

  // Sort and filter videos
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    // Apply filter
    if (filter === 'almost_done') {
      result = result.filter(v => v.completion_percentage >= 75);
    } else if (filter === 'just_started') {
      result = result.filter(v => v.completion_percentage < 25);
    } else if (filter === 'halfway') {
      result = result.filter(v => v.completion_percentage >= 25 && v.completion_percentage < 75);
    }

    // Apply sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.last_watched_at) - new Date(a.last_watched_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.last_watched_at) - new Date(b.last_watched_at));
        break;
      case 'progress_high':
        result.sort((a, b) => b.completion_percentage - a.completion_percentage);
        break;
      case 'progress_low':
        result.sort((a, b) => a.completion_percentage - b.completion_percentage);
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'duration':
        result.sort((a, b) => (b.duration_seconds || 0) - (a.duration_seconds || 0));
        break;
      default:
        break;
    }

    return result;
  }, [videos, sortBy, filter]);

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
                <div className="w-12 h-12 rounded-full bg-brand-red/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-brand-red" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-display-md font-bold text-text-primary">
                    Continue Watching
                  </h1>
                  <p className="text-body-base text-text-secondary">
                    {totalCount} video{totalCount !== 1 ? 's' : ''} in progress
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Link to="/history">
                <Button variant="secondary" size="sm">
                  Watch History
                </Button>
              </Link>
              <Link to="/add-video">
                <Button variant="primary" size="sm">
                  Add Video
                </Button>
              </Link>
            </div>
          </div>

          {/* Stats Overview */}
          {stats && Object.keys(stats).length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon="⏱️"
                label="Total Watch Time"
                value={`${stats.total_watch_time_hours || 0}h`}
              />
              <StatCard
                icon="📊"
                label="Avg. Completion"
                value={`${stats.average_completion || 0}%`}
              />
              <StatCard
                icon="📅"
                label="This Week"
                value={String(stats.videos_this_week || 0)}
              />
              <StatCard
                icon="🔥"
                label="Most Watched"
                value={stats.most_watched_video?.watch_count 
                  ? `${stats.most_watched_video.watch_count}x` 
                  : '0x'
                }
              />
            </div>
          )}
        </motion.div>

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="sticky top-0 z-20 bg-surface-base/95 backdrop-blur-xl py-4 mb-6"
        >
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter Pills */}
            <div className="flex gap-1.5">
              {[
                { value: 'all', label: 'All' },
                { value: 'almost_done', label: 'Almost Done (75%+)' },
                { value: 'halfway', label: 'Halfway (25-75%)' },
                { value: 'just_started', label: 'Just Started (<25%)' },
              ].map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-caption font-medium transition-colors
                    ${filter === f.value 
                      ? 'bg-accent-blue text-white' 
                      : 'bg-surface-raised text-text-secondary hover:bg-surface-hover'
                    }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="ml-auto px-3 py-2 bg-surface-raised border border-border-subtle rounded-lg
                       text-body-sm text-text-secondary focus:outline-none focus:border-accent-blue"
            >
              <option value="recent">Recently Watched</option>
              <option value="oldest">Oldest First</option>
              <option value="progress_high">Highest Progress</option>
              <option value="progress_low">Lowest Progress</option>
              <option value="title">Title A-Z</option>
              <option value="duration">Longest Duration</option>
            </select>
          </div>
        </motion.div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface-raised rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-surface-hover" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-surface-hover rounded w-3/4" />
                  <div className="h-3 bg-surface-hover rounded w-1/2" />
                  <div className="h-1.5 bg-surface-hover rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            }
            title="Failed to load"
            message="Could not load your continue watching list."
          />
        ) : filteredVideos.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            }
            title={filter !== 'all' ? 'No videos match this filter' : 'Nothing in progress'}
            description={
              filter !== 'all'
                ? 'Try a different filter to see more videos.'
                : 'Start watching videos to see them here. Your progress will be saved automatically.'
            }
            action={
              <div className="flex gap-2">
                {filter !== 'all' && (
                  <Button onClick={() => setFilter('all')} variant="secondary">
                    Show All
                  </Button>
                )}
                <Link to="/">
                  <Button variant="primary">Browse Videos</Button>
                </Link>
              </div>
            }
          />
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filteredVideos.map((video, index) => (
                <ContinueWatchingCard
                  key={video.video_id}
                  video={video}
                  onRemove={removeVideo}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({ icon, label, value }) {
  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-body-xs text-text-tertiary">{label}</p>
          <p className="text-body-lg font-semibold text-text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}