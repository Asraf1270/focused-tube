import { parseDuration, formatDuration, isYouTubeShort } from './urlParser';

/**
 * YouTube Data API Service
 * Handles all interactions with YouTube API
 */

// API Configuration
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = import.meta.env.VITE_YOUTUBE_API_BASE_URL || 'https://www.googleapis.com/youtube/v3';
const CACHE_TTL = parseInt(import.meta.env.VITE_YOUTUBE_CACHE_TTL) || 3600;

// In-memory cache
const videoCache = new Map();

/**
 * Custom error class for YouTube API errors
 */
export class YouTubeAPIError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'YouTubeAPIError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Make API request to YouTube Data API
 */
async function makeRequest(endpoint, params = {}) {
  if (!YOUTUBE_API_KEY) {
    throw new YouTubeAPIError(
      'YouTube API key is not configured',
      'API_KEY_MISSING',
      { endpoint }
    );
  }

  const url = new URL(`${YOUTUBE_API_BASE_URL}/${endpoint}`);
  
  // Add API key and default params
  url.searchParams.append('key', YOUTUBE_API_KEY);
  
  // Add all params
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value);
    }
  });

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      throw new YouTubeAPIError(
        getErrorMessage(response.status, errorData),
        `HTTP_${response.status}`,
        {
          status: response.status,
          endpoint,
          params,
          errorData,
        }
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof YouTubeAPIError) {
      throw error;
    }

    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new YouTubeAPIError(
        'Network error. Please check your internet connection.',
        'NETWORK_ERROR',
        { originalError: error.message }
      );
    }

    throw new YouTubeAPIError(
      'Failed to fetch video data',
      'FETCH_ERROR',
      { originalError: error.message }
    );
  }
}

/**
 * Get human-readable error message based on status code
 */
function getErrorMessage(status, errorData) {
  const messages = {
    400: 'Invalid request. Please check the video URL.',
    401: 'YouTube API authentication failed. Please check your API key.',
    403: 'YouTube API access denied. Daily quota may be exceeded.',
    404: 'Video not found. It may have been removed or is private.',
    429: 'Too many requests. Please try again later.',
    500: 'YouTube server error. Please try again later.',
    503: 'YouTube service is temporarily unavailable.',
  };

  // Check for specific API errors
  if (errorData?.error?.errors?.length > 0) {
    const apiError = errorData.error.errors[0];
    
    if (apiError.reason === 'quotaExceeded') {
      return 'YouTube API quota exceeded. Please try again tomorrow.';
    }
    
    if (apiError.reason === 'videoNotFound') {
      return 'Video not found. It may have been removed or is private.';
    }
  }

  return messages[status] || `YouTube API error (${status})`;
}

/**
 * Transform YouTube API response to our video format
 */
function transformVideoResponse(item) {
  if (!item) return null;

  const snippet = item.snippet || {};
  const contentDetails = item.contentDetails || {};
  const statistics = item.statistics || {};

  const duration = parseDuration(contentDetails.duration);
  const videoId = item.id?.videoId || item.id;

  return {
    id: videoId,
    title: snippet.title || 'Untitled Video',
    description: snippet.description || '',
    thumbnails: {
      default: snippet.thumbnails?.default || getDefaultThumbnail(videoId, 'default'),
      medium: snippet.thumbnails?.medium || getDefaultThumbnail(videoId, 'mqdefault'),
      high: snippet.thumbnails?.high || getDefaultThumbnail(videoId, 'hqdefault'),
      standard: snippet.thumbnails?.standard || getDefaultThumbnail(videoId, 'sddefault'),
      maxres: snippet.thumbnails?.maxres || getDefaultThumbnail(videoId, 'maxresdefault'),
    },
    channelId: snippet.channelId || '',
    channelTitle: snippet.channelTitle || 'Unknown Channel',
    publishedAt: snippet.publishedAt || new Date().toISOString(),
    duration,
    durationFormatted: formatDuration(duration),
    viewCount: parseInt(statistics.viewCount) || 0,
    likeCount: parseInt(statistics.likeCount) || 0,
    commentCount: parseInt(statistics.commentCount) || 0,
    categoryId: snippet.categoryId || '',
    tags: snippet.tags || [],
    liveBroadcastContent: snippet.liveBroadcastContent || 'none',
    isShort: isYouTubeShort(duration),
    hasCaptions: contentDetails.caption === 'true',
    definition: contentDetails.definition || 'sd',
    dimension: contentDetails.dimension || '2d',
    embedHtml: `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>`,
  };
}

/**
 * Get default thumbnail URL
 */
function getDefaultThumbnail(videoId, quality = 'hqdefault') {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Fetch video details from YouTube API
 */
export async function fetchVideoDetails(videoId) {
  if (!videoId) {
    throw new YouTubeAPIError(
      'Video ID is required',
      'INVALID_INPUT',
      { videoId }
    );
  }

  // Check cache first
  if (import.meta.env.VITE_ENABLE_YOUTUBE_CACHE !== 'false') {
    const cached = getCachedVideo(videoId);
    if (cached) {
      return cached;
    }
  }

  try {
    const response = await makeRequest('videos', {
      part: 'snippet,contentDetails,statistics',
      id: videoId,
      maxResults: 1,
    });

    if (!response.items || response.items.length === 0) {
      throw new YouTubeAPIError(
        'Video not found. It may have been removed or is private.',
        'VIDEO_NOT_FOUND',
        { videoId }
      );
    }

    const video = transformVideoResponse(response.items[0]);

    // Cache the result
    if (import.meta.env.VITE_ENABLE_YOUTUBE_CACHE !== 'false') {
      setCachedVideo(videoId, video);
    }

    return video;
  } catch (error) {
    console.error('Error fetching video details:', error);
    throw error;
  }
}

/**
 * Fetch multiple videos in batch
 */
export async function fetchMultipleVideos(videoIds) {
  if (!videoIds || videoIds.length === 0) {
    return [];
  }

  // Filter out cached videos
  const uncachedIds = videoIds.filter(id => !getCachedVideo(id));
  const cachedVideos = videoIds
    .map(id => getCachedVideo(id))
    .filter(Boolean);

  if (uncachedIds.length === 0) {
    return cachedVideos;
  }

  try {
    const response = await makeRequest('videos', {
      part: 'snippet,contentDetails,statistics',
      id: uncachedIds.join(','),
      maxResults: 50,
    });

    const videos = (response.items || []).map(transformVideoResponse);

    // Cache all results
    videos.forEach(video => {
      setCachedVideo(video.id, video);
    });

    return [...cachedVideos, ...videos];
  } catch (error) {
    console.error('Error fetching multiple videos:', error);
    // Return cached videos even if API fails
    if (cachedVideos.length > 0) {
      return cachedVideos;
    }
    throw error;
  }
}

/**
 * Search YouTube videos
 */
export async function searchVideos(query, options = {}) {
  const {
    maxResults = 10,
    type = 'video',
    order = 'relevance',
    videoDuration,
    videoDefinition,
    videoEmbeddable,
  } = options;

  if (!query) {
    throw new YouTubeAPIError(
      'Search query is required',
      'INVALID_INPUT'
    );
  }

  try {
    const response = await makeRequest('search', {
      part: 'snippet',
      q: query,
      type,
      maxResults,
      order,
      videoDuration,
      videoDefinition,
      videoEmbeddable,
    });

    const videoIds = (response.items || [])
      .map(item => item.id?.videoId)
      .filter(Boolean);

    if (videoIds.length === 0) {
      return [];
    }

    // Fetch full video details for search results
    const videos = await fetchMultipleVideos(videoIds);
    return videos;
  } catch (error) {
    console.error('Error searching videos:', error);
    throw error;
  }
}

/**
 * Fetch channel details
 */
export async function fetchChannelDetails(channelId) {
  if (!channelId) {
    throw new YouTubeAPIError(
      'Channel ID is required',
      'INVALID_INPUT'
    );
  }

  try {
    const response = await makeRequest('channels', {
      part: 'snippet,statistics',
      id: channelId,
      maxResults: 1,
    });

    if (!response.items || response.items.length === 0) {
      throw new YouTubeAPIError(
        'Channel not found',
        'CHANNEL_NOT_FOUND',
        { channelId }
      );
    }

    const channel = response.items[0];
    const snippet = channel.snippet || {};
    const statistics = channel.statistics || {};

    return {
      id: channel.id,
      title: snippet.title || 'Unknown Channel',
      description: snippet.description || '',
      thumbnailUrl: snippet.thumbnails?.default?.url || '',
      subscriberCount: parseInt(statistics.subscriberCount) || 0,
      videoCount: parseInt(statistics.videoCount) || 0,
      viewCount: parseInt(statistics.viewCount) || 0,
      publishedAt: snippet.publishedAt || '',
      country: snippet.country || '',
    };
  } catch (error) {
    console.error('Error fetching channel details:', error);
    throw error;
  }
}

/**
 * Cache management
 */
function getCachedVideo(videoId) {
  const cached = videoCache.get(videoId);
  
  if (cached && Date.now() - cached.cachedAt < cached.ttl * 1000) {
    return cached.data;
  }
  
  // Remove expired cache
  if (cached) {
    videoCache.delete(videoId);
  }
  
  return null;
}

function setCachedVideo(videoId, data) {
  videoCache.set(videoId, {
    data,
    cachedAt: Date.now(),
    ttl: CACHE_TTL,
  });
}

/**
 * Clear entire cache
 */
export function clearVideoCache() {
  videoCache.clear();
}

/**
 * Clear specific video from cache
 */
export function clearVideoFromCache(videoId) {
  videoCache.delete(videoId);
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: videoCache.size,
    videos: Array.from(videoCache.keys()),
  };
}

export default {
  fetchVideoDetails,
  fetchMultipleVideos,
  searchVideos,
  fetchChannelDetails,
  clearVideoCache,
  clearVideoFromCache,
  getCacheStats,
  YouTubeAPIError,
};