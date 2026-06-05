import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVideoDetails, fetchMultipleVideos, searchVideos } from '@/lib/youtube/apiService';
import { validateYouTubeUrl } from '@/lib/youtube/urlParser';
import { videoService } from '@/lib/supabase/services/videoService';
import toast from 'react-hot-toast';

/**
 * Custom hook for YouTube video operations
 */
export function useYouTubeVideo() {
  const [currentVideoId, setCurrentVideoId] = useState(null);
  const queryClient = useQueryClient();

  /**
   * Fetch video details by video ID
   */
  const videoQuery = useQuery({
    queryKey: ['youtube-video', currentVideoId],
    queryFn: () => fetchVideoDetails(currentVideoId),
    enabled: !!currentVideoId,
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    onError: (error) => {
      console.error('Failed to fetch video:', error);
      toast.error(error.message || 'Failed to fetch video details');
    },
  });

  /**
   * Add video to user's library
   */
  const addVideoMutation = useMutation({
    mutationFn: async ({ videoData, status = 'watch_later', tags = [] }) => {
      // First, ensure video exists in database
      const { video, userVideo } = await videoService.addVideo({
        youtubeId: videoData.id,
        title: videoData.title,
        description: videoData.description,
        thumbnailUrl: videoData.thumbnails?.high?.url || videoData.thumbnails?.medium?.url,
        durationSeconds: videoData.duration,
        channelName: videoData.channelTitle,
        channelId: videoData.channelId,
        publishedAt: videoData.publishedAt,
        category: videoData.categoryId,
        tags: videoData.tags,
      }, { status, tags });

      return { video, userVideo };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      toast.success('Video added to your library!');
    },
    onError: (error) => {
      console.error('Failed to add video:', error);
      toast.error(error.message || 'Failed to add video to library');
    },
  });

  /**
   * Process YouTube URL
   */
  const processYouTubeUrl = useCallback(async (url, options = {}) => {
    // Validate URL
    const validation = validateYouTubeUrl(url);
    
    if (!validation.isValid) {
      throw new Error(validation.error || 'Invalid YouTube URL');
    }

    const videoId = validation.videoId;

    // Set current video ID to trigger fetch
    setCurrentVideoId(videoId);

    try {
      // Wait for video details to load
      const videoData = await fetchVideoDetails(videoId);

      // Optionally add to library
      if (options.addToLibrary !== false) {
        await addVideoMutation.mutateAsync({
          videoData,
          status: options.status || 'watch_later',
          tags: options.tags || [],
        });
      }

      return videoData;
    } catch (error) {
      setCurrentVideoId(null);
      throw error;
    }
  }, [addVideoMutation]);

  /**
   * Fetch multiple videos
   */
  const fetchVideos = useCallback(async (videoIds) => {
    try {
      return await fetchMultipleVideos(videoIds);
    } catch (error) {
      console.error('Failed to fetch multiple videos:', error);
      throw error;
    }
  }, []);

  /**
   * Search YouTube videos
   */
  const searchYouTubeVideos = useCallback(async (query, options = {}) => {
    try {
      return await searchVideos(query, options);
    } catch (error) {
      console.error('Failed to search videos:', error);
      throw error;
    }
  }, []);

  /**
   * Clear current video
   */
  const clearVideo = useCallback(() => {
    setCurrentVideoId(null);
  }, []);

  return {
    // Current video
    currentVideoId,
    video: videoQuery.data,
    isLoading: videoQuery.isLoading,
    error: videoQuery.error,
    
    // Actions
    processYouTubeUrl,
    fetchVideos,
    searchYouTubeVideos,
    clearVideo,
    addToLibrary: (videoData, options) => 
      addVideoMutation.mutateAsync({ videoData, ...options }),
    
    // States
    isAddingToLibrary: addVideoMutation.isPending,
    addError: addVideoMutation.error,
  };
}

export default useYouTubeVideo;