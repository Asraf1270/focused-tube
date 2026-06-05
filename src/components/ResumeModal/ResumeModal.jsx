import { motion, AnimatePresence } from 'framer-motion';
import { formatDuration, formatTimeAgo } from '@/lib/utils/formatters';
import Button from '@/components/ui/Button';

export default function ResumeModal({ 
  isOpen, 
  onResume, 
  onRestart, 
  progressData,
  videoTitle,
  videoDuration,
  className = '' 
}) {
  if (!progressData) return null;

  const progressPercent = videoDuration > 0
    ? Math.round((progressData.position_seconds / videoDuration) * 100)
    : 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-surface-raised border border-border-subtle rounded-2xl shadow-modal 
                     max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-border-subtle">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-accent-blue/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-heading-sm font-semibold text-text-primary">
                    Resume Watching?
                  </h3>
                  <p className="text-body-sm text-text-secondary">
                    You have unsaved progress
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-body-xs text-text-tertiary">Progress</span>
                  <span className="text-body-xs font-medium text-accent-blue">
                    {progressPercent}%
                  </span>
                </div>
                <div className="h-2 bg-surface-hover rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-full bg-accent-blue rounded-full"
                  />
                </div>
              </div>

              {/* Info */}
              <div className="flex items-center justify-between text-body-xs text-text-tertiary">
                <span>
                  Resume at {formatDuration(progressData.position_seconds)}
                </span>
                <span>
                  Last watched {formatTimeAgo(progressData.last_watched_at)}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-body-sm text-text-secondary mb-4">
                Would you like to resume <strong className="text-text-primary">{videoTitle}</strong> from where you left off, or start from the beginning?
              </p>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button
                  onClick={onResume}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    Resume from {formatDuration(progressData.position_seconds)}
                  </div>
                </Button>

                <Button
                  onClick={onRestart}
                  variant="ghost"
                  size="lg"
                  className="w-full"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Start from Beginning
                  </div>
                </Button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-4 text-center">
              <p className="text-caption text-text-tertiary">
                Progress saves automatically every few seconds
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}