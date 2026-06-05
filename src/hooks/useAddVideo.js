import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVideoDetails } from '@/lib/youtube/apiService';
import { extractVideoId, validateYouTubeUrl } from '@/lib/youtube/urlParser';
import { videoService } from '@/lib/supabase/services/videoService';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';

/**
 * Custom hook for adding videos
 */
export function useAddVideo() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [inputValue, setInputValue] = useState('');
  const [validationError, setValidationError] = useState(null);
  const [step, setStep] = useState('input'); // 'input' | 'fetching' | 'preview' | 'saving' | 'error'

  /**
   * Validate URL input
   */
  const validateInput = useCallback((url) => {
    if (!url || !url.trim()) {
      setValidationError('Please enter a YouTube URL or video ID');
      return false;
    }

    const validation = validateYouTubeUrl(url.trim());
    
    if (!validation.isValid) {
      setValidationError(validation.error || 'Invalid YouTube URL');
      return false;
    }

    setValidationError(null);
    return validation;
  }, []);

  /**
   * Fetch video metadata mutation
   */
  const fetchMetadataMutation = useMutation({
    mutationFn: async (url) => {
      const validation = validateInput(url);
      if (!validation) {
        throw new Error('Validation failed');
      }

      setStep('fetching');
      
      const videoData = await fetchVideoDetails(validation.videoId);
      return videoData;
    },
    onSuccess: (data) => {
      setStep('preview');
    },
    onError: (error) => {
      setStep('error');
      setValidationError(error.message);
    },
  });

  /**
   * Save video mutation
   */
  const saveVideoMutation = useMutation({
    mutationFn: async ({ videoData, options = {} }) => {
      if (!user) {
        throw new Error('You must be logged in to add videos');
      }

      setStep('saving');

      const result = await videoService.addVideo(videoData, options);
      return result;
    },
    onSuccess: (data) => {
      // Reset state
      setStep('input');
      setInputValue('');
      setValidationError(null);
      
      // Invalidate queries to refresh video lists
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.invalidateQueries({ queryKey: ['user-videos'] });
      
      toast.success('Video added to your library! 🎉', {
        icon: '📚',
      });
    },
    onError: (error) => {
      setStep('error');
      setValidationError(error.message);
      toast.error(error.message || 'Failed to save video');
    },
  });

  /**
   * Handle URL submission
   */
  const handleSubmit = useCallback(async (url) => {
    const targetUrl = url || inputValue;
    
    try {
      // Fetch metadata
      const videoData = await fetchMetadataMutation.mutateAsync(targetUrl);
      return videoData;
    } catch (error) {
      console.error('Error fetching video:', error);
      return null;
    }
  }, [inputValue, fetchMetadataMutation]);

  /**
   * Save video to library
   */
  const saveVideo = useCallback(async (videoData, options = {}) => {
    try {
      await saveVideoMutation.mutateAsync({ videoData, options });
    } catch (error) {
      console.error('Error saving video:', error);
    }
  }, [saveVideoMutation]);

  /**
   * Handle cancel
   */
  const handleCancel = useCallback(() => {
    setStep('input');
    setInputValue('');
    setValidationError(null);
    fetchMetadataMutation.reset();
    saveVideoMutation.reset();
  }, [fetchMetadataMutation, saveVideoMutation]);

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((value) => {
    setInputValue(value);
    if (validationError) {
      setValidationError(null);
    }
  }, [validationError]);

  /**
   * Retry after error
   */
  const handleRetry = useCallback(() => {
    if (inputValue) {
      handleSubmit(inputValue);
    }
  }, [inputValue, handleSubmit]);

  return {
    // State
    inputValue,
    validationError,
    step,
    videoData: fetchMetadataMutation.data,
    
    // Loading states
    isFetching: fetchMetadataMutation.isPending,
    isSaving: saveVideoMutation.isPending,
    isLoading: fetchMetadataMutation.isPending || saveVideoMutation.isPending,
    
    // Errors
    fetchError: fetchMetadataMutation.error,
    saveError: saveVideoMutation.error,
    
    // Actions
    handleInputChange,
    handleSubmit,
    saveVideo,
    handleCancel,
    handleRetry,
    setInputValue,
  };
}

export default useAddVideo;