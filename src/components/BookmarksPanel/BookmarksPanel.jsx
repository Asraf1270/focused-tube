import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBookmarks } from '@/hooks/useBookmarks';
import BookmarkButton from '@/components/BookmarkButton/BookmarkButton';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';

const BOOKMARK_COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
const BOOKMARK_ICONS = ['🔖', '⭐', '💡', '🎯', '📌', '🏁', '💎', '🔥'];

export default function BookmarksPanel({ 
  videoId, 
  currentTime, 
  duration,
  playerRef,
  onSeekTo,
  className = '' 
}) {
  const {
    bookmarks,
    isLoading,
    addBookmark,
    quickBookmark,
    deleteBookmark,
    hasBookmarkAt,
  } = useBookmarks(videoId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#FFD700');
  const [icon, setIcon] = useState('🔖');
  const [category, setCategory] = useState('');
  const [filterCategory, setFilterCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredBookmark, setHoveredBookmark] = useState(null);
  
  const labelInputRef = useRef(null);

  useEffect(() => {
    if (showAddForm) {
      labelInputRef.current?.focus();
    }
  }, [showAddForm]);

  // Check if current time has a bookmark
  const isCurrentTimeBookmarked = hasBookmarkAt(currentTime);

  // Get unique categories from bookmarks
  const categories = [...new Set(bookmarks.map(b => b.category).filter(Boolean))];

  // Filter bookmarks by category
  const filteredBookmarks = filterCategory
    ? bookmarks.filter(b => b.category === filterCategory)
    : bookmarks;

  const handleQuickBookmark = async () => {
    await quickBookmark(currentTime);
  };

  const handleAddBookmark = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await addBookmark({
        timestampSeconds: Math.floor(currentTime),
        label: label.trim() || formatTime(currentTime),
        description: description.trim() || null,
        color,
        icon,
        category: category.trim() || null,
      });
      
      setShowAddForm(false);
      setLabel('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeekTo = (timestampSeconds) => {
    if (playerRef?.current) {
      playerRef.current.seekTo(timestampSeconds);
    }
    onSeekTo?.(timestampSeconds);
  };

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border-subtle">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-heading-sm font-semibold text-text-primary">Bookmarks</h3>
            <span className="px-2 py-0.5 bg-surface-hover text-caption text-text-tertiary rounded-full">
              {bookmarks.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Bookmark Button */}
            <BookmarkButton
              isBookmarked={isCurrentTimeBookmarked}
              currentTime={currentTime}
              onBookmark={handleQuickBookmark}
              onRemove={() => {
                const bookmark = bookmarks.find(b => 
                  Math.abs(b.timestamp_seconds - Math.floor(currentTime)) <= 2
                );
                if (bookmark) deleteBookmark(bookmark.id);
              }}
              size="sm"
            />
            
            {/* Add Bookmark Button */}
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant={showAddForm ? 'secondary' : 'primary'}
              size="sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d={showAddForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
              </svg>
              {showAddForm ? 'Cancel' : 'Add'}
            </Button>
          </div>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            <button
              onClick={() => setFilterCategory(null)}
              className={`px-3 py-1 rounded-full text-caption whitespace-nowrap transition-colors
                ${!filterCategory 
                  ? 'bg-accent-blue text-white' 
                  : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat === filterCategory ? null : cat)}
                className={`px-3 py-1 rounded-full text-caption whitespace-nowrap transition-colors
                  ${cat === filterCategory 
                    ? 'bg-accent-blue text-white' 
                    : 'bg-surface-hover text-text-secondary hover:text-text-primary'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add Bookmark Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddBookmark}
            className="border-b border-border-subtle overflow-hidden"
          >
            <div className="p-4 space-y-3">
              {/* Timestamp Display */}
              <div className="flex items-center gap-2 text-body-sm text-accent-blue font-mono">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bookmark at {formatTime(currentTime)}
              </div>

              {/* Label */}
              <input
                ref={labelInputRef}
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Label (optional)"
                className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                         text-body-sm text-text-primary placeholder:text-text-tertiary
                         focus:outline-none focus:border-accent-blue"
                maxLength={200}
              />

              {/* Description */}
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                         text-body-sm text-text-primary placeholder:text-text-tertiary resize-none
                         focus:outline-none focus:border-accent-blue"
              />

              {/* Category */}
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Category (optional)"
                className="w-full px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg
                         text-body-sm text-text-primary placeholder:text-text-tertiary
                         focus:outline-none focus:border-accent-blue"
              />

              {/* Color & Icon Selection */}
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {BOOKMARK_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-full transition-all ${
                        color === c ? 'ring-2 ring-white scale-110' : 'hover:scale-110'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex gap-1">
                  {BOOKMARK_ICONS.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setIcon(ic)}
                      className={`text-lg transition-all ${
                        icon === ic ? 'scale-125' : 'hover:scale-110'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <Button type="submit" variant="primary" size="sm" loading={isSubmitting} className="w-full">
                Save Bookmark
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-surface-hover rounded-lg animate-pulse" />
            ))}
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <EmptyState
            icon={<span className="text-4xl">🔖</span>}
            title="No bookmarks yet"
            description="Save important moments to jump back to them instantly. Click the bookmark button or press B to bookmark the current time."
            className="h-full"
          />
        ) : (
          <div>
            {filteredBookmarks.map((bookmark) => (
              <motion.div
                key={bookmark.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={`
                  group relative flex items-center gap-3 p-3 border-b border-border-subtle
                  hover:bg-surface-hover/30 transition-colors cursor-pointer
                  ${hoveredBookmark === bookmark.id ? 'bg-surface-hover/50' : ''}
                `}
                onClick={() => handleSeekTo(bookmark.timestamp_seconds)}
                onMouseEnter={() => setHoveredBookmark(bookmark.id)}
                onMouseLeave={() => setHoveredBookmark(null)}
              >
                {/* Color Bar */}
                <div 
                  className="absolute left-0 top-0 bottom-0 w-1"
                  style={{ backgroundColor: bookmark.color_hex }}
                />

                {/* Icon */}
                <span className="text-xl flex-shrink-0">{bookmark.icon}</span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {/* Timestamp */}
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 
                                   text-accent-blue text-caption font-mono rounded-full">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      {bookmark.formatted_time}
                    </span>

                    {/* Category Badge */}
                    {bookmark.category && (
                      <span className="px-2 py-0.5 bg-surface-hover text-caption text-text-tertiary rounded-full">
                        {bookmark.category}
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  {bookmark.label && (
                    <p className="text-body-sm text-text-primary truncate mt-1">
                      {bookmark.label}
                    </p>
                  )}

                  {/* Description */}
                  {bookmark.description && (
                    <p className="text-body-xs text-text-tertiary truncate mt-0.5">
                      {bookmark.description}
                    </p>
                  )}
                </div>

                {/* Delete Button (show on hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteBookmark(bookmark.id);
                  }}
                  className="p-1.5 text-text-tertiary hover:text-error rounded-lg 
                           hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete bookmark"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* Seek Preview on Hover */}
                <AnimatePresence>
                  {hoveredBookmark === bookmark.id && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-12 top-1/2 -translate-y-1/2 
                               bg-surface-overlay border border-border-subtle rounded-lg 
                               shadow-lg px-3 py-1.5 z-10 pointer-events-none"
                    >
                      <span className="text-caption text-text-secondary whitespace-nowrap">
                        Click to jump to {bookmark.formatted_time}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className="p-3 border-t border-border-subtle text-center">
        <p className="text-caption text-text-tertiary">
          Press <kbd className="px-1.5 py-0.5 bg-surface-hover rounded">B</kbd> to bookmark • 
          Click timestamp to seek
        </p>
      </div>
    </div>
  );
}