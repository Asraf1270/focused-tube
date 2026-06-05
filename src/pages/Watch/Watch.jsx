import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { videoService } from '@/lib/supabase/services/videoService';
import { noteService } from '@/lib/supabase/services/noteService';
import { bookmarkService } from '@/lib/supabase/services/bookmarkService';
import { favoriteService } from '@/lib/supabase/services/favoriteService';
import { progressService } from '@/lib/supabase/services/progressService';
import { progressSyncManager } from '@/lib/sync/progressSyncManager';
import { useAuth } from '@/hooks/useAuth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useMediaQuery, useIsTouchDevice } from '@/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer';
import VideoInfo from '@/components/VideoInfo/VideoInfo';
import VideoActions from '@/components/VideoActions/VideoActions';
import NotesPanel from '@/components/NotesPanel/NotesPanel';
import BookmarksPanel from '@/components/BookmarksPanel/BookmarksPanel';
import FavoriteButton from '@/components/FavoriteButton/FavoriteButton';
import ProgressIndicator from '@/components/ProgressIndicator/ProgressIndicator';
import FocusModeToggle from '@/components/FocusModeToggle/FocusModeToggle';
import ResumeModal from '@/components/ResumeModal/ResumeModal';
import LoadingScreen from '@/components/ui/LoadingScreen';
import ErrorState from '@/components/ui/ErrorState';
import Button from '@/components/ui/Button';
import { formatDuration, formatTimeAgo, formatViewCount } from '@/lib/utils/formatters';
import toast from 'react-hot-toast';

export default function Watch() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isTouchDevice = useIsTouchDevice();
  
  // Refs
  const playerRef = useRef(null);
  const mainContentRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const sessionRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  
  // State
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerState, setPlayerState] = useState(-1);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [activePanel, setActivePanel] = useState(null); // 'notes' | 'bookmarks' | null
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);
  const [bottomSheetHeight, setBottomSheetHeight] = useState('70vh');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedPosition, setLastSavedPosition] = useState(0);
  const [dismissProgress, setDismissProgress] = useState(0);
  const [showAddToList, setShowAddToList] = useState(false);
  
  // Video data
  const [videoData, setVideoData] = useState(null);
  const [userVideoData, setUserVideoData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Set document title
  useDocumentTitle(videoData ? `${videoData.title} - FocusedTube` : 'Watch - FocusedTube');

  // ============================================
  // DATA FETCHING
  // ============================================
  
  const fetchVideoData = useCallback(async () => {
    if (!videoId || !user) return;
    
    try {
      setIsLoading(true);
      setError(null);

      // Fetch video details from YouTube API or database
      let video;
      
      // Try fetching from database first
      const { data: dbVideo, error: dbError } = await supabase
        .from('videos')
        .select('*')
        .or(`youtube_id.eq.${videoId},id.eq.${videoId}`)
        .single();

      if (dbVideo) {
        video = dbVideo;
        
        // Fetch user video data
        const { data: userVideo } = await supabase
          .from('user_videos')
          .select('*')
          .eq('video_id', video.id)
          .single();

        setUserVideoData(userVideo || {});
        setIsFavorited(userVideo?.is_favorite || false);
        setIsBookmarked(userVideo?.is_bookmarked || false);
        setIsLiked(userVideo?.is_liked || false);
        
        if (userVideo?.last_position_seconds > 0 && userVideo?.status === 'in_progress') {
          setShowResumeModal(true);
        }
      } else {
        // Fetch from YouTube API
        const { fetchVideoDetails } = await import('@/lib/youtube/apiService');
        const ytData = await fetchVideoDetails(videoId);
        
        // Save to database
        const saved = await videoService.addVideo(ytData, { status: 'watch_later' });
        video = ytData;
      }

      setVideoData(video);
      setDuration(video.duration_seconds || video.duration || 0);
    } catch (err) {
      console.error('Error fetching video:', err);
      setError(err.message || 'Failed to load video');
    } finally {
      setIsLoading(false);
    }
  }, [videoId, user]);

  useEffect(() => {
    fetchVideoData();
  }, [fetchVideoData]);

  // ============================================
  // PROGRESS TRACKING
  // ============================================
  
  const saveProgress = useCallback(async (position, forceStatus = null) => {
    if (!videoData?.id || !playerReady) return;
    
    const newPosition = Math.floor(position);
    if (Math.abs(newPosition - lastSavedPosition) < 2) return; // Don't save if position barely changed
    
    try {
      setIsSaving(true);
      setLastSavedPosition(newPosition);

      // Calculate completion
      const completionPercent = duration > 0 ? (newPosition / duration) * 100 : 0;
      let status = forceStatus || 'in_progress';
      
      if (completionPercent >= 90 && !forceStatus) {
        status = 'completed';
      }

      await progressService.updateProgress(videoData.id, newPosition, {
        durationSeconds: duration,
        status,
        createSnapshot: false, // Only create snapshots periodically
      });

      // Update user video data locally
      setUserVideoData(prev => ({
        ...prev,
        progress_seconds: newPosition,
        last_position_seconds: newPosition,
        status,
      }));
    } catch (error) {
      console.error('Error saving progress:', error);
      // Queue for later sync
      progressSyncManager.queueUpdate(videoData.id, {
        positionSeconds: newPosition,
        durationSeconds: duration,
        status: forceStatus || 'in_progress',
      });
    } finally {
      setIsSaving(false);
    }
  }, [videoData?.id, duration, lastSavedPosition, playerReady]);

  // Periodic progress saving
  useEffect(() => {
    if (!playerReady) return;

    progressIntervalRef.current = setInterval(() => {
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    }, 5000);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Save final position on unmount
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    };
  }, [playerReady, currentTime, saveProgress]);

  // Create progress snapshot every 30 seconds
  useEffect(() => {
    if (!playerReady || !duration) return;

    const snapshotInterval = setInterval(() => {
      if (currentTime > 0) {
        progressService.createSnapshot(videoData?.id, currentTime, duration)
          .catch(console.warn);
      }
    }, 30000);

    return () => clearInterval(snapshotInterval);
  }, [playerReady, currentTime, duration, videoData?.id]);

  // ============================================
  // WATCH SESSION
  // ============================================
  
  const startWatchSession = useCallback(async () => {
    if (!videoData?.id) return;
    
    try {
      const session = await progressService.startWatchSession(videoData.id, {
        startPosition: userVideoData?.last_position_seconds || 0,
        isFocusMode,
        deviceInfo: {
          isMobile,
          isTablet,
          isTouchDevice,
        },
      });
      sessionRef.current = session;
    } catch (error) {
      console.error('Error starting watch session:', error);
    }
  }, [videoData?.id, userVideoData, isFocusMode, isMobile, isTablet, isTouchDevice]);

  useEffect(() => {
    if (playerReady) {
      startWatchSession();
    }
    return () => {
      // End session on unmount
      if (sessionRef.current && currentTime > 0) {
        progressService.endWatchSession(
          sessionRef.current.id,
          currentTime,
          duration
        ).catch(console.error);
      }
    };
  }, [playerReady, startWatchSession]);

  // ============================================
  // PLAYER HANDLERS
  // ============================================
  
  const handlePlayerReady = useCallback((player) => {
    setPlayerReady(true);
    setDuration(player.getDuration?.() || 0);
  }, []);

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
  }, []);

  const handleStateChange = useCallback((state) => {
    setPlayerState(state);
    
    // YouTube states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
    if (state === 0 && duration > 0 && currentTime > 0) {
      // Video ended - check completion
      const completionPercent = (currentTime / duration) * 100;
      if (completionPercent >= 85) {
        saveProgress(currentTime, 'completed');
        toast.success('Video completed! 🎉', { icon: '✅' });
      }
    }
  }, [duration, currentTime, saveProgress]);

  const handlePlaybackStateChange = useCallback((state) => {
    if (videoData?.id) {
      progressService.savePlaybackState(videoData.id, state);
    }
  }, [videoData?.id]);

  // ============================================
  // USER ACTIONS
  // ============================================
  
  const handleToggleFavorite = useCallback(async () => {
    if (!videoData?.id) return;
    
    try {
      const result = await favoriteService.toggleFavorite(videoData.id);
      setIsFavorited(result.favorited);
      toast.success(result.favorited ? 'Added to favorites! ❤️' : 'Removed from favorites');
    } catch (error) {
      toast.error('Failed to update favorite');
    }
  }, [videoData?.id]);

  const handleToggleBookmark = useCallback(async () => {
    if (!videoData?.id) return;
    
    try {
      if (isBookmarked) {
        // Find and delete the current bookmark
        const bookmarks = await bookmarkService.getVideoBookmarks(videoData.id);
        const nearBookmark = bookmarks.find(b => 
          Math.abs(b.timestamp_seconds - Math.floor(currentTime)) <= 2
        );
        if (nearBookmark) {
          await bookmarkService.deleteBookmark(nearBookmark.id);
        }
      } else {
        await bookmarkService.quickBookmark(videoData.id, currentTime);
      }
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  }, [videoData?.id, isBookmarked, currentTime]);

  const handleToggleLike = useCallback(async () => {
    setIsLiked(prev => !prev);
    toast.success(isLiked ? 'Like removed' : 'Video liked! 👍');
  }, [isLiked]);

  const handleSeekTo = useCallback((timestamp) => {
    playerRef.current?.seekTo(timestamp);
    if (isMobile) {
      setBottomSheetHeight('30vh');
      setTimeout(() => setBottomSheetHeight('70vh'), 1000);
    }
  }, [isMobile]);

  const handleResume = useCallback(() => {
    setShowResumeModal(false);
    const position = userVideoData?.last_position_seconds || 0;
    if (position > 0) {
      playerRef.current?.seekTo(position);
    }
  }, [userVideoData]);

  const handleRestart = useCallback(() => {
    setShowResumeModal(false);
    playerRef.current?.seekTo(0);
  }, []);

  const handleMarkCompleted = useCallback(async () => {
    if (!videoData?.id) return;
    
    try {
      await progressService.markAsCompleted(videoData.id);
      setUserVideoData(prev => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }));
      toast.success('Marked as completed! 🎉');
    } catch (error) {
      toast.error('Failed to mark as completed');
    }
  }, [videoData?.id]);

  const handleAddToList = useCallback((status) => {
    if (!videoData?.id) return;
    
    setUserVideoData(prev => ({ ...prev, status }));
    saveProgress(currentTime, status);
    setShowAddToList(false);
    toast.success(`Added to ${status.replace('_', ' ')}!`);
  }, [videoData?.id, currentTime, saveProgress]);

  // ============================================
  // MOBILE INTERACTIONS
  // ============================================
  
  const handlePlayerTap = useCallback(() => {
    if (isMobile) {
      setShowMobileControls(prev => !prev);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => setShowMobileControls(false), 4000);
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e) => {
    if (activePanel) return; // Don't dismiss when panel is open
    
    const touchY = e.touches[0].clientY;
    if (touchY > 80) {
      const progress = Math.min((touchY - 80) / 250, 1);
      setDismissProgress(progress);
    }
  }, [activePanel]);

  const handleTouchEnd = useCallback(() => {
    if (dismissProgress > 0.4) {
      navigate(-1);
    }
    setDismissProgress(0);
  }, [dismissProgress, navigate]);

  // ============================================
  // KEYBOARD SHORTCUTS
  // ============================================
  
  useKeyboardShortcuts({
    ' ': () => playerRef.current?.togglePlay(),
    'ArrowLeft': () => playerRef.current?.seekTo(Math.max(0, currentTime - 10)),
    'ArrowRight': () => playerRef.current?.seekTo(currentTime + 10),
    'ArrowUp': () => playerRef.current?.setVolume(Math.min(100, (playerRef.current?.getVolume?.() || 100) + 5)),
    'ArrowDown': () => playerRef.current?.setVolume(Math.max(0, (playerRef.current?.getVolume?.() || 100) - 5)),
    'f': () => setIsFocusMode(prev => !prev),
    'n': () => setActivePanel(prev => prev === 'notes' ? null : 'notes'),
    'b': () => setActivePanel(prev => prev === 'bookmarks' ? null : 'bookmarks'),
    'm': () => playerRef.current?.toggleMute(),
    'escape': () => {
      if (activePanel) setActivePanel(null);
      else if (isFocusMode) setIsFocusMode(false);
    },
  }, [currentTime, activePanel, isFocusMode]);

  // ============================================
  // DERIVED STATE
  // ============================================
  
  const completionPercentage = useMemo(() => {
    if (!duration) return 0;
    return Math.min(Math.round((currentTime / duration) * 100), 100);
  }, [currentTime, duration]);

  const videoTitle = videoData?.title || 'Untitled Video';
  const videoChannel = videoData?.channel_name || videoData?.channelTitle || 'Unknown Channel';
  const videoDescription = videoData?.description || '';
  const videoTags = videoData?.tags || [];
  const videoViewCount = videoData?.view_count || videoData?.viewCount || 0;
  const videoPublishedAt = videoData?.published_at || videoData?.publishedAt || null;
  const videoThumbnail = videoData?.thumbnail_url || videoData?.thumbnails?.high?.url || null;

  // ============================================
  // RENDER: LOADING
  // ============================================
  
  if (isLoading) {
    return <LoadingScreen message="Loading video..." />;
  }

  // ============================================
  // RENDER: ERROR
  // ============================================
  
  if (error) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
        <ErrorState
          title="Failed to Load Video"
          message={error}
          action={
            <div className="flex gap-3">
              <Button onClick={fetchVideoData} variant="primary">
                Try Again
              </Button>
              <Button onClick={() => navigate(-1)} variant="secondary">
                Go Back
              </Button>
            </div>
          }
        />
      </div>
    );
  }

  // ============================================
  // RENDER: WATCH PAGE
  // ============================================
  
  return (
    <div 
      className={`min-h-screen bg-surface-base ${isFocusMode ? 'focus-mode-active' : ''}`}
      onTouchMove={isMobile ? handleTouchMove : undefined}
      onTouchEnd={isMobile ? handleTouchEnd : undefined}
    >
      {/* Dismiss Overlay (Mobile swipe) */}
      {dismissProgress > 0 && (
        <div 
          className="fixed inset-0 bg-black z-50 transition-opacity pointer-events-none"
          style={{ opacity: dismissProgress }}
        />
      )}

      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {isFocusMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-40"
          />
        )}
      </AnimatePresence>

      <div className={`flex flex-col ${isFocusMode ? 'lg:flex-row' : 'lg:flex-row'}`}>
        {/* ============================================ */}
        {/* MAIN CONTENT AREA */}
        {/* ============================================ */}
        <div 
          ref={mainContentRef}
          className={`flex-1 min-w-0 ${isFocusMode ? 'fixed inset-0 z-50 flex items-center bg-black' : ''}`}
          onClick={isMobile ? handlePlayerTap : undefined}
        >
          <div className={`
            w-full mx-auto
            ${isFocusMode 
              ? 'max-w-full' 
              : isMobile 
                ? 'max-w-full' 
                : 'max-w-5xl px-4 py-4 lg:py-6'
            }
          `}>
            {/* ============================================ */}
            {/* PLAYER CONTAINER */}
            {/* ============================================ */}
            <motion.div
              layout
              className={`
                relative bg-black overflow-hidden
                ${isFocusMode 
                  ? 'aspect-video w-full' 
                  : isMobile
                    ? 'aspect-video w-full rounded-none'
                    : 'aspect-video rounded-xl mb-4'
                }
              `}
            >
              <VideoPlayer
                ref={playerRef}
                videoId={videoData?.youtube_id || videoData?.id || videoId}
                onReady={handlePlayerReady}
                onTimeUpdate={handleTimeUpdate}
                onStateChange={handleStateChange}
                onPlaybackStateChange={handlePlaybackStateChange}
                startTime={userVideoData?.last_position_seconds || 0}
                autoplay={!isMobile}
              />

              {/* Mobile Controls Overlay */}
              {isMobile && (
                <AnimatePresence>
                  {showMobileControls && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60"
                    >
                      {/* Top Controls */}
                      <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between">
                        <button
                          onClick={() => navigate(-1)}
                          className="p-2 text-white bg-black/40 rounded-full backdrop-blur-sm
                                   active:scale-95 transition-transform"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsFocusMode(!isFocusMode)}
                            className="p-2 text-white bg-black/40 rounded-full backdrop-blur-sm
                                     active:scale-95 transition-transform"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Center Play Button */}
                      {playerState !== 1 && (
                        <button
                          onClick={() => playerRef.current?.play()}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm
                                       flex items-center justify-center active:scale-95 transition-transform">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </button>
                      )}

                      {/* Bottom Controls */}
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <ProgressIndicator
                          progress={currentTime}
                          duration={duration}
                          isSaving={isSaving}
                          className="mb-2"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}

              {/* Focus Mode Exit Button */}
              {isFocusMode && (
                <button
                  onClick={() => setIsFocusMode(false)}
                  className="absolute top-4 right-4 z-10 p-2.5 bg-black/50 backdrop-blur-sm 
                           text-white rounded-full hover:bg-black/70 transition-colors
                           active:scale-95"
                  aria-label="Exit focus mode"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </motion.div>

            {/* ============================================ */}
            {/* VIDEO INFO & ACTIONS (Hidden in focus mode) */}
            {/* ============================================ */}
            {!isFocusMode && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={isMobile ? 'px-3' : ''}
              >
                {/* Title & Actions Row */}
                <div className="mb-4">
                  <h1 className="text-heading-md lg:text-heading-lg font-bold text-text-primary mb-3">
                    {videoTitle}
                  </h1>

                  {/* Mobile: Actions above video info */}
                  {isMobile && (
                    <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-hide -mx-3 px-3">
                      <MobileActionButton
                        icon={
                          <svg className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        }
                        label={isLiked ? 'Liked' : 'Like'}
                        isActive={isLiked}
                        onClick={handleToggleLike}
                      />
                      <FavoriteButton
                        isFavorited={isFavorited}
                        onToggle={handleToggleFavorite}
                        size="md"
                        showLabel
                      />
                      <MobileActionButton
                        icon={
                          <svg className="w-5 h-5" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        }
                        label="Bookmark"
                        isActive={isBookmarked}
                        onClick={handleToggleBookmark}
                      />
                      <MobileActionButton
                        icon={
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        }
                        label="More"
                        onClick={() => setShowAddToList(!showAddToList)}
                      />
                    </div>
                  )}

                  {/* Channel & Meta */}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-body-sm font-medium text-accent-blue">
                          {videoChannel?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-body-base font-medium text-text-primary">
                          {videoChannel}
                        </h2>
                        <div className="flex items-center gap-2 text-body-xs text-text-tertiary">
                          {videoViewCount > 0 && (
                            <>
                              <span>{formatViewCount(videoViewCount)}</span>
                              <span>•</span>
                            </>
                          )}
                          {videoPublishedAt && (
                            <span>{formatTimeAgo(videoPublishedAt)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Desktop Actions */}
                    {!isMobile && (
                      <div className="flex items-center gap-2">
                        <FavoriteButton
                          isFavorited={isFavorited}
                          onToggle={handleToggleFavorite}
                          size="md"
                          showLabel
                        />
                        <Button
                          onClick={handleToggleLike}
                          variant={isLiked ? 'primary' : 'secondary'}
                          size="sm"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {isLiked ? 'Liked' : 'Like'}
                        </Button>
                        <Button
                          onClick={handleToggleBookmark}
                          variant="secondary"
                          size="sm"
                        >
                          <svg className="w-4 h-4 mr-1.5" fill={isBookmarked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                          {isBookmarked ? 'Saved' : 'Bookmark'}
                        </Button>
                        <div className="relative">
                          <Button
                            onClick={() => setShowAddToList(!showAddToList)}
                            variant="secondary"
                            size="sm"
                          >
                            <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Save
                          </Button>
                          
                          {/* Add to List Dropdown */}
                          <AnimatePresence>
                            {showAddToList && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                className="absolute right-0 top-full mt-2 w-48 bg-surface-overlay border 
                                         border-border-subtle rounded-xl shadow-modal overflow-hidden z-30"
                              >
                                {[
                                  { value: 'watch_later', label: 'Watch Later', icon: '🕐' },
                                  { value: 'in_progress', label: 'In Progress', icon: '▶️' },
                                  { value: 'completed', label: 'Completed', icon: '✅' },
                                ].map((option) => (
                                  <button
                                    key={option.value}
                                    onClick={() => handleAddToList(option.value)}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-body-sm
                                             text-text-secondary hover:bg-surface-hover transition-colors"
                                  >
                                    <span>{option.icon}</span>
                                    <span>{option.label}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress Bar (Desktop) */}
                {!isMobile && (
                  <ProgressIndicator
                    progress={currentTime}
                    duration={duration}
                    isSaving={isSaving}
                    className="mb-4"
                  />
                )}

                {/* Description */}
                {videoDescription && (
                  <ExpandableDescription description={videoDescription} />
                )}

                {/* Tags */}
                {videoTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {videoTags.slice(0, 10).map((tag) => (
                      <Link
                        key={tag}
                        to={`/search?q=${encodeURIComponent(tag)}`}
                        className="px-3 py-1 bg-surface-raised text-body-xs text-text-secondary 
                                 rounded-full border border-border-subtle hover:border-border-default
                                 transition-colors active:scale-95"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}

                {/* Panel Tabs (Tablet/Desktop) */}
                {!isMobile && (
                  <div className="flex gap-0 mt-6 border-b border-border-subtle">
                    <button
                      onClick={() => setActivePanel(prev => prev === 'notes' ? null : 'notes')}
                      className={`px-6 py-3 text-body-sm font-medium transition-colors relative
                        ${activePanel === 'notes' ? 'text-accent-blue' : 'text-text-secondary hover:text-text-primary'}
                      `}
                    >
                      📝 Notes
                      {activePanel === 'notes' && (
                        <motion.div layoutId="panelIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" />
                      )}
                    </button>
                    <button
                      onClick={() => setActivePanel(prev => prev === 'bookmarks' ? null : 'bookmarks')}
                      className={`px-6 py-3 text-body-sm font-medium transition-colors relative
                        ${activePanel === 'bookmarks' ? 'text-accent-blue' : 'text-text-secondary hover:text-text-primary'}
                      `}
                    >
                      🔖 Bookmarks
                      {activePanel === 'bookmarks' && (
                        <motion.div layoutId="panelIndicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue" />
                      )}
                    </button>
                  </div>
                )}

                {/* Inline Panels (Desktop) */}
                {!isMobile && activePanel === 'notes' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <NotesPanel
                      videoId={videoData?.id}
                      currentTime={currentTime}
                      videoDuration={duration}
                      onSeekTo={handleSeekTo}
                    />
                  </motion.div>
                )}

                {!isMobile && activePanel === 'bookmarks' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4"
                  >
                    <BookmarksPanel
                      videoId={videoData?.id}
                      currentTime={currentTime}
                      duration={duration}
                      playerRef={playerRef}
                      onSeekTo={handleSeekTo}
                    />
                  </motion.div>
                )}

                {/* Complete Button */}
                {completionPercentage > 85 && userVideoData?.status !== 'completed' && (
                  <div className="flex justify-center mt-6">
                    <Button
                      onClick={handleMarkCompleted}
                      variant="primary"
                      size="lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Mark as Completed
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>

        {/* ============================================ */}
        {/* MOBILE BOTTOM SHEET (Notes/Bookmarks) */}
        {/* ============================================ */}
        {isMobile && activePanel && (
          <MobileBottomSheet
            isOpen={!!activePanel}
            onClose={() => setActivePanel(null)}
            height={bottomSheetHeight}
            title={activePanel === 'notes' ? 'Notes' : 'Bookmarks'}
          >
            {activePanel === 'notes' && (
              <NotesPanel
                videoId={videoData?.id}
                currentTime={currentTime}
                videoDuration={duration}
                onSeekTo={handleSeekTo}
              />
            )}
            {activePanel === 'bookmarks' && (
              <BookmarksPanel
                videoId={videoData?.id}
                currentTime={currentTime}
                duration={duration}
                playerRef={playerRef}
                onSeekTo={handleSeekTo}
              />
            )}
          </MobileBottomSheet>
        )}
      </div>

      {/* Resume Modal */}
      <ResumeModal
        isOpen={showResumeModal}
        onResume={handleResume}
        onRestart={handleRestart}
        progressData={{
          position_seconds: userVideoData?.last_position_seconds,
          last_watched_at: userVideoData?.last_watched_at,
        }}
        videoTitle={videoTitle}
        videoDuration={duration}
      />
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

/**
 * Expandable Description Component
 */
function ExpandableDescription({ description }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldTruncate = description.length > 200;

  return (
    <div className="bg-surface-raised rounded-xl p-4">
      <div className={`
        text-body-sm text-text-secondary whitespace-pre-wrap
        ${!isExpanded && shouldTruncate ? 'line-clamp-3' : ''}
      `}>
        {description}
      </div>
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-body-sm text-accent-blue hover:text-accent-blue-hover transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/**
 * Mobile Action Button
 */
function MobileActionButton({ icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 min-w-[56px] px-3 py-2 rounded-xl
                transition-colors active:scale-95
                ${isActive 
                  ? 'bg-accent-blue/10 text-accent-blue' 
                  : 'bg-surface-raised text-text-secondary'
                }`}
    >
      {icon}
      <span className="text-caption font-medium">{label}</span>
    </button>
  );
}

/**
 * Mobile Bottom Sheet Component
 */
function MobileBottomSheet({ isOpen, onClose, height, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-surface-raised rounded-t-2xl
                     overflow-hidden safe-area-bottom"
            style={{ maxHeight: height }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-surface-hover rounded-full" />
            </div>
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-border-subtle">
              <h3 className="text-heading-sm font-semibold text-text-primary">{title}</h3>
              <button
                onClick={onClose}
                className="p-2 text-text-tertiary hover:text-text-primary rounded-lg
                         hover:bg-surface-hover transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Content */}
            <div className="overflow-y-auto" style={{ maxHeight: `calc(${height} - 80px)` }}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}