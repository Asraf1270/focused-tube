import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useVideoActions } from '@/hooks/useVideoActions';
import toast from 'react-hot-toast';

export default function VideoActions({ 
  videoId, 
  status, 
  isBookmarked, 
  isLiked,
  onAddNote,
  onToggleFocus,
  onProgressUpdate,
  className = '' 
}) {
  const { toggleBookmark, toggleLike, updateStatus } = useVideoActions();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = useCallback(async (newStatus) => {
    try {
      setIsUpdating(true);
      await updateStatus(videoId, newStatus);
      toast.success(
        newStatus === 'completed' ? 'Marked as completed! 🎉' :
        newStatus === 'in_progress' ? 'Added to in progress' :
        'Added to watch later'
      );
    } catch (error) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  }, [videoId, updateStatus]);

  const handleBookmark = useCallback(async () => {
    try {
      await toggleBookmark(videoId);
      toast.success(isBookmarked ? 'Bookmark removed' : 'Video bookmarked');
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  }, [videoId, isBookmarked, toggleBookmark]);

  const handleLike = useCallback(async () => {
    try {
      await toggleLike(videoId);
    } catch (error) {
      toast.error('Failed to update like');
    }
  }, [videoId, toggleLike]);

  const actions = [
    {
      icon: (
        <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      label: isLiked ? 'Liked' : 'Like',
      onClick: handleLike,
      isActive: isLiked,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
      label: isBookmarked ? 'Bookmarked' : 'Bookmark',
      onClick: handleBookmark,
      isActive: isBookmarked,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      label: 'Add Note',
      onClick: onAddNote,
      isActive: false,
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Focus Mode',
      onClick: onToggleFocus,
      isActive: false,
    },
  ];

  const statusOptions = [
    { value: 'watch_later', label: 'Watch Later', icon: '🕐' },
    { value: 'in_progress', label: 'In Progress', icon: '▶️' },
    { value: 'completed', label: 'Completed', icon: '✅' },
  ];

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {/* Action Buttons */}
      {actions.map((action) => (
        <motion.button
          key={action.label}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={action.onClick}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-full text-body-sm font-medium
            transition-all duration-200
            ${action.isActive
              ? 'bg-accent-blue/10 text-accent-blue'
              : 'bg-surface-raised text-text-secondary hover:bg-surface-hover hover:text-text-primary'
            }
          `}
          aria-label={action.label}
        >
          {action.icon}
          <span className="hidden sm:inline">{action.label}</span>
        </motion.button>
      ))}

      {/* Status Select */}
      <div className="relative ml-auto">
        <select
          value={status || 'watch_later'}
          onChange={(e) => handleStatusChange(e.target.value)}
          disabled={isUpdating}
          className="appearance-none pl-8 pr-8 py-2 bg-surface-raised border border-border-subtle 
                   rounded-full text-body-sm font-medium text-text-primary
                   focus:outline-none focus:border-accent-blue focus:ring-1 focus:ring-accent-blue
                   cursor-pointer hover:border-border-default transition-colors
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom dropdown arrow */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}