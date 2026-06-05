import { motion } from 'framer-motion';
import { formatDuration } from '@/lib/utils/formatters';

export default function ProgressIndicator({ 
  progress, 
  duration, 
  isSaving,
  className = '' 
}) {
  const percentage = duration > 0 
    ? Math.min((progress / duration) * 100, 100) 
    : 0;

  return (
    <div className={className}>
      {/* Progress Bar */}
      <div className="relative h-1 bg-surface-hover rounded-full overflow-hidden group">
        {/* Watched Progress */}
        <motion.div
          className="absolute left-0 top-0 h-full bg-brand-red"
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
        
        {/* Hover Preview */}
        <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 transition-opacity">
          <div 
            className="h-full bg-white/20"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Time & Status */}
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2 text-caption text-text-tertiary">
          <span>{formatDuration(progress)}</span>
          <span>/</span>
          <span>{formatDuration(duration)}</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-caption text-accent-blue animate-pulse">
              Saving...
            </span>
          )}
          <span className="text-caption text-text-tertiary">
            {Math.round(percentage)}%
          </span>
        </div>
      </div>
    </div>
  );
}