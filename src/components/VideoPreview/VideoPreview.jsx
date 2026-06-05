import { motion } from 'framer-motion';
import { formatDuration } from '@/lib/youtube/urlParser';

export default function VideoPreview({ video, showFullDetails = false, className = '' }) {
  if (!video) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={className}
    >
      <div className="flex gap-4">
        {/* Thumbnail */}
        <div className="relative w-64 flex-shrink-0">
          <div className="aspect-video rounded-lg overflow-hidden bg-surface-overlay">
            <img
              src={video.thumbnails?.high?.url || video.thumbnails?.medium?.url}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = video.thumbnails?.default?.url || '/placeholder-thumbnail.jpg';
              }}
            />
          </div>
          
          {/* Duration Badge */}
          {video.durationFormatted && (
            <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-caption font-medium rounded">
              {video.durationFormatted}
            </span>
          )}

          {/* Short Badge */}
          {video.isShort && (
            <span className="absolute top-2 left-2 px-2 py-1 bg-brand-red/90 text-white text-caption font-medium rounded">
              SHORT
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          {/* Title */}
          <h3 className="text-body-lg font-semibold text-text-primary line-clamp-2 mb-2">
            {video.title}
          </h3>

          {/* Channel */}
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-accent-blue/10 flex items-center justify-center">
              <span className="text-caption font-medium text-accent-blue">
                {video.channelTitle?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
            <p className="text-body-sm text-text-secondary">
              {video.channelTitle}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3 text-body-sm text-text-tertiary mb-3">
            <span>{formatViewCount(video.viewCount)} views</span>
            <span className="w-1 h-1 bg-text-tertiary rounded-full" />
            <span>{formatDate(video.publishedAt)}</span>
            {video.hasCaptions && (
              <>
                <span className="w-1 h-1 bg-text-tertiary rounded-full" />
                <span className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  CC
                </span>
              </>
            )}
          </div>

          {/* Tags */}
          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {video.tags.slice(0, 5).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-surface-hover text-body-xs text-text-secondary rounded"
                >
                  #{tag}
                </span>
              ))}
              {video.tags.length > 5 && (
                <span className="px-2 py-0.5 text-body-xs text-text-tertiary">
                  +{video.tags.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Details (Description) */}
      {showFullDetails && video.description && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 pt-4 border-t border-border-subtle"
        >
          <h4 className="text-body-sm font-medium text-text-secondary mb-2">
            Description
          </h4>
          <p className="text-body-sm text-text-tertiary line-clamp-3 whitespace-pre-wrap">
            {video.description}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

// Helper functions
function formatViewCount(count) {
  if (!count) return '0';
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 30) return `${days} days ago`;
  if (months < 12) return `${months} months ago`;
  return `${years} years ago`;
}