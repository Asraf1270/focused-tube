-- ============================================
-- CONTINUE WATCHING SYSTEM
-- ============================================

-- ============================================
-- FUNCTION: Get in-progress videos
-- ============================================
CREATE OR REPLACE FUNCTION get_continue_watching(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  video_id UUID,
  youtube_id TEXT,
  title TEXT,
  channel_name TEXT,
  channel_id TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  category TEXT,
  progress_seconds INTEGER,
  last_position_seconds INTEGER,
  watch_count INTEGER,
  total_watch_time_seconds INTEGER,
  status watch_status,
  completion_percentage DECIMAL(5,2),
  last_watched_at TIMESTAMPTZ,
  first_watched_at TIMESTAMPTZ,
  is_favorite BOOLEAN,
  is_bookmarked BOOLEAN,
  personal_tags TEXT[],
  resume_position INTEGER,
  total_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    v.id AS video_id,
    v.youtube_id,
    v.title,
    v.channel_name,
    v.channel_id,
    v.thumbnail_url,
    v.duration_seconds,
    v.category,
    uv.progress_seconds,
    uv.last_position_seconds,
    uv.watch_count,
    uv.total_watch_time_seconds,
    uv.status,
    CASE 
      WHEN v.duration_seconds > 0 
      THEN ROUND((uv.progress_seconds::DECIMAL / v.duration_seconds::DECIMAL) * 100, 2)
      ELSE 0
    END AS completion_percentage,
    uv.last_watched_at,
    uv.first_watched_at,
    uv.is_favorite,
    uv.is_bookmarked,
    uv.personal_tags,
    uv.last_position_seconds AS resume_position,
    COUNT(*) OVER() AS total_count
  FROM user_videos uv
  INNER JOIN videos v ON v.id = uv.video_id
  WHERE uv.user_id = v_user_id
    AND uv.status = 'in_progress'
    AND uv.last_position_seconds > 0
    AND v.duration_seconds > 0
  ORDER BY uv.last_watched_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get recently watched (including completed)
-- ============================================
CREATE OR REPLACE FUNCTION get_recently_watched(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_include_completed BOOLEAN DEFAULT false
)
RETURNS TABLE (
  video_id UUID,
  youtube_id TEXT,
  title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  progress_seconds INTEGER,
  last_position_seconds INTEGER,
  status watch_status,
  completion_percentage DECIMAL(5,2),
  last_watched_at TIMESTAMPTZ,
  is_favorite BOOLEAN,
  total_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    v.id AS video_id,
    v.youtube_id,
    v.title,
    v.channel_name,
    v.thumbnail_url,
    v.duration_seconds,
    uv.progress_seconds,
    uv.last_position_seconds,
    uv.status,
    CASE 
      WHEN v.duration_seconds > 0 
      THEN ROUND((uv.progress_seconds::DECIMAL / v.duration_seconds::DECIMAL) * 100, 2)
      ELSE 0
    END AS completion_percentage,
    uv.last_watched_at,
    uv.is_favorite,
    COUNT(*) OVER() AS total_count
  FROM user_videos uv
  INNER JOIN videos v ON v.id = uv.video_id
  WHERE uv.user_id = v_user_id
    AND uv.last_watched_at IS NOT NULL
    AND (
      p_include_completed 
      OR uv.status = 'in_progress'
    )
  ORDER BY uv.last_watched_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get continue watching stats
-- ============================================
CREATE OR REPLACE FUNCTION get_continue_watching_stats()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  SELECT jsonb_build_object(
    'total_in_progress', COUNT(*),
    'total_watch_time_hours', ROUND(SUM(uv.total_watch_time_seconds) / 3600.0, 1),
    'average_completion', ROUND(AVG(
      CASE WHEN v.duration_seconds > 0 
        THEN (uv.progress_seconds::DECIMAL / v.duration_seconds::DECIMAL) * 100 
        ELSE 0 END
    ), 1),
    'videos_this_week', COUNT(*) FILTER (WHERE uv.last_watched_at >= NOW() - INTERVAL '7 days'),
    'oldest_in_progress_days', EXTRACT(DAY FROM NOW() - MIN(uv.first_watched_at))::INTEGER,
    'most_watched_video', (
      SELECT jsonb_build_object(
        'title', v2.title,
        'watch_count', uv2.watch_count
      )
      FROM user_videos uv2
      INNER JOIN videos v2 ON v2.id = uv2.video_id
      WHERE uv2.user_id = v_user_id 
        AND uv2.status = 'in_progress'
      ORDER BY uv2.watch_count DESC
      LIMIT 1
    ),
    'by_category', (
      SELECT COALESCE(jsonb_object_agg(COALESCE(v3.category, 'Uncategorized'), cat_count), '{}'::jsonb)
      FROM (
        SELECT v3.category, COUNT(*) AS cat_count
        FROM user_videos uv3
        INNER JOIN videos v3 ON v3.id = uv3.video_id
        WHERE uv3.user_id = v_user_id AND uv3.status = 'in_progress'
        GROUP BY v3.category
      ) sub
    )
  ) INTO v_result
  FROM user_videos uv
  INNER JOIN videos v ON v.id = uv.video_id
  WHERE uv.user_id = v_user_id
    AND uv.status = 'in_progress'
    AND uv.last_position_seconds > 0;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- FUNCTION: Remove from continue watching
-- ============================================
CREATE OR REPLACE FUNCTION remove_from_continue_watching(p_video_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  UPDATE user_videos
  SET status = 'watch_later',
      updated_at = NOW()
  WHERE user_id = v_user_id 
    AND video_id = p_video_id
    AND status = 'in_progress';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Video not found in continue watching';
  END IF;
  
  RETURN jsonb_build_object(
    'removed', true,
    'video_id', p_video_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_videos_continue_watching 
  ON user_videos(user_id, status, last_watched_at DESC) 
  WHERE status = 'in_progress' AND last_position_seconds > 0;

CREATE INDEX IF NOT EXISTS idx_user_videos_last_watched 
  ON user_videos(user_id, last_watched_at DESC) 
  WHERE last_watched_at IS NOT NULL;