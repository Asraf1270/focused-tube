import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatViewCount, formatTimeAgo } from '@/lib/utils/formatters';

export default function VideoInfo({ 
  title, 
  channel, 
  channelId,
  viewCount, 
  publishedAt, 
  description,
  tags = [],
  className = '' 
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={className}>
      {/* Title */}
      <h1 className="text-heading-lg font-bold text-text-primary mb-3">
        {title}
      </h1>

      {/* Channel & Meta */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Channel Avatar */}
          <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
            <span className="text-body-sm font-medium text-accent-blue">
              {channel?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
          
          <div>
            <h2 className="text-body-base font-medium text-text-primary">
              {channel}
            </h2>
            <div className="flex items-center gap-2 text-body-xs text-text-tertiary">
              {viewCount > 0 && (
                <>
                  <span>{formatViewCount(viewCount)}</span>
                  <span>•</span>
                </>
              )}
              {publishedAt && (
                <span>{formatTimeAgo(publishedAt)}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <div className="bg-surface-raised rounded-xl p-4 mb-4">
          <div 
            className={`
              text-body-sm text-text-secondary whitespace-pre-wrap
              ${!isExpanded ? 'line-clamp-3' : ''}
            `}
          >
            {description}
          </div>
          
          {description.length > 150 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-body-sm text-accent-blue hover:text-accent-blue-hover transition-colors"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 10).map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 bg-surface-raised text-body-xs text-text-secondary 
                       rounded-full border border-border-subtle hover:border-border-default 
                       transition-colors cursor-pointer"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}