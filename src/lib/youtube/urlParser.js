/**
 * YouTube URL Parser
 * Extracts video IDs and validates YouTube URLs
 */

// YouTube URL patterns
const YOUTUBE_PATTERNS = {
  // Standard watch URL
  standard: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
  
  // Short URL
  short: /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  
  // Embed URL
  embed: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  
  // Shorts URL
  shorts: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})(?:\?.*)?$/,
  
  // Mobile URL
  mobile: /(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})(?:&.*)?$/,
  
  // Playlist URL
  playlist: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/playlist\?list=([a-zA-Z0-9_-]{34})(?:&.*)?$/,
  
  // Channel URL
  channel: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/channel\/([a-zA-Z0-9_-]{24})(?:\?.*)?$/,
  
  // Handle URL
  handle: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/@([a-zA-Z0-9_-]+)(?:\?.*)?$/,
};

// Video ID validation regex (11 characters, alphanumeric + underscore + hyphen)
const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

/**
 * Extract video ID from YouTube URL
 */
export function extractVideoId(url) {
  if (!url || typeof url !== 'string') {
    return {
      videoId: null,
      urlType: 'unknown',
      isValid: false,
      error: 'URL is required and must be a string',
    };
  }

  // Trim whitespace
  const cleanUrl = url.trim();

  // Check if it's already a video ID
  if (VIDEO_ID_REGEX.test(cleanUrl)) {
    return {
      videoId: cleanUrl,
      urlType: 'video',
      isValid: true,
    };
  }

  // Try each pattern
  for (const [type, pattern] of Object.entries(YOUTUBE_PATTERNS)) {
    const match = cleanUrl.match(pattern);
    if (match) {
      return {
        videoId: match[1],
        urlType: type === 'shorts' ? 'short' : type,
        isValid: true,
      };
    }
  }

  // Try to extract video ID from any URL containing a video ID pattern
  const videoIdMatch = cleanUrl.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (videoIdMatch) {
    return {
      videoId: videoIdMatch[1],
      urlType: 'video',
      isValid: true,
    };
  }

  return {
    videoId: null,
    urlType: 'unknown',
    isValid: false,
    error: 'Invalid YouTube URL. Please provide a valid YouTube video URL.',
  };
}

/**
 * Validate YouTube URL with suggestions
 */
export function validateYouTubeUrl(url) {
  const result = extractVideoId(url);

  if (!result.isValid) {
    return {
      isValid: false,
      error: result.error,
      suggestions: [
        'https://www.youtube.com/watch?v=VIDEO_ID',
        'https://youtu.be/VIDEO_ID',
        'https://www.youtube.com/shorts/VIDEO_ID',
        'Or paste just the video ID (11 characters)',
      ],
    };
  }

  return {
    isValid: true,
    videoId: result.videoId,
    urlType: result.urlType,
  };
}

/**
 * Build YouTube watch URL from video ID
 */
export function buildYouTubeUrl(videoId, type = 'watch') {
  switch (type) {
    case 'short':
      return `https://youtu.be/${videoId}`;
    case 'embed':
      return `https://www.youtube.com/embed/${videoId}`;
    case 'shorts':
      return `https://www.youtube.com/shorts/${videoId}`;
    case 'watch':
    default:
      return `https://www.youtube.com/watch?v=${videoId}`;
  }
}

/**
 * Build YouTube thumbnail URL
 */
export function getThumbnailUrl(videoId, quality = 'maxresdefault') {
  const qualities = [
    'maxresdefault', // 1280x720
    'sddefault',     // 640x480
    'hqdefault',     // 480x360
    'mqdefault',     // 320x180
    'default',       // 120x90
  ];

  // If quality not in list, default to hqdefault
  const thumbQuality = qualities.includes(quality) ? quality : 'hqdefault';

  return `https://img.youtube.com/vi/${videoId}/${thumbQuality}.jpg`;
}

/**
 * Parse YouTube duration (ISO 8601) to seconds
 */
export function parseDuration(duration) {
  if (!duration) return 0;

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format seconds to human-readable duration
 */
export function formatDuration(seconds) {
  if (!seconds || seconds === 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Detect if video is a YouTube Short
 */
export function isYouTubeShort(duration) {
  return duration <= 60;
}

export default {
  extractVideoId,
  validateYouTubeUrl,
  buildYouTubeUrl,
  getThumbnailUrl,
  parseDuration,
  formatDuration,
  isYouTubeShort,
};