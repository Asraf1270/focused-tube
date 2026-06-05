import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAddVideo } from '@/hooks/useAddVideo';
import VideoPreview from '@/components/VideoPreview/VideoPreview';
import VideoInput from '@/components/VideoInput/VideoInput';
import EmptyState from '@/components/ui/EmptyState';
import Button from '@/components/ui/Button';

export default function AddVideo() {
  const {
    inputValue,
    validationError,
    step,
    videoData,
    isFetching,
    isSaving,
    fetchError,
    handleInputChange,
    handleSubmit,
    saveVideo,
    handleCancel,
    handleRetry,
  } = useAddVideo();

  const [selectedStatus, setSelectedStatus] = useState('watch_later');

  const statusOptions = [
    { value: 'watch_later', label: 'Watch Later', icon: '🕐', description: 'Save for future learning' },
    { value: 'in_progress', label: 'Start Learning', icon: '▶️', description: 'Add and start watching' },
    { value: 'completed', label: 'Mark Completed', icon: '✅', description: 'Already watched this' },
  ];

  const handleSaveWithOptions = () => {
    if (videoData) {
      saveVideo(videoData, { status: selectedStatus });
    }
  };

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-display-md font-bold text-text-primary mb-2"
          >
            Add Video
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-body-lg text-text-secondary"
          >
            Save educational content to your distraction-free library
          </motion.p>
        </div>

        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <VideoInput
            value={inputValue}
            onChange={handleInputChange}
            onSubmit={handleSubmit}
            error={validationError}
            isLoading={isFetching}
            disabled={step === 'saving'}
          />
        </motion.div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {/* Loading State */}
          {step === 'fetching' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-raised border border-border-subtle rounded-xl p-8"
            >
              <div className="flex flex-col items-center justify-center py-12">
                <div className="relative mb-6">
                  <div className="w-20 h-20 border-4 border-surface-hover rounded-full" />
                  <div className="absolute top-0 left-0 w-20 h-20 border-4 border-accent-blue rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-8 h-8 text-accent-blue animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="text-heading-sm font-semibold text-text-primary mb-2">
                  Fetching Video Details
                </h3>
                <p className="text-body-base text-text-secondary text-center max-w-md">
                  Retrieving video information from YouTube...
                </p>
                <div className="mt-4 flex gap-2">
                  <div className="w-2 h-2 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-accent-blue rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Preview State */}
          {step === 'preview' && videoData && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
                {/* Video Preview */}
                <div className="p-6 border-b border-border-subtle">
                  <h2 className="text-heading-sm font-semibold text-text-primary mb-4">
                    Video Preview
                  </h2>
                  <VideoPreview 
                    video={videoData} 
                    showFullDetails 
                  />
                </div>

                {/* Save Options */}
                <div className="p-6">
                  <h3 className="text-heading-sm font-semibold text-text-primary mb-4">
                    Save Options
                  </h3>
                  
                  {/* Status Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setSelectedStatus(option.value)}
                        className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                          selectedStatus === option.value
                            ? 'border-accent-blue bg-accent-blue/5'
                            : 'border-border-subtle hover:border-border-default bg-surface-overlay'
                        }`}
                      >
                        <div className="text-2xl mb-2">{option.icon}</div>
                        <div className={`text-body-sm font-medium mb-1 ${
                          selectedStatus === option.value ? 'text-accent-blue' : 'text-text-primary'
                        }`}>
                          {option.label}
                        </div>
                        <div className="text-body-xs text-text-tertiary">
                          {option.description}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleSaveWithOptions}
                      loading={isSaving}
                      variant="primary"
                      size="lg"
                      className="flex-1"
                    >
                      {isSaving ? 'Adding to Library...' : 'Add to Library'}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="ghost"
                      size="lg"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Error State */}
          {step === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-raised border border-error/20 rounded-xl p-8"
            >
              <div className="flex flex-col items-center text-center py-8">
                <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-heading-sm font-semibold text-text-primary mb-2">
                  Failed to Add Video
                </h3>
                <p className="text-body-base text-text-secondary mb-6 max-w-md">
                  {validationError || fetchError?.message || 'An unexpected error occurred'}
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleRetry} variant="primary">
                    Try Again
                  </Button>
                  <Button onClick={handleCancel} variant="secondary">
                    Start Over
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Empty State */}
          {step === 'input' && !inputValue && (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.3 }}
            >
              <EmptyState
                icon={
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                }
                title="Build Your Learning Library"
                description="Add educational videos to create your personal, distraction-free learning space. We'll fetch all the details automatically."
                action={
                  <div className="mt-4 space-y-2">
                    <p className="text-body-sm text-text-secondary">
                      Supported formats:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        'youtube.com/watch?v=...',
                        'youtu.be/...',
                        'youtube.com/shorts/...',
                        'Video ID (11 characters)',
                      ].map((format) => (
                        <span
                          key={format}
                          className="px-3 py-1 bg-surface-overlay border border-border-subtle rounded-full text-caption text-text-secondary"
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                }
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}