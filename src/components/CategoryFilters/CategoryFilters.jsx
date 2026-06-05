import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const CATEGORIES = [
  { id: 'all', label: 'All Videos', icon: '📚', color: '#3EA6FF' },
  { id: 'in_progress', label: 'In Progress', icon: '▶️', color: '#F7B955' },
  { id: 'completed', label: 'Completed', icon: '✅', color: '#2BA640' },
  { id: 'watch_later', label: 'Watch Later', icon: '🕐', color: '#7C4DFF' },
  { id: 'favorites', label: 'Favorites', icon: '⭐', color: '#FFD700' },
  { id: 'technology', label: 'Technology', icon: '💻', color: '#3EA6FF' },
  { id: 'science', label: 'Science', icon: '🔬', color: '#2BA640' },
  { id: 'design', label: 'Design', icon: '🎨', color: '#E8453C' },
  { id: 'business', label: 'Business', icon: '💼', color: '#F7B955' },
  { id: 'music', label: 'Music', icon: '🎵', color: '#7C4DFF' },
];

export default function CategoryFilters({ selected, onChange, className = '' }) {
  const scrollRef = useRef(null);
  const [showLeftGradient, setShowLeftGradient] = useState(false);
  const [showRightGradient, setShowRightGradient] = useState(true);

  const checkScroll = () => {
    if (!scrollRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setShowLeftGradient(scrollLeft > 0);
    setShowRightGradient(scrollLeft + clientWidth < scrollWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const ref = scrollRef.current;
    if (ref) {
      ref.addEventListener('scroll', checkScroll);
      return () => ref.removeEventListener('scroll', checkScroll);
    }
  }, []);

  const scroll = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={`relative ${className}`}>
      {/* Left Gradient */}
      {showLeftGradient && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-surface-base to-transparent z-10 pointer-events-none" />
      )}

      {/* Right Gradient */}
      {showRightGradient && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-surface-base to-transparent z-10 pointer-events-none" />
      )}

      {/* Scroll Buttons */}
      {showLeftGradient && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 
                   bg-surface-raised border border-border-subtle rounded-full
                   flex items-center justify-center text-text-secondary
                   hover:bg-surface-hover transition-colors shadow-lg"
          aria-label="Scroll left"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {showRightGradient && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-8 
                   bg-surface-raised border border-border-subtle rounded-full
                   flex items-center justify-center text-text-secondary
                   hover:bg-surface-hover transition-colors shadow-lg"
          aria-label="Scroll right"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Category Pills */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide py-1"
      >
        {CATEGORIES.map((category) => {
          const isSelected = selected === category.id;
          
          return (
            <motion.button
              key={category.id}
              onClick={() => onChange(category.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`
                flex items-center gap-1.5 px-4 py-2 rounded-full text-body-sm font-medium
                whitespace-nowrap transition-all duration-200 flex-shrink-0
                ${isSelected 
                  ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/20' 
                  : 'bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-text-primary border border-border-subtle'
                }
              `}
              style={isSelected ? {} : { borderColor: `${category.color}20` }}
            >
              <span className="text-base">{category.icon}</span>
              <span>{category.label}</span>
              
              {/* Selected Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="categoryIndicator"
                  className="absolute inset-0 bg-accent-blue rounded-full -z-10"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}