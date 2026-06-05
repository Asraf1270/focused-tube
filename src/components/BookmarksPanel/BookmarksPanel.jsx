import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration } from '@/lib/utils/formatters';
import Button from '@/components/ui/Button';

export default function BookmarksPanel({ 
  bookmarks = [], 
  isLoading, 
  onAdd, 
  onDelete,
  videoDuration,
  currentTime,
  className = '' 
}) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('#FFD700');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    
    await onAdd({
      timestamp_seconds: Math.floor(currentTime),
      label: label.trim() || formatDuration(currentTime),
      color_hex: color,
    });

    setLabel('');
    inputRef.current?.focus();
  };

  const handleSeekTo = (timestamp) => {
    if (window.player) {
      window.player.seekTo(timestamp);
    }
  };

  const colors = [
    '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', 
    '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
  ];

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-12 bg-surface-hover rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-200px)] ${className}`}>
      {/* Add Bookmark Form */}
      <div className="p-4 border-b border-border-subtle">
        <form onSubmit={handleAddBookmark}>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`Bookmark at ${formatDuration(currentTime)}`}
                className="w-full pl-10 pr-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                         text-body-sm text-text-primary placeholder:text-text-tertiary
                         focus:outline-none focus:border-accent-blue"
                maxLength={100}
              />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" 
                   fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            
            <Button type="submit" variant="primary" size="sm">
              Save
            </Button>
          </div>

          {/* Color Picker */}
          <div className="flex gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-white scale-125' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
                aria-label={`Select color ${c}`}
              />
            ))}
          </div>
        </form>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <svg className="w-12 h-12 text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <p className="text-body-sm text-text-tertiary">
              No bookmarks yet. Save important moments!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {bookmarks
              .sort((a, b) => a.timestamp_seconds - b.timestamp_seconds)
              .map((bookmark) => (
                <motion.div
                  key={bookmark.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 border-b border-border-subtle hover:bg-surface-hover/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Color Indicator */}
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: bookmark.color_hex || '#FFD700' }}
                    />
                    
                    {/* Bookmark Info */}
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => handleSeekTo(bookmark.timestamp_seconds)}
                        className="inline-flex items-center gap-1.5 text-accent-blue hover:text-accent-blue-hover 
                                 transition-colors mb-0.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        </svg>
                        <span className="text-body-sm font-medium">
                          {formatDuration(bookmark.timestamp_seconds)}
                        </span>
                      </button>
                      
                      {bookmark.label && (
                        <p className="text-body-sm text-text-secondary truncate">
                          {bookmark.label}
                        </p>
                      )}
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => onDelete(bookmark.id)}
                      className="p-1.5 text-text-tertiary hover:text-error rounded-lg 
                               hover:bg-error/10 transition-colors opacity-0 group-hover:opacity-100"
                      aria-label="Delete bookmark"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        )}
      </div>

      {/* Summary Footer */}
      {bookmarks.length > 0 && (
        <div className="p-3 border-t border-border-subtle bg-surface-overlay">
          <p className="text-body-xs text-text-tertiary text-center">
            {bookmarks.length} bookmark{bookmarks.length !== 1 ? 's' : ''} • 
            Click timestamp to jump to that moment
          </p>
        </div>
      )}
    </div>
  );
}