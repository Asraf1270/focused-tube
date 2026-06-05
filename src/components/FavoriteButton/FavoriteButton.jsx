import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';

export default function FavoriteButton({ 
  isFavorited = false, 
  onToggle, 
  size = 'md',
  showLabel = false,
  disabled = false,
  className = '' 
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsAnimating(true);
    
    try {
      await onToggle?.();
    } finally {
      setTimeout(() => setIsAnimating(false), 600);
    }
  }, [onToggle, disabled]);

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
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      disabled={disabled}
      className={`
        relative inline-flex items-center gap-2 rounded-full
        transition-all duration-300 ease-out
        ${sizes[size]}
        ${isFavorited 
          ? 'text-yellow-400 hover:text-yellow-300' 
          : 'text-text-tertiary hover:text-yellow-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
    >
      {/* Heart Icon */}
      <div className="relative">
        <AnimatePresence>
          {isFavorited ? (
            <motion.svg
              key="filled"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={iconSizes[size]}
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </motion.svg>
          )}
        </AnimatePresence>

        {/* Pulse Animation on Toggle */}
        <AnimatePresence>
          {isAnimating && (
            <motion.div
              initial={{ scale: 1, opacity: 1 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className={`absolute inset-0 rounded-full ${isFavorited ? 'bg-yellow-400' : 'bg-text-tertiary'}`}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Label */}
      {showLabel && (
        <span className={`text-body-sm font-medium ${isFavorited ? 'text-yellow-400' : ''}`}>
          {isFavorited ? 'Favorited' : 'Favorite'}
        </span>
      )}

      {/* Floating Hearts on Favorite */}
      <AnimatePresence>
        {isAnimating && isFavorited && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 1, 
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  opacity: 0,
                  scale: 1,
                  x: (Math.random() - 0.5) * 40,
                  y: -30 - Math.random() * 30,
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.6,
                  delay: i * 0.05,
                  ease: 'easeOut',
                }}
                className="absolute top-1/2 left-1/2"
              >
                <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                </svg>
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

FavoriteButton.propTypes = {
  isFavorited: PropTypes.bool,
  onToggle: PropTypes.func.isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showLabel: PropTypes.bool,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};