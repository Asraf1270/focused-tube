import { useState, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

/**
 * Format seconds to human-readable duration string
 */
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format view count with abbreviations
 */
const formatViewCount = (count) => {
  if (!count) return null;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M views`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K views`;
  return `${count.toLocaleString()} views`;
};

/**
 * Format date to relative time
 */
const formatTimeAgo = (dateString) => {
  if (!dateString) return null;
  
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
};

/**
 * VideoCard Component
 * 
 * A reusable card component for displaying video information
 * with hover effects, progress tracking, and action buttons.
 */
const VideoCard = memo(function VideoCard({
  // Core props
  thumbnail,
  title,
  channel,
  duration,
  
  // Optional metadata
  videoId,
  youtubeId,
  viewCount,
  publishedAt,
  description,
  
  // State props
  progress = 0,
  status,
  isBookmarked = false,
  isLiked = false,
  isFavorite = false,
  
  // Behavior props
  href,
  to,
  onClick,
  showActions = true,
  showProgress = true,
  showDescription = false,
  aspectRatio = '16/9',
  
  // Style props
  variant = 'default', // 'default' | 'compact' | 'horizontal' | 'featured'
  className = '',
  
  // Callbacks
  onBookmark,
  onLike,
  onFavorite,
  onMoreOptions,
  onWatchLater,
  onAddToPlaylist,
  
  // Accessibility
  ariaLabel,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const isInteractive = isHovered || isFocused;
  const formattedDuration = formatDuration(duration);
  const formattedViews = formatViewCount(viewCount);
  const formattedTime = formatTimeAgo(publishedAt);
  
  // Determine thumbnail source with fallback
  const thumbnailSrc = imageError
    ? '/images/video-thumbnail-fallback.jpg'
    : (thumbnail || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : '/images/video-thumbnail-fallback.jpg'));

  // Progress percentage
  const progressPercent = duration > 0 ? Math.min((progress / duration) * 100, 100) : 0;

  // Determine if card should render as link
  const isLink = (to || href) && !onClick;
  const linkProps = isLink
    ? to
      ? { to, component: Link }
      : { href, target: '_blank', rel: 'noopener noreferrer' }
    : {};

  const handleClick = useCallback((e) => {
    if (onClick) {
      e.preventDefault();
      onClick(videoId || youtubeId);
    }
  }, [onClick, videoId, youtubeId]);

  const handleBookmark = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.(videoId || youtubeId);
  }, [onBookmark, videoId, youtubeId]);

  const handleLike = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onLike?.(videoId || youtubeId);
  }, [onLike, videoId, youtubeId]);

  const handleFavorite = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    onFavorite?.(videoId || youtubeId);
  }, [onFavorite, videoId, youtubeId]);

  const handleMoreOptions = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowActionsMenu(!showActionsMenu);
    onMoreOptions?.(videoId || youtubeId);
  }, [onMoreOptions, videoId, youtubeId, showActionsMenu]);

  const handleKeyboardNavigation = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick(e);
    }
  }, [handleClick]);

  // Channel initial for avatar fallback
  const channelInitial = channel?.charAt(0)?.toUpperCase() || '?';

  // Render different variants
  if (variant === 'compact') {
    return <CompactVideoCard {...{ title, channel, duration, thumbnail, videoId, progress, className }} />;
  }

  if (variant === 'horizontal') {
    return <HorizontalVideoCard {...{ title, channel, duration, thumbnail, videoId, progress, description, className }} />;
  }

  if (variant === 'featured') {
    return <FeaturedVideoCard {...{ title, channel, duration, thumbnail, videoId, progress, description, viewCount, publishedAt, className }} />;
  }

  // Default variant
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`group relative ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowActionsMenu(false);
      }}
      onFocus={() => setIsFocused(true)}
      onBlur={() => {
        setIsFocused(false);
        setShowActionsMenu(false);
      }}
    >
      <div
        className={`
          relative bg-surface-raised rounded-xl overflow-hidden
          transition-all duration-300 ease-out
          ${isInteractive ? 'shadow-video-card-hover -translate-y-1' : 'shadow-elevation-1'}
        `}
        role="group"
        aria-label={ariaLabel || `${title} by ${channel}`}
      >
        {/* Wrapper for link behavior */}
        {isLink ? (
          <Link
            {...linkProps}
            onClick={handleClick}
            className="block focus:outline-none"
            tabIndex={0}
            onKeyDown={handleKeyboardNavigation}
            aria-label={`Watch ${title}`}
          >
            <CardContent />
          </Link>
        ) : (
          <div
            onClick={handleClick}
            onKeyDown={handleKeyboardNavigation}
            role="button"
            tabIndex={0}
            aria-label={`Watch ${title}`}
            className="cursor-pointer focus:outline-none"
          >
            <CardContent />
          </div>
        )}
      </div>
    </motion.article>
  );

  /**
   * Internal Card Content renderer
   */
  function CardContent() {
    return (
      <>
        {/* Thumbnail Section */}
        <ThumbnailSection />
        
        {/* Info Section */}
        <InfoSection />
        
        {/* Focus Ring */}
        <div className="absolute inset-0 rounded-xl ring-2 ring-accent-blue ring-offset-2 ring-offset-surface-base 
                      opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
      </>
    );
  }

  /**
   * Thumbnail Section Component
   */
  function ThumbnailSection() {
    return (
      <div 
        className="relative overflow-hidden bg-surface-overlay"
        style={{ aspectRatio }}
      >
        {/* Thumbnail Image */}
        <div className="relative w-full h-full">
          {/* Loading Skeleton */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-surface-hover animate-pulse" />
          )}
          
          <img
            src={thumbnailSrc}
            alt={`Thumbnail for ${title}`}
            loading="lazy"
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
            className={`
              w-full h-full object-cover
              transition-all duration-500 ease-out
              ${isInteractive ? 'scale-105' : 'scale-100'}
              ${imageLoaded ? 'opacity-100' : 'opacity-0'}
            `}
          />

          {/* Hover Overlay with Play Button */}
          <AnimatePresence>
            {isInteractive && imageLoaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm
                             flex items-center justify-center
                             border border-white/30"
                  >
                    <svg className="w-6 h-6 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {/* Status Badge */}
          {status && (
            <span className={`
              px-2 py-0.5 rounded text-caption font-medium backdrop-blur-sm
              ${status === 'completed' ? 'bg-success/90 text-white' : ''}
              ${status === 'in_progress' ? 'bg-accent-blue/90 text-white' : ''}
              ${status === 'watch_later' ? 'bg-warning/90 text-black' : ''}
            `}>
              {status === 'in_progress' && 'In Progress'}
              {status === 'completed' && 'Completed'}
              {status === 'watch_later' && 'Watch Later'}
            </span>
          )}
          
          {/* Short Badge */}
          {duration <= 60 && duration > 0 && (
            <span className="px-2 py-0.5 rounded text-caption font-medium bg-brand-red/90 text-white backdrop-blur-sm">
              SHORT
            </span>
          )}
        </div>

        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2">
          <span 
            className="px-1.5 py-0.5 bg-black/80 text-white text-caption font-medium rounded"
            aria-label={`Duration: ${formattedDuration}`}
          >
            {formattedDuration}
          </span>
        </div>

        {/* Progress Bar */}
        {showProgress && progressPercent > 0 && status === 'in_progress' && (
          <div className="absolute bottom-0 left-0 right-0">
            <div className="h-1 bg-white/20">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-brand-red"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${Math.round(progressPercent)}% watched`}
              />
            </div>
          </div>
        )}

        {/* Action Buttons (on hover) */}
        {showActions && (
          <div className={`
            absolute top-2 right-2 transition-all duration-200
            ${isInteractive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
          `}>
            <div className="flex flex-col gap-1">
              {/* Bookmark Button */}
              {onBookmark && (
                <ActionButton
                  onClick={handleBookmark}
                  isActive={isBookmarked}
                  activeColor="bg-accent-blue/90"
                  label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
                  icon={
                    <svg className="w-4 h-4" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  }
                />
              )}

              {/* Like Button */}
              {onLike && (
                <ActionButton
                  onClick={handleLike}
                  isActive={isLiked}
                  activeColor="bg-brand-red/90"
                  label={isLiked ? 'Unlike' : 'Like'}
                  icon={
                    <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  }
                />
              )}

              {/* More Options Button */}
              {onMoreOptions && (
                <div className="relative">
                  <ActionButton
                    onClick={handleMoreOptions}
                    isActive={showActionsMenu}
                    activeColor="bg-white/30"
                    label="More options"
                    icon={
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    }
                  />
                  
                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {showActionsMenu && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-full mt-1 w-48 bg-surface-overlay border border-border-subtle 
                                 rounded-lg shadow-modal overflow-hidden z-50"
                      >
                        {onWatchLater && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onWatchLater(videoId);
                              setShowActionsMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-body-sm text-text-secondary 
                                     hover:bg-surface-hover hover:text-text-primary transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Watch Later
                          </button>
                        )}
                        {onAddToPlaylist && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAddToPlaylist(videoId);
                              setShowActionsMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-4 py-2.5 text-body-sm text-text-secondary 
                                     hover:bg-surface-hover hover:text-text-primary transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add to Playlist
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  /**
   * Info Section Component
   */
  function InfoSection() {
    return (
      <div className="p-3">
        {/* Title */}
        <h3 
          className="text-body-sm font-medium text-text-primary line-clamp-2 mb-1.5
                   group-hover:text-accent-blue transition-colors duration-200"
          title={title}
        >
          {title}
        </h3>

        {/* Channel & Metadata */}
        <div className="flex items-start gap-2">
          {/* Channel Avatar */}
          <div 
            className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5"
            aria-hidden="true"
          >
            <span className="text-caption font-medium text-accent-blue">
              {channelInitial}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            {/* Channel Name */}
            <p className="text-body-xs text-text-tertiary truncate">
              {channel}
            </p>

            {/* Views & Time */}
            <div className="flex items-center gap-1.5 mt-0.5 text-body-xs text-text-tertiary">
              {formattedViews && (
                <>
                  <span>{formattedViews}</span>
                  <span aria-hidden="true">•</span>
                </>
              )}
              {formattedTime && (
                <span>{formattedTime}</span>
              )}
            </div>
          </div>
        </div>

        {/* Description (if enabled) */}
        {showDescription && description && (
          <p className="mt-2 text-body-xs text-text-tertiary line-clamp-2">
            {description}
          </p>
        )}
      </div>
    );
  }
});

/**
 * Compact Video Card Variant
 */
function CompactVideoCard({ title, channel, duration, thumbnail, progress, className }) {
  return (
    <div className={`flex items-center gap-3 p-2 bg-surface-raised rounded-lg hover:bg-surface-overlay transition-colors ${className}`}>
      <div className="relative w-24 h-14 flex-shrink-0 rounded-md overflow-hidden bg-surface-overlay">
        <img src={thumbnail} alt={title} className="w-full h-full object-cover" loading="lazy" />
        <span className="absolute bottom-1 right-1 px-1 py-0.5 bg-black/80 text-white text-caption rounded">
          {formatDuration(duration)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-body-sm font-medium text-text-primary truncate">{title}</h4>
        <p className="text-body-xs text-text-tertiary truncate">{channel}</p>
      </div>
    </div>
  );
}

/**
 * Horizontal Video Card Variant
 */
function HorizontalVideoCard({ title, channel, duration, thumbnail, description, progress, className }) {
  return (
    <div className={`flex gap-4 p-3 bg-surface-raised rounded-xl hover:bg-surface-overlay transition-colors ${className}`}>
      <div className="relative w-40 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-overlay">
        <img src={thumbnail} alt={title} className="w-full h-full object-cover" loading="lazy" />
        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-caption rounded">
          {formatDuration(duration)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-body-base font-medium text-text-primary line-clamp-2 mb-1">{title}</h3>
        <p className="text-body-sm text-text-secondary mb-1">{channel}</p>
        {description && (
          <p className="text-body-xs text-text-tertiary line-clamp-1">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Featured Video Card Variant
 */
function FeaturedVideoCard({ title, channel, duration, thumbnail, description, viewCount, publishedAt, className }) {
  return (
    <div className={`bg-surface-raised rounded-xl overflow-hidden hover:shadow-video-card-hover transition-all ${className}`}>
      <div className="relative aspect-video bg-surface-overlay">
        <img src={thumbnail} alt={title} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-body-sm rounded">
          {formatDuration(duration)}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center">
            <span className="text-body-sm font-medium text-accent-blue">
              {channel?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div>
            <h3 className="text-heading-sm font-semibold text-text-primary line-clamp-1">{title}</h3>
            <p className="text-body-sm text-text-secondary">{channel}</p>
          </div>
        </div>
        {description && (
          <p className="text-body-sm text-text-tertiary line-clamp-2 mb-2">{description}</p>
        )}
        <div className="flex items-center gap-2 text-body-xs text-text-tertiary">
          {viewCount && <span>{formatViewCount(viewCount)}</span>}
          {viewCount && publishedAt && <span>•</span>}
          {publishedAt && <span>{formatTimeAgo(publishedAt)}</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * Action Button Sub-component
 */
function ActionButton({ onClick, isActive, activeColor, label, icon }) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`
        p-2 rounded-full backdrop-blur-sm transition-colors
        ${isActive 
          ? `${activeColor} text-white` 
          : 'bg-black/60 text-white hover:bg-black/80'
        }
      `}
      aria-label={label}
      title={label}
    >
      {icon}
    </motion.button>
  );
}

// PropTypes for type checking
VideoCard.propTypes = {
  thumbnail: PropTypes.string,
  title: PropTypes.string.isRequired,
  channel: PropTypes.string.isRequired,
  duration: PropTypes.number,
  videoId: PropTypes.string,
  youtubeId: PropTypes.string,
  viewCount: PropTypes.number,
  publishedAt: PropTypes.string,
  description: PropTypes.string,
  progress: PropTypes.number,
  status: PropTypes.oneOf(['watch_later', 'in_progress', 'completed', 'not_started']),
  isBookmarked: PropTypes.bool,
  isLiked: PropTypes.bool,
  isFavorite: PropTypes.bool,
  href: PropTypes.string,
  to: PropTypes.string,
  onClick: PropTypes.func,
  showActions: PropTypes.bool,
  showProgress: PropTypes.bool,
  showDescription: PropTypes.bool,
  aspectRatio: PropTypes.string,
  variant: PropTypes.oneOf(['default', 'compact', 'horizontal', 'featured']),
  className: PropTypes.string,
  onBookmark: PropTypes.func,
  onLike: PropTypes.func,
  onFavorite: PropTypes.func,
  onMoreOptions: PropTypes.func,
  onWatchLater: PropTypes.func,
  onAddToPlaylist: PropTypes.func,
  ariaLabel: PropTypes.string,
};

export default VideoCard;