import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useWatchProgress } from '@/hooks/useWatchProgress';
import { progressSyncManager } from '@/lib/sync/progressSyncManager';
import ResumeModal from '@/components/ResumeModal/ResumeModal';
import ProgressIndicator from '@/components/ProgressIndicator/ProgressIndicator';
import VideoPlayer from '@/components/VideoPlayer/VideoPlayer';

export default function Watch() {
  const { videoId } = useParams();
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playerRef, setPlayerRef] = useState(null);

  const {
    progress,
    resumeData,
    isLoading,
    isSaving,
    updatePosition,
    saveProgress,
    savePlaybackState,
    markAsCompleted,
    getResumePosition,
    getCompletionPercentage,
    startPeriodicSave,
    loadProgress,
  } = useWatchProgress(videoId, videoDuration);

  // Initialize sync manager
  useEffect(() => {
    progressSyncManager.start({
      syncIntervalMs: 5000,
      maxRetries: 3,
    });

    return () => {
      progressSyncManager.stop();
      // Save final position on unmount
      if (currentTime > 0) {
        saveProgress(currentTime);
      }
    };
  }, []);

  // Show resume modal if progress exists
  useEffect(() => {
    if (!isLoading && resumeData?.has_progress && resumeData.progress.position_seconds > 0) {
      const shouldResume = resumeData.progress.status === 'in_progress';
      if (shouldResume) {
        setShowResumeModal(true);
      }
    }
  }, [isLoading, resumeData]);

  // Start periodic save when player is ready
  useEffect(() => {
    if (playerRef && videoId) {
      startPeriodicSave(currentTime);
    }
  }, [playerRef, videoId]);

  const handlePlayerReady = useCallback((player) => {
    setPlayerRef(player);
  }, []);

  const handleTimeUpdate = useCallback((time) => {
    setCurrentTime(time);
    updatePosition(time);
  }, [updatePosition]);

  const handlePlaybackStateChange = useCallback((state) => {
    savePlaybackState(state);
  }, [savePlaybackState]);

  const handleResume = useCallback(() => {
    setShowResumeModal(false);
    const resumePosition = getResumePosition();
    if (playerRef && resumePosition > 0) {
      playerRef.seekTo(resumePosition);
    }
  }, [playerRef, getResumePosition]);

  const handleRestart = useCallback(() => {
    setShowResumeModal(false);
  }, []);

  const handleComplete = useCallback(async () => {
    await markAsCompleted();
  }, [markAsCompleted]);

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Video Player */}
      <div className="max-w-5xl mx-auto">
        <div className="aspect-video bg-black rounded-xl overflow-hidden mb-4">
          <VideoPlayer
            videoId={videoId}
            onReady={handlePlayerReady}
            onTimeUpdate={handleTimeUpdate}
            onPlaybackStateChange={handlePlaybackStateChange}
            startTime={resumeData?.progress?.position_seconds || 0}
            playbackRate={resumeData?.playback_state?.playbackRate || 1}
          />
        </div>

        {/* Progress Indicator */}
        <ProgressIndicator
          progress={currentTime}
          duration={videoDuration}
          isSaving={isSaving}
          className="px-4"
        />

        {/* Complete Button */}
        {getCompletionPercentage() > 90 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={handleComplete}
              className="px-6 py-2 bg-success text-white rounded-full 
                       hover:bg-success/90 transition-colors"
            >
              Mark as Completed ✓
            </button>
          </div>
        )}
      </div>

      {/* Resume Modal */}
      <ResumeModal
        isOpen={showResumeModal}
        onResume={handleResume}
        onRestart={handleRestart}
        progressData={resumeData?.progress}
        videoTitle={video?.title}
        videoDuration={videoDuration}
      />
    </div>
  );
}