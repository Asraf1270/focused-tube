-- ============================================
-- YouTube Cache Table (for reducing API calls)
-- ============================================
CREATE TABLE IF NOT EXISTS youtube_cache (
  video_id TEXT PRIMARY KEY,
  video_data JSONB NOT NULL,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ttl INTEGER NOT NULL DEFAULT 3600, -- 1 hour in seconds
  access_count INTEGER DEFAULT 1,
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for cleaning expired cache
CREATE INDEX idx_youtube_cache_cached_at ON youtube_cache(cached_at);

-- ============================================
-- Function to clean expired cache
-- ============================================
CREATE OR REPLACE FUNCTION clean_expired_youtube_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM youtube_cache 
  WHERE cached_at < NOW() - (ttl || ' seconds')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Function to upsert video data
-- ============================================
CREATE OR REPLACE FUNCTION upsert_video(
  p_youtube_id TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT '',
  p_thumbnail_url TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_channel_name TEXT DEFAULT 'Unknown Channel',
  p_channel_id TEXT DEFAULT '',
  p_channel_thumbnail_url TEXT DEFAULT NULL,
  p_published_at TIMESTAMPTZ DEFAULT NULL,
  p_view_count BIGINT DEFAULT 0,
  p_like_count BIGINT DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_language TEXT DEFAULT 'en',
  p_is_short BOOLEAN DEFAULT false,
  p_has_captions BOOLEAN DEFAULT false,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_video_id UUID;
BEGIN
  -- Insert or update video
  INSERT INTO videos (
    youtube_id, title, description, thumbnail_url, duration_seconds,
    channel_name, channel_id, channel_thumbnail_url,
    published_at, view_count, like_count,
    category, tags, language, is_short, has_captions, metadata
  ) VALUES (
    p_youtube_id, p_title, p_description, p_thumbnail_url, p_duration_seconds,
    p_channel_name, p_channel_id, p_channel_thumbnail_url,
    p_published_at, p_view_count, p_like_count,
    p_category, p_tags, p_language, p_is_short, p_has_captions, p_metadata
  )
  ON CONFLICT (youtube_id) 
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    thumbnail_url = EXCLUDED.thumbnail_url,
    duration_seconds = EXCLUDED.duration_seconds,
    channel_name = EXCLUDED.channel_name,
    channel_id = EXCLUDED.channel_id,
    channel_thumbnail_url = EXCLUDED.channel_thumbnail_url,
    view_count = EXCLUDED.view_count,
    like_count = EXCLUDED.like_count,
    category = EXCLUDED.category,
    tags = EXCLUDED.tags,
    updated_at = NOW()
  RETURNING id INTO v_video_id;
  
  RETURN v_video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Function to add video to user's library
-- ============================================
CREATE OR REPLACE FUNCTION add_video_to_library(
  p_youtube_id TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT '',
  p_thumbnail_url TEXT DEFAULT NULL,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_channel_name TEXT DEFAULT 'Unknown Channel',
  p_channel_id TEXT DEFAULT '',
  p_channel_thumbnail_url TEXT DEFAULT NULL,
  p_published_at TIMESTAMPTZ DEFAULT NULL,
  p_view_count BIGINT DEFAULT 0,
  p_like_count BIGINT DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_language TEXT DEFAULT 'en',
  p_is_short BOOLEAN DEFAULT false,
  p_has_captions BOOLEAN DEFAULT false,
  p_status watch_status DEFAULT 'watch_later',
  p_personal_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_video_id UUID;
  v_user_video_id UUID;
  v_result JSONB;
BEGIN
  -- Upsert video
  SELECT upsert_video(
    p_youtube_id, p_title, p_description, p_thumbnail_url,
    p_duration_seconds, p_channel_name, p_channel_id,
    p_channel_thumbnail_url, p_published_at, p_view_count,
    p_like_count, p_category, p_tags, p_language,
    p_is_short, p_has_captions, p_metadata
  ) INTO v_video_id;
  
  -- Add to user's library
  INSERT INTO user_videos (
    user_id, video_id, status, personal_tags
  ) VALUES (
    auth.uid(), v_video_id, p_status, p_personal_tags
  )
  ON CONFLICT (user_id, video_id) 
  DO UPDATE SET
    status = CASE 
      WHEN user_videos.status = 'completed' THEN user_videos.status
      ELSE EXCLUDED.status 
    END,
    personal_tags = EXCLUDED.personal_tags,
    updated_at = NOW()
  RETURNING id INTO v_user_video_id;
  
  -- Build result
  SELECT jsonb_build_object(
    'video_id', v_video_id,
    'user_video_id', v_user_video_id,
    'youtube_id', p_youtube_id,
    'title', p_title
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;