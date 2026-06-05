import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoDetails } from '@/hooks/useVideoDetails';
import { useVideoProgress } from '@/hooks/useVideoProgress';
import { useNotes } from '@/hooks/useNotes';
import { useBookmarks } from '@/hooks/useBookmarks';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer';
import VideoInfo from '@/components/VideoInfo/VideoInfo';
import NotesPanel from '@/components/NotesPanel/NotesPanel';
import BookmarksPanel from '@/components/BookmarksPanel/BookmarksPanel';
import VideoActions from '@/components/VideoActions/VideoActions';
import FocusModeToggle from '@/components/FocusModeToggle/FocusModeToggle';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function Watch() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  
  const [activePanel, setActivePanel] = useState(null); // 'notes' | 'bookmarks' | null
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const {
    video,
    isLoading,
    error,
    refetch,
  } = useVideoDetails(videoId);

  const {
    progress,
    updateProgress,
    savePosition,
  } = useVideoProgress(videoId);

  const {
    notes,
    isLoading: notesLoading,
    addNote,
    updateNote,
    deleteNote,
  } = useNotes(videoId);

  const {
    bookmarks,
    isLoading: bookmarksLoading,
    addBookmark,
    deleteBookmark,
  } = useBookmarks(videoId);

  // Set document title
  useDocumentTitle(video ? `${video.title} - FocusedTube` : 'Watch - FocusedTube');

  // Save progress periodically and on unmount
  useEffect(() => {
    const interval = setInterval(() => {
      if (playerReady) {
        savePosition();
      }
    }, 5000); // Save every 5 seconds

    return () => {
      clearInterval(interval);
      savePosition(); // Save on unmount
    };
  }, [playerReady, savePosition]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key.toLowerCase()) {
        case 'n':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setActivePanel(prev => prev === 'notes' ? null : 'notes');
          }
          break;
        case 'b':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setActivePanel(prev => prev === 'bookmarks' ? null : 'bookmarks');
          }
          break;
        case 'f':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setIsFocusMode(prev => !prev);
          }
          break;
        case 'escape':
          setActivePanel(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle player ready
  const handlePlayerReady = useCallback(() => {
    setPlayerReady(true);
  }, []);

  // Handle progress update from player
  const handleProgress = useCallback((currentTime) => {
    updateProgress(currentTime);
  }, [updateProgress]);

  // Handle adding note at current timestamp
  const handleAddTimestampNote = useCallback((timestamp) => {
    setActivePanel('notes');
    // The NotesPanel will handle the pre-filled timestamp
  }, []);

  if (isLoading) {
    return <LoadingScreen message="Loading video..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load video"
        message={error.message}
        action={
          <div className="flex gap-3">
            <Button onClick={refetch} variant="primary">
              Try Again
            </Button>
            <Button onClick={() => navigate(-1)} variant="secondary">
              Go Back
            </Button>
          </div>
        }
      />
    );
  }

  if (!video) {
    return (
      <ErrorState
        title="Video not found"
        message="This video may have been removed or is unavailable."
        action={
          <Button onClick={() => navigate('/')} variant="primary">
            Back to Home
          </Button>
        }
      />
    );
  }

  return (
    <div className={`min-h-screen bg-surface-base ${isFocusMode ? 'focus-mode' : ''}`}>
      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {isFocusMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 z-40"
          />
        )}
      </AnimatePresence>

      <div className="max-w-[1920px] mx-auto">
        <div className="flex flex-col lg:flex-row">
          {/* Main Content Area */}
          <div className={`flex-1 min-w-0 ${isFocusMode ? 'fixed inset-0 z-50 flex items-center' : ''}`}>
            <div className={`
              ${isFocusMode 
                ? 'w-full max-w-7xl mx-auto' 
                : 'max-w-5xl mx-auto px-4 py-6'
              }
            `}>
              {/* Player Container */}
              <motion.div
                layout
                className={`
                  relative bg-black rounded-xl overflow-hidden
                  ${isFocusMode ? 'aspect-video' : 'aspect-video mb-4'}
                `}
              >
                <VideoPlayer
                  videoId={video.youtube_id || video.id}
                  onReady={handlePlayerReady}
                  onProgress={handleProgress}
                  startTime={progress?.last_position_seconds || 0}
                  autoplay={!isFocusMode}
                />

                {/* Focus Mode Exit Button */}
                {isFocusMode && (
                  <button
                    onClick={() => setIsFocusMode(false)}
                    className="absolute top-4 right-4 z-10 p-2 bg-black/50 backdrop-blur-sm 
                             text-white rounded-lg hover:bg-black/70 transition-colors"
                    aria-label="Exit focus mode"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </motion.div>

              {/* Video Info & Actions (hidden in focus mode) */}
              {!isFocusMode && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <VideoInfo
                    title={video.title}
                    channel={video.channel_name || video.channelTitle}
                    channelId={video.channel_id}
                    viewCount={video.view_count}
                    publishedAt={video.published_at || video.publishedAt}
                    description={video.description}
                    tags={video.tags}
                  />

                  <VideoActions
                    videoId={video.id}
                    status={progress?.status}
                    isBookmarked={progress?.is_bookmarked}
                    isLiked={progress?.is_liked}
                    onAddNote={() => setActivePanel('notes')}
                    onToggleFocus={() => setIsFocusMode(true)}
                    onProgressUpdate={updateProgress}
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Sidebar Panels */}
          {!isFocusMode && (
            <div className="lg:w-96 xl:w-[420px] border-l border-border-subtle bg-surface-raised">
              {/* Panel Tabs */}
              <div className="flex border-b border-border-subtle">
                <button
                  onClick={() => setActivePanel(prev => prev === 'notes' ? null : 'notes')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 
                    text-body-sm font-medium transition-colors relative
                    ${activePanel === 'notes' 
                      ? 'text-accent-blue' 
                      : 'text-text-secondary hover:text-text-primary'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Notes
                  {notes.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue text-caption rounded-full">
                      {notes.length}
                    </span>
                  )}
                  {activePanel === 'notes' && (
                    <motion.div
                      layoutId="activePanelIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                    />
                  )}
                </button>

                <button
                  onClick={() => setActivePanel(prev => prev === 'bookmarks' ? null : 'bookmarks')}
                  className={`
                    flex-1 flex items-center justify-center gap-2 px-4 py-3 
                    text-body-sm font-medium transition-colors relative
                    ${activePanel === 'bookmarks' 
                      ? 'text-accent-blue' 
                      : 'text-text-secondary hover:text-text-primary'
                    }
                  `}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  Bookmarks
                  {bookmarks.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-accent-blue/10 text-accent-blue text-caption rounded-full">
                      {bookmarks.length}
                    </span>
                  )}
                  {activePanel === 'bookmarks' && (
                    <motion.div
                      layoutId="activePanelIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                    />
                  )}
                </button>
              </div>

              {/* Panel Content */}
              <AnimatePresence mode="wait">
                {activePanel === 'notes' && (
                  <motion.div
                    key="notes"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <NotesPanel
                      notes={notes}
                      isLoading={notesLoading}
                      onAdd={addNote}
                      onUpdate={updateNote}
                      onDelete={deleteNote}
                      videoDuration={video.duration_seconds || video.duration}
                      currentTime={progress?.last_position_seconds || 0}
                    />
                  </motion.div>
                )}

                {activePanel === 'bookmarks' && (
                  <motion.div
                    key="bookmarks"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <BookmarksPanel
                      bookmarks={bookmarks}
                      isLoading={bookmarksLoading}
                      onAdd={addBookmark}
                      onDelete={deleteBookmark}
                      videoDuration={video.duration_seconds || video.duration}
                      currentTime={progress?.last_position_seconds || 0}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Empty State when no panel is active */}
              {!activePanel && (
                <div className="flex flex-col items-center justify-center h-64 text-center p-8">
                  <svg className="w-12 h-12 text-text-tertiary mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  <h3 className="text-body-base font-medium text-text-secondary mb-2">
                    Learning Tools
                  </h3>
                  <p className="text-body-sm text-text-tertiary">
                    Open Notes to capture key insights or Bookmarks to save important moments.
                  </p>
                  <div className="mt-4 flex gap-2 text-body-xs text-text-tertiary">
                    <kbd className="px-2 py-1 bg-surface-hover rounded">N</kbd>
                    <span>Notes</span>
                    <kbd className="px-2 py-1 bg-surface-hover rounded ml-2">B</kbd>
                    <span>Bookmarks</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}