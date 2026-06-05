-- ============================================
-- FAVORITES SYSTEM ENHANCEMENT
-- ============================================

-- ============================================
-- ADD FAVORITES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Favorite metadata
  favorited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sort_order INTEGER DEFAULT 0,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, video_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id, favorited_at DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_video ON favorites(video_id);
CREATE INDEX IF NOT EXISTS idx_favorites_sort ON favorites(user_id, sort_order);

-- ============================================
-- UPDATE USER_VIDEOS TABLE
-- ============================================
ALTER TABLE user_videos 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;

-- ============================================
-- FUNCTIONS
-- ============================================

-- Toggle favorite status
CREATE OR REPLACE FUNCTION toggle_favorite(p_video_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_is_favorite BOOLEAN;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Check if already favorited
  SELECT EXISTS(
    SELECT 1 FROM favorites 
    WHERE user_id = v_user_id AND video_id = p_video_id
  ) INTO v_is_favorite;
  
  IF v_is_favorite THEN
    -- Remove from favorites
    DELETE FROM favorites 
    WHERE user_id = v_user_id AND video_id = p_video_id;
    
    UPDATE user_videos 
    SET is_favorite = false, updated_at = NOW()
    WHERE user_id = v_user_id AND video_id = p_video_id;
    
    v_result := jsonb_build_object(
      'favorited', false,
      'video_id', p_video_id,
      'action', 'removed'
    );
  ELSE
    -- Add to favorites
    INSERT INTO favorites (user_id, video_id)
    VALUES (v_user_id, p_video_id)
    ON CONFLICT (user_id, video_id) DO NOTHING;
    
    -- Ensure user_videos record exists
    INSERT INTO user_videos (user_id, video_id, is_favorite, status)
    VALUES (v_user_id, p_video_id, true, 'watch_later')
    ON CONFLICT (user_id, video_id) 
    DO UPDATE SET is_favorite = true, updated_at = NOW();
    
    v_result := jsonb_build_object(
      'favorited', true,
      'video_id', p_video_id,
      'action', 'added'
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get favorites with video details
CREATE OR REPLACE FUNCTION get_favorites(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_sort_by TEXT DEFAULT 'recent',
  p_category_id UUID DEFAULT NULL,
  p_search_query TEXT DEFAULT NULL
)
RETURNS TABLE (
  favorite_id UUID,
  video_id UUID,
  youtube_id TEXT,
  title TEXT,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  channel_name TEXT,
  channel_id TEXT,
  view_count BIGINT,
  published_at TIMESTAMPTZ,
  category TEXT,
  tags TEXT[],
  favorited_at TIMESTAMPTZ,
  sort_order INTEGER,
  notes TEXT,
  watch_status watch_status,
  progress_seconds INTEGER,
  total_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  WITH filtered_favorites AS (
    SELECT 
      f.id AS fav_id,
      f.video_id,
      f.favorited_at,
      f.sort_order,
      f.notes AS fav_notes,
      v.youtube_id,
      v.title,
      v.description,
      v.thumbnail_url,
      v.duration_seconds,
      v.channel_name,
      v.channel_id,
      v.view_count,
      v.published_at,
      v.category,
      v.tags,
      uv.status AS watch_status,
      uv.progress_seconds,
      COUNT(*) OVER() AS total_count
    FROM favorites f
    INNER JOIN videos v ON v.id = f.video_id
    LEFT JOIN user_videos uv ON uv.video_id = f.video_id AND uv.user_id = v_user_id
    WHERE f.user_id = v_user_id
      AND (
        p_category_id IS NULL 
        OR EXISTS (
          SELECT 1 FROM video_categories vc 
          WHERE vc.video_id = f.video_id 
          AND vc.category_id = p_category_id
        )
      )
      AND (
        p_search_query IS NULL 
        OR v.title ILIKE '%' || p_search_query || '%'
        OR v.description ILIKE '%' || p_search_query || '%'
        OR v.channel_name ILIKE '%' || p_search_query || '%'
      )
  )
  SELECT 
    ff.fav_id,
    ff.video_id,
    ff.youtube_id,
    ff.title,
    ff.description,
    ff.thumbnail_url,
    ff.duration_seconds,
    ff.channel_name,
    ff.channel_id,
    ff.view_count,
    ff.published_at,
    ff.category,
    ff.tags,
    ff.favorited_at,
    ff.sort_order,
    ff.fav_notes,
    ff.watch_status,
    ff.progress_seconds,
    ff.total_count
  FROM filtered_favorites ff
  ORDER BY 
    CASE WHEN p_sort_by = 'recent' THEN ff.favorited_at END DESC,
    CASE WHEN p_sort_by = 'oldest' THEN ff.favorited_at END ASC,
    CASE WHEN p_sort_by = 'title' THEN ff.title END ASC,
    CASE WHEN p_sort_by = 'channel' THEN ff.channel_name END ASC,
    CASE WHEN p_sort_by = 'duration' THEN ff.duration_seconds END ASC,
    CASE WHEN p_sort_by = 'custom' THEN ff.sort_order END ASC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bulk add to favorites
CREATE OR REPLACE FUNCTION bulk_add_favorites(p_video_ids UUID[])
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_added_count INTEGER := 0;
  v_skipped_count INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  
  -- Insert favorites
  WITH inserted AS (
    INSERT INTO favorites (user_id, video_id)
    SELECT v_user_id, unnest(p_video_ids)
    ON CONFLICT (user_id, video_id) DO NOTHING
    RETURNING video_id
  )
  SELECT COUNT(*) INTO v_added_count FROM inserted;
  
  -- Update user_videos
  UPDATE user_videos
  SET is_favorite = true, updated_at = NOW()
  WHERE user_id = v_user_id 
    AND video_id = ANY(p_video_ids);
  
  v_skipped_count := array_length(p_video_ids, 1) - v_added_count;
  
  RETURN jsonb_build_object(
    'added', v_added_count,
    'skipped', v_skipped_count,
    'total', array_length(p_video_ids, 1)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get favorite stats
CREATE OR REPLACE FUNCTION get_favorite_stats()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_total_favorites INTEGER;
  v_this_week INTEGER;
  v_this_month INTEGER;
  v_by_category JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Total favorites
  SELECT COUNT(*) INTO v_total_favorites
  FROM favorites WHERE user_id = v_user_id;
  
  -- Favorites this week
  SELECT COUNT(*) INTO v_this_week
  FROM favorites 
  WHERE user_id = v_user_id 
    AND favorited_at >= NOW() - INTERVAL '7 days';
  
  -- Favorites this month
  SELECT COUNT(*) INTO v_this_month
  FROM favorites 
  WHERE user_id = v_user_id 
    AND favorited_at >= NOW() - INTERVAL '30 days';
  
  -- By category
  SELECT COALESCE(
    jsonb_object_agg(COALESCE(c.name, 'Uncategorized'), cat_count),
    '{}'::jsonb
  ) INTO v_by_category
  FROM (
    SELECT 
      c.name,
      COUNT(DISTINCT f.video_id) AS cat_count
    FROM favorites f
    LEFT JOIN video_categories vc ON vc.video_id = f.video_id AND vc.user_id = v_user_id
    LEFT JOIN categories c ON c.id = vc.category_id
    WHERE f.user_id = v_user_id
    GROUP BY c.name
  ) sub;
  
  RETURN jsonb_build_object(
    'total', v_total_favorites,
    'this_week', v_this_week,
    'this_month', v_this_month,
    'by_category', v_by_category
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, DELETE ON favorites TO authenticated;