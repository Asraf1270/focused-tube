import { useState, useCallback } from 'react';
import { videoService } from '@/lib/supabase/services/videoService';

export function useVideoProgress(videoId) {
  const [progress, setProgress] = useState(null);
  const [saving, setSaving] = useState(false);

  const updateProgress = useCallback((currentTime) => {
    setProgress(prev => ({
      ...prev,
      last_position_seconds: Math.floor(currentTime),
      progress_seconds: Math.floor(currentTime),
    }));
  }, []);

  const savePosition = useCallback(async () => {
    if (!videoId || !progress?.last_position_seconds) return;

    try {
      setSaving(true);
      await videoService.updateProgress(
        videoId, 
        progress.last_position_seconds,
        'in_progress'
      );
    } catch (error) {
      console.error('Error saving progress:', error);
    } finally {
      setSaving(false);
    }
  }, [videoId, progress]);

  return {
    progress,
    updateProgress,
    savePosition,
    saving,
  };
}