import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration, formatTimeAgo } from '@/lib/utils/formatters';

export default function ContinueWatchingCard({ 
  video, 
  onRemove,
  className = '' 
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [imageError, setImageError] = useState(false);

  const completionPercent = video.completion_percentage || 0;
  const remainingSeconds = (video.duration_seconds || 0) - (video.progress_seconds || 0);
  const isAlmostComplete = completionPercent >= 90;

  const thumbnailUrl = imageError
    ? '/placeholder-thumbnail.jpg'
    : video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;

  const handleRemove = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onRemove?.(video.video_id);
    setShowMenu(false);
  }, [video.video_id, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, x: -20 }}
      transition={{ duration: 0.3 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => { setIsHovered(false); setShowMenu(false); }}
      className={`group relative ${className}`}
    >
      <Link
        to={`/watch/${video.youtube_id || video.video_id}`}
        className="block focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-xl"
      >
        <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden
                      transition-all duration-300 hover:shadow-video-card-hover hover:-translate-y-1">
          {/* Thumbnail Section */}
          <div className="relative aspect-video bg-surface-overlay overflow-hidden">
            <img
              src={thumbnailUrl}
              alt={video.title}
              loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-500
                       group-hover:scale-105"
            />

            {/* Play Button Overlay */}
            <div className={`absolute inset-0 flex items-center justify-center bg-black/40 
                          transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm
                           flex items-center justify-center border border-white/30
                           transition-transform duration-300 group-hover:scale-110">
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>

            {/* Duration Badge */}
            <div className="absolute bottom-2 right-2">
              <span className="px-1.5 py-0.5 bg-black/80 text-white text-caption rounded">
                {formatDuration(video.duration_seconds)}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="absolute bottom-0 left-0 right-0">
              <div className="h-1.5 bg-white/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completionPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                  className={`h-full ${
                    isAlmostComplete ? 'bg-success' : 'bg-brand-red'
                  }`}
                />
              </div>
            </div>

            {/* Resume Position Indicator */}
            <div 
              className="absolute bottom-3 left-0 w-full h-0.5 pointer-events-none"
              style={{ marginBottom: '1.5px' }}
            >
              <div 
                className="absolute w-2.5 h-2.5 bg-white rounded-full shadow-lg -translate-y-1/2"
                style={{ left: `${completionPercent}%` }}
              />
            </div>
          </div>

          {/* Info Section */}
          <div className="p-3">
            {/* Title */}
            <h3 className="text-body-sm font-medium text-text-primary line-clamp-2 mb-1.5
                         group-hover:text-accent-blue transition-colors">
              {video.title}
            </h3>

            {/* Channel & Meta */}
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                <span className="text-caption font-medium text-accent-blue">
                  {video.channel_name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <p className="text-body-xs text-text-tertiary truncate">
                {video.channel_name}
              </p>
            </div>

            {/* Progress Info */}
            <div className="space-y-1">
              {/* Completion Percentage */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isAlmostComplete ? (
                    <span className="text-caption text-success font-medium">
                      Almost done!
                    </span>
                  ) : (
                    <span className="text-caption text-text-tertiary">
                      {completionPercent}% complete
                    </span>
                  )}
                </div>
                <span className="text-caption text-text-tertiary">
                  {formatDuration(remainingSeconds)} left
                </span>
              </div>

              {/* Progress Mini Bar */}
              <div className="h-1 bg-surface-hover rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isAlmostComplete ? 'bg-success' : 'bg-accent-blue'
                  }`}
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Watch Info */}
              <div className="flex items-center justify-between text-caption text-text-tertiary">
                <span>
                  Watched {video.watch_count || 1}x
                </span>
                <span>
                  {formatTimeAgo(video.last_watched_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2">
              {/* Resume Button */}
              <span className="flex-1 px-4 py-2 bg-accent-blue text-white text-center text-body-sm 
                           font-medium rounded-lg hover:bg-accent-blue-hover transition-colors">
                Resume
              </span>

              {/* More Options */}
              <div className="relative">
                <button
                  onClick={(e) => { e.preventDefault(); setShowMenu(!showMenu); }}
                  className="p-2 text-text-tertiary hover:text-text-primary rounded-lg
                           hover:bg-surface-hover transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="absolute right-0 bottom-full mb-2 w-48 bg-surface-overlay 
                               border border-border-subtle rounded-lg shadow-modal overflow-hidden z-50"
                    >
                      <button
                        onClick={handleRemove}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-body-sm 
                                 text-text-secondary hover:bg-surface-hover transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Remove from list
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-body-sm 
                                 text-text-secondary hover:bg-surface-hover transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                        Add to Watch Later
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}