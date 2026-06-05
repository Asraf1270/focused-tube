import { useState, useCallback, useEffect, useRef } from 'react';
import { progressService } from '@/lib/supabase/services/progressService';
import { progressSyncManager } from '@/lib/sync/progressSyncManager';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Custom hook for watch progress tracking
 */
export function useWatchProgress(videoId, videoDuration) {
  const { user } = useAuth();
  
  const [progress, setProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedPosition, setLastSavedPosition] = useState(0);
  const [resumeData, setResumeData] = useState(null);
  
  const sessionRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const snapshotIntervalRef = useRef(null);
  const lastUpdateRef = useRef(0);

  // Load initial progress
  useEffect(() => {
    if (!videoId || !user) return;

    loadProgress();
    startWatchSession();

    return () => {
      cleanup();
    };
  }, [videoId, user]);

  /**
   * Load existing progress and resume data
   */
  const loadProgress = async () => {
    try {
      setIsLoading(true);

      const [progressData, resume] = await Promise.all([
        progressService.getVideoProgress(videoId),
        progressService.getResumeData(videoId),
      ]);

      setProgress(progressData);
      setResumeData(resume);

      if (progressData) {
        setLastSavedPosition(progressData.last_position_seconds);
      }

      return resume?.progress?.position_seconds || 0;
    } catch (error) {
      console.error('Error loading progress:', error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start a new watch session
   */
  const startWatchSession = async () => {
    try {
      const session = await progressService.startWatchSession(videoId, {
        startPosition: resumeData?.progress?.position_seconds || 0,
        playbackSpeed: resumeData?.playback_state?.playbackRate || 1.0,
        isFocusMode: false,
      });

      sessionRef.current = session;
    } catch (error) {
      console.error('Error starting watch session:', error);
    }
  };

  /**
   * Start periodic progress saving
   */
  const startPeriodicSave = useCallback((currentTime) => {
    // Save every 5 seconds if position changed
    progressIntervalRef.current = setInterval(() => {
      if (Math.abs(currentTime - lastSavedPosition) > 1) {
        saveProgress(currentTime);
      }
    }, 5000);

    // Create snapshots every 30 seconds
    snapshotIntervalRef.current = setInterval(() => {
      if (videoDuration) {
        progressService.createSnapshot(videoId, currentTime, videoDuration);
      }
    }, 30000);
  }, [videoId, videoDuration, lastSavedPosition]);

  /**
   * Update current position (called frequently by player)
   */
  const updatePosition = useCallback((currentTime) => {
    setProgress(prev => ({
      ...prev,
      last_position_seconds: Math.floor(currentTime),
      progress_seconds: Math.floor(currentTime),
    }));

    // Throttle sync queue updates to every 2 seconds
    const now = Date.now();
    if (now - lastUpdateRef.current >= 2000) {
      progressSyncManager.queueUpdate(videoId, {
        positionSeconds: currentTime,
        durationSeconds: videoDuration,
        status: 'in_progress',
      });
      lastUpdateRef.current = now;
    }
  }, [videoId, videoDuration]);

  /**
   * Save progress immediately
   */
  const saveProgress = useCallback(async (currentTime) => {
    if (!videoId) return;

    try {
      setIsSaving(true);

      await progressService.updateProgress(
        videoId,
        Math.floor(currentTime),
        {
          durationSeconds: videoDuration,
          createSnapshot: true,
        }
      );

      setLastSavedPosition(currentTime);
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setIsSaving(false);
    }
  }, [videoId, videoDuration]);

  /**
   * Save playback state (volume, speed, captions)
   */
  const savePlaybackState = useCallback(async (state) => {
    if (!videoId) return;

    try {
      await progressService.savePlaybackState(videoId, state);
    } catch (error) {
      console.error('Error saving playback state:', error);
    }
  }, [videoId]);

  /**
   * Mark video as completed
   */
  const markAsCompleted = useCallback(async () => {
    if (!videoId) return;

    try {
      await progressService.markAsCompleted(videoId);
      setProgress(prev => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }));
      toast.success('Video marked as completed! 🎉');
    } catch (error) {
      toast.error('Failed to mark as completed');
      throw error;
    }
  }, [videoId]);

  /**
   * Get resume position
   */
  const getResumePosition = useCallback(() => {
    if (resumeData?.progress?.position_seconds) {
      return resumeData.progress.position_seconds;
    }
    return 0;
  }, [resumeData]);

  /**
   * Calculate completion percentage
   */
  const getCompletionPercentage = useCallback(() => {
    if (!videoDuration || videoDuration === 0) return 0;
    const pos = progress?.progress_seconds || 0;
    return Math.min(Math.round((pos / videoDuration) * 100), 100);
  }, [progress, videoDuration]);

  /**
   * Cleanup on unmount
   */
  const cleanup = () => {
    // Clear intervals
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (snapshotIntervalRef.current) {
      clearInterval(snapshotIntervalRef.current);
    }

    // End watch session
    if (sessionRef.current) {
      const currentPosition = progress?.last_position_seconds || 0;
      progressService.endWatchSession(
        sessionRef.current.id,
        currentPosition,
        videoDuration
      ).catch(console.error);
    }
  };

  return {
    // State
    progress,
    resumeData,
    isLoading,
    isSaving,
    lastSavedPosition,

    // Actions
    updatePosition,
    saveProgress,
    savePlaybackState,
    markAsCompleted,
    getResumePosition,
    getCompletionPercentage,
    
    // Session
    startPeriodicSave,
    loadProgress,
  };
}

export default useWatchProgress;