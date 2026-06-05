import { useState, useEffect } from 'react';
import { videoService } from '@/lib/supabase/services/videoService';
import { useAuth } from '@/hooks/useAuth';

export function useVideoDetails(videoId) {
  const { user } = useAuth();
  const [video, setVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchVideo = async () => {
    if (!videoId || !user) return;

    try {
      setIsLoading(true);
      setError(null);

      const data = await videoService.getVideoDetails(videoId);
      setVideo(data);
    } catch (err) {
      console.error('Error fetching video details:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVideo();
  }, [videoId, user]);

  return {
    video,
    isLoading,
    error,
    refetch: fetchVideo,
  };
}