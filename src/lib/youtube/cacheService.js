import { supabase } from '@/lib/supabase/client';

/**
 * Supabase caching service for YouTube data
 * Provides persistent caching to reduce API calls
 */

const TABLE_NAME = 'youtube_cache';
const DEFAULT_TTL = parseInt(import.meta.env.VITE_YOUTUBE_CACHE_TTL) || 3600;

/**
 * Get cached video from Supabase
 */
export async function getCachedVideo(videoId) {
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('video_id', videoId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw error;
    }

    // Check if cache is still valid
    if (data && isCacheValid(data.cached_at, data.ttl)) {
      return data.video_data;
    }

    // Cache expired, delete it
    if (data) {
      await deleteCachedVideo(videoId);
    }

    return null;
  } catch (error) {
    console.error('Error getting cached video:', error);
    return null;
  }
}

/**
 * Cache video data in Supabase
 */
export async function cacheVideo(videoId, videoData, ttl = DEFAULT_TTL) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .upsert({
        video_id: videoId,
        video_data: videoData,
        cached_at: new Date().toISOString(),
        ttl,
      }, {
        onConflict: 'video_id',
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error caching video:', error);
  }
}

/**
 * Delete cached video from Supabase
 */
export async function deleteCachedVideo(videoId) {
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('video_id', videoId);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting cached video:', error);
  }
}

/**
 * Clean expired cache entries
 */
export async function cleanExpiredCache() {
  try {
    const expiryTime = new Date(Date.now() - DEFAULT_TTL * 1000).toISOString();
    
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .lt('cached_at', expiryTime);

    if (error) throw error;
  } catch (error) {
    console.error('Error cleaning cache:', error);
  }
}

/**
 * Check if cache is still valid
 */
function isCacheValid(cachedAt, ttl) {
  if (!cachedAt) return false;
  
  const cacheTime = new Date(cachedAt).getTime();
  const now = Date.now();
  const ttlMs = (ttl || DEFAULT_TTL) * 1000;
  
  return (now - cacheTime) < ttlMs;
}

export default {
  getCachedVideo,
  cacheVideo,
  deleteCachedVideo,
  cleanExpiredCache,
};