import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function BookmarkButton({ 
  isBookmarked = false,
  currentTime = 0,
  onBookmark,
  onRemove,
  size = 'md',
  showLabel = false,
  disabled = false,
  className = '' 
}) {
  const [isAnimating, setIsAnimating] = useState(false);

  const handleClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsAnimating(true);
    
    try {
      if (isBookmarked) {
        await onRemove?.();
      } else {
        await onBookmark?.(Math.floor(currentTime));
      }
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [isBookmarked, currentTime, onBookmark, onRemove, disabled]);

  const sizes = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative inline-flex items-center gap-2 rounded-full
        transition-all duration-300 ease-out
        ${sizes[size]}
        ${isBookmarked 
          ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20' 
          : 'text-text-tertiary hover:text-yellow-400 hover:bg-surface-hover'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={isBookmarked ? 'Remove bookmark' : `Bookmark at ${formatTime(currentTime)}`}
      title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
    >
      {/* Bookmark Icon */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {isBookmarked ? (
            <motion.svg
              key="filled"
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={iconSizes[size]}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </motion.svg>
          ) : (
            <motion.svg
              key="outline"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={iconSizes[size]}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Ripple Animation */}
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className={`absolute inset-0 rounded-full ${isBookmarked ? 'bg-yellow-400' : 'bg-text-tertiary'}`}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Label */}
      {showLabel && (
        <span className="text-body-sm font-medium">
          {isBookmarked ? 'Bookmarked' : 'Bookmark'}
        </span>
      )}

      {/* Quick Time Display on Hover */}
      {!isBookmarked && (
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 
                      transition-opacity pointer-events-none">
          <span className="px-2 py-0.5 bg-black/80 text-white text-caption rounded whitespace-nowrap">
            {formatTime(currentTime)}
          </span>
        </div>
      )}
    </motion.button>
  );
}

function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return h > 0 
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
}