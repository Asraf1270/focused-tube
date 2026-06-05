-- ============================================
-- BOOKMARK SYSTEM
-- ============================================

-- ============================================
-- BOOKMARKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Bookmark details
  timestamp_seconds INTEGER NOT NULL,
  label TEXT,
  description TEXT,
  
  -- Visual customization
  color_hex TEXT NOT NULL DEFAULT '#FFD700',
  icon TEXT DEFAULT '🔖',
  
  -- Organization
  category TEXT,
  tags TEXT[],
  
  -- Screenshot capture
  snapshot_url TEXT,
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, video_id, timestamp_seconds),
  CONSTRAINT valid_timestamp CHECK (timestamp_seconds >= 0),
  CONSTRAINT valid_label CHECK (label IS NULL OR char_length(label) BETWEEN 1 AND 200)
);

-- ============================================
-- BOOKMARK_COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookmark_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT DEFAULT '#3EA6FF',
  icon TEXT DEFAULT '📁',
  
  bookmark_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, name),
  CONSTRAINT valid_name CHECK (char_length(name) BETWEEN 1 AND 100)
);

-- ============================================
-- BOOKMARK_COLLECTION_ITEMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookmark_collection_items (
  bookmark_id UUID NOT NULL REFERENCES bookmarks(id) ON DELETE CASCADE,
  collection_id UUID NOT NULL REFERENCES bookmark_collections(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (bookmark_id, collection_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_video ON bookmarks(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_timestamp ON bookmarks(video_id, timestamp_seconds);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(user_id, category) WHERE category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookmark_collections_user ON bookmark_collections(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Create bookmark
CREATE OR REPLACE FUNCTION create_bookmark(
  p_video_id UUID,
  p_timestamp_seconds INTEGER,
  p_label TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_color_hex TEXT DEFAULT '#FFD700',
  p_icon TEXT DEFAULT '🔖',
  p_category TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_snapshot_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_bookmark_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO bookmarks (
    user_id, video_id, timestamp_seconds, label, description,
    color_hex, icon, category, tags, snapshot_url
  ) VALUES (
    v_user_id, p_video_id, p_timestamp_seconds, p_label, p_description,
    p_color_hex, p_icon, p_category, p_tags, p_snapshot_url
  )
  ON CONFLICT (user_id, video_id, timestamp_seconds) 
  DO UPDATE SET
    label = COALESCE(p_label, bookmarks.label),
    description = COALESCE(p_description, bookmarks.description),
    updated_at = NOW()
  RETURNING id INTO v_bookmark_id;
  
  SELECT row_to_json(b.*)::jsonb INTO v_result
  FROM bookmarks b WHERE id = v_bookmark_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete bookmark
CREATE OR REPLACE FUNCTION delete_bookmark(p_bookmark_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  DELETE FROM bookmarks 
  WHERE id = p_bookmark_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Bookmark not found or access denied';
  END IF;
  
  RETURN jsonb_build_object('deleted', true, 'bookmark_id', p_bookmark_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get video bookmarks
CREATE OR REPLACE FUNCTION get_video_bookmarks(
  p_video_id UUID,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  timestamp_seconds INTEGER,
  label TEXT,
  description TEXT,
  color_hex TEXT,
  icon TEXT,
  category TEXT,
  tags TEXT[],
  snapshot_url TEXT,
  created_at TIMESTAMPTZ,
  formatted_time TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    b.id,
    b.timestamp_seconds,
    b.label,
    b.description,
    b.color_hex,
    b.icon,
    b.category,
    b.tags,
    b.snapshot_url,
    b.created_at,
    format_timestamp(b.timestamp_seconds) AS formatted_time
  FROM bookmarks b
  WHERE b.user_id = v_user_id
    AND b.video_id = p_video_id
    AND (p_category IS NULL OR b.category = p_category)
  ORDER BY b.timestamp_seconds ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Quick bookmark (one-click with current time)
CREATE OR REPLACE FUNCTION quick_bookmark(
  p_video_id UUID,
  p_timestamp_seconds INTEGER
)
RETURNS JSONB AS $$
BEGIN
  RETURN create_bookmark(
    p_video_id := p_video_id,
    p_timestamp_seconds := p_timestamp_seconds,
    p_label := format_timestamp(p_timestamp_seconds),
    p_color_hex := '#FFD700',
    p_icon := '🔖'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Format seconds to HH:MM:SS or MM:SS
CREATE OR REPLACE FUNCTION format_timestamp(seconds INTEGER)
RETURNS TEXT AS $$
DECLARE
  h INTEGER;
  m INTEGER;
  s INTEGER;
BEGIN
  h := seconds / 3600;
  m := (seconds % 3600) / 60;
  s := seconds % 60;
  
  IF h > 0 THEN
    RETURN h || ':' || LPAD(m::TEXT, 2, '0') || ':' || LPAD(s::TEXT, 2, '0');
  ELSE
    RETURN m || ':' || LPAD(s::TEXT, 2, '0');
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Get bookmarks across all videos
CREATE OR REPLACE FUNCTION get_all_bookmarks(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  video_title TEXT,
  video_thumbnail TEXT,
  channel_name TEXT,
  timestamp_seconds INTEGER,
  formatted_time TEXT,
  label TEXT,
  description TEXT,
  color_hex TEXT,
  icon TEXT,
  category TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  total_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    b.id,
    b.video_id,
    v.title AS video_title,
    v.thumbnail_url AS video_thumbnail,
    v.channel_name,
    b.timestamp_seconds,
    format_timestamp(b.timestamp_seconds) AS formatted_time,
    b.label,
    b.description,
    b.color_hex,
    b.icon,
    b.category,
    b.tags,
    b.created_at,
    COUNT(*) OVER() AS total_count
  FROM bookmarks b
  INNER JOIN videos v ON v.id = b.video_id
  WHERE b.user_id = v_user_id
    AND (p_category IS NULL OR b.category = p_category)
    AND (
      p_search IS NULL 
      OR b.label ILIKE '%' || p_search || '%'
      OR b.description ILIKE '%' || p_search || '%'
    )
  ORDER BY b.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON bookmarks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON bookmark_collections TO authenticated;
GRANT SELECT, INSERT, DELETE ON bookmark_collection_items TO authenticated;