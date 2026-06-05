// ============================================
// YouTube Data Types
// ============================================

/**
 * YouTube URL parsing result
 */
export interface ParsedYouTubeURL {
  videoId: string;
  urlType: 'video' | 'playlist' | 'channel' | 'short' | 'unknown';
  isValid: boolean;
  error?: string;
}

/**
 * YouTube video details
 */
export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: YouTubeThumbnail;
    medium: YouTubeThumbnail;
    high: YouTubeThumbnail;
    standard?: YouTubeThumbnail;
    maxres?: YouTubeThumbnail;
  };
  channelId: string;
  channelTitle: string;
  channelThumbnail?: string;
  publishedAt: string;
  duration: number; // In seconds
  durationFormatted: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  categoryId: string;
  tags: string[];
  liveBroadcastContent: string;
  isShort: boolean;
  hasCaptions: boolean;
  definition: string;
  dimension: string;
  embedHtml?: string;
}

/**
 * YouTube thumbnail
 */
export interface YouTubeThumbnail {
  url: string;
  width: number;
  height: number;
}

/**
 * YouTube API response for videos
 */
export interface YouTubeAPIResponse {
  kind: string;
  etag: string;
  items: YouTubeAPIItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
}

/**
 * YouTube API video item
 */
export interface YouTubeAPIItem {
  kind: string;
  etag: string;
  id: string;
  snippet: {
    publishedAt: string;
    channelId: string;
    title: string;
    description: string;
    thumbnails: {
      default: YouTubeThumbnail;
      medium: YouTubeThumbnail;
      high: YouTubeThumbnail;
      standard?: YouTubeThumbnail;
      maxres?: YouTubeThumbnail;
    };
    channelTitle: string;
    tags: string[];
    categoryId: string;
    liveBroadcastContent: string;
    defaultLanguage: string;
    localized: {
      title: string;
      description: string;
    };
    defaultAudioLanguage: string;
  };
  contentDetails: {
    duration: string;
    dimension: string;
    definition: string;
    caption: string;
    licensedContent: boolean;
    contentRating: Record<string, unknown>;
    projection: string;
    hasCustomThumbnail: boolean;
  };
  statistics: {
    viewCount: string;
    likeCount: string;
    favoriteCount: string;
    commentCount: string;
  };
}

/**
 * YouTube API error
 */
export interface YouTubeAPIError {
  error: {
    code: number;
    message: string;
    errors: Array<{
      message: string;
      domain: string;
      reason: string;
      location: string;
      locationType: string;
    }>;
    status: string;
  };
}

/**
 * YouTube channel details
 */
export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  publishedAt: string;
  country: string;
}

/**
 * Cached video data
 */
export interface CachedVideo {
  videoId: string;
  data: YouTubeVideo;
  cachedAt: number;
  ttl: number;
}

/**
 * Video URL input validation result
 */
export interface URLValidationResult {
  isValid: boolean;
  videoId?: string;
  urlType?: 'video' | 'playlist' | 'channel' | 'short';
  error?: string;
  suggestions?: string[];
}