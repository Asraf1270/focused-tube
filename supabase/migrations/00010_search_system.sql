-- ============================================
-- HIGH-PERFORMANCE SEARCH SYSTEM
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================
-- SEARCH MATERIALIZED VIEW
-- ============================================
CREATE MATERIALIZED VIEW IF NOT EXISTS search_index AS
SELECT 
  v.id AS video_id,
  v.youtube_id,
  v.title,
  v.description,
  v.channel_name,
  v.channel_id,
  v.thumbnail_url,
  v.duration_seconds,
  v.category AS youtube_category,
  v.tags,
  v.published_at,
  v.view_count,
  uv.user_id,
  uv.status,
  uv.progress_seconds,
  uv.is_favorite,
  uv.is_bookmarked,
  uv.is_liked,
  uv.personal_tags,
  string_agg(DISTINCT c.name, ' ') AS category_names,
  string_agg(DISTINCT c.emoji, ' ') AS category_emojis,
  -- Combined search text
  setweight(to_tsvector('english', COALESCE(v.title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(v.channel_name, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(v.description, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(string_agg(DISTINCT c.name, ' '), '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(v.tags, ' '), '')), 'B') AS search_vector
FROM videos v
INNER JOIN user_videos uv ON uv.video_id = v.id
LEFT JOIN video_categories vc ON vc.video_id = v.id AND vc.user_id = uv.user_id
LEFT JOIN categories c ON c.id = vc.category_id
GROUP BY 
  v.id, v.youtube_id, v.title, v.description, v.channel_name, v.channel_id,
  v.thumbnail_url, v.duration_seconds, v.category, v.tags, v.published_at, v.view_count,
  uv.user_id, uv.status, uv.progress_seconds, uv.is_favorite, uv.is_bookmarked, uv.is_liked, uv.personal_tags;

-- ============================================
-- SEARCH INDEXES
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_search_index_video_user 
  ON search_index(video_id, user_id);
CREATE INDEX IF NOT EXISTS idx_search_index_search_vector 
  ON search_index USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_search_index_title_trgm 
  ON search_index USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_index_channel_trgm 
  ON search_index USING gin(channel_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_search_index_user 
  ON search_index(user_id);
CREATE INDEX IF NOT EXISTS idx_search_index_title 
  ON search_index USING btree(title);
CREATE INDEX IF NOT EXISTS idx_search_index_channel 
  ON search_index USING btree(channel_name);

-- ============================================
-- REFRESH MATERIALIZED VIEW FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION refresh_search_index()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_index;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SEARCH FUNCTIONS
-- ============================================

-- Full-text search with ranking
CREATE OR REPLACE FUNCTION search_videos(
  p_query TEXT,
  p_status watch_status DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_is_favorite BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  video_id UUID,
  youtube_id TEXT,
  title TEXT,
  description TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  youtube_category TEXT,
  tags TEXT[],
  published_at TIMESTAMPTZ,
  view_count BIGINT,
  status watch_status,
  progress_seconds INTEGER,
  is_favorite BOOLEAN,
  is_bookmarked BOOLEAN,
  is_liked BOOLEAN,
  personal_tags TEXT[],
  category_names TEXT,
  rank REAL,
  similarity REAL,
  total_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
  v_ts_query tsquery;
BEGIN
  v_user_id := auth.uid();
  
  -- Clean and prepare query
  v_ts_query := plainto_tsquery('english', p_query);
  
  RETURN QUERY
  SELECT 
    si.video_id,
    si.youtube_id,
    si.title,
    si.description,
    si.channel_name,
    si.thumbnail_url,
    si.duration_seconds,
    si.youtube_category,
    si.tags,
    si.published_at,
    si.view_count,
    si.status,
    si.progress_seconds,
    si.is_favorite,
    si.is_bookmarked,
    si.is_liked,
    si.personal_tags,
    si.category_names,
    ts_rank(si.search_vector, v_ts_query) AS rank,
    GREATEST(
      similarity(si.title, p_query),
      similarity(si.channel_name, p_query)
    ) AS similarity,
    COUNT(*) OVER() AS total_count
  FROM search_index si
  WHERE si.user_id = v_user_id
    AND (
      -- Full-text search
      si.search_vector @@ v_ts_query
      -- Trigram similarity search for partial matches
      OR similarity(si.title, p_query) > 0.1
      OR similarity(si.channel_name, p_query) > 0.1
      -- Exact/partial match on title
      OR si.title ILIKE '%' || p_query || '%'
      OR si.channel_name ILIKE '%' || p_query || '%'
    )
    AND (p_status IS NULL OR si.status = p_status)
    AND (p_category IS NULL OR si.category_names ILIKE '%' || p_category || '%')
    AND (p_is_favorite IS NULL OR si.is_favorite = p_is_favorite)
  ORDER BY 
    CASE 
      WHEN si.title ILIKE p_query || '%' THEN 0  -- Starts with exact match
      WHEN si.title ILIKE '%' || p_query || '%' THEN 1  -- Contains match
      WHEN similarity(si.title, p_query) > 0.3 THEN 2  -- High similarity
      ELSE 3  -- Other matches
    END,
    rank DESC,
    similarity DESC,
    si.published_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Quick search (lightweight, for autocomplete)
CREATE OR REPLACE FUNCTION quick_search(
  p_query TEXT,
  p_limit INTEGER DEFAULT 8
)
RETURNS TABLE (
  video_id UUID,
  youtube_id TEXT,
  title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  type TEXT,
  relevance TEXT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    si.video_id,
    si.youtube_id,
    si.title,
    si.channel_name,
    si.thumbnail_url,
    'video'::TEXT AS type,
    CASE 
      WHEN si.title ILIKE p_query || '%' THEN 'exact_title'
      WHEN si.channel_name ILIKE p_query || '%' THEN 'exact_channel'
      WHEN similarity(si.title, p_query) > 0.4 THEN 'similar_title'
      ELSE 'contains'
    END AS relevance
  FROM search_index si
  WHERE si.user_id = v_user_id
    AND (
      si.title ILIKE p_query || '%'
      OR si.channel_name ILIKE p_query || '%'
      OR similarity(si.title, p_query) > 0.2
      OR si.title ILIKE '%' || p_query || '%'
    )
  ORDER BY 
    CASE 
      WHEN si.title ILIKE p_query || '%' THEN 0
      WHEN si.channel_name ILIKE p_query || '%' THEN 1
      WHEN similarity(si.title, p_query) > 0.4 THEN 2
      ELSE 3
    END,
    si.published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Search suggestions (autocomplete)
CREATE OR REPLACE FUNCTION get_search_suggestions(
  p_query TEXT,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  suggestion TEXT,
  type TEXT,
  count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  -- Title suggestions
  SELECT DISTINCT si.title AS suggestion, 'title'::TEXT AS type, COUNT(*) OVER() AS count
  FROM search_index si
  WHERE si.user_id = v_user_id
    AND si.title ILIKE '%' || p_query || '%'
  LIMIT p_limit
  
  UNION ALL
  
  -- Channel suggestions
  SELECT DISTINCT si.channel_name AS suggestion, 'channel'::TEXT AS type, COUNT(*) OVER() AS count
  FROM search_index si
  WHERE si.user_id = v_user_id
    AND si.channel_name ILIKE '%' || p_query || '%'
    AND si.channel_name NOT IN (
      SELECT si2.title FROM search_index si2 
      WHERE si2.user_id = v_user_id AND si2.title ILIKE '%' || p_query || '%'
      LIMIT p_limit
    )
  LIMIT p_limit
  
  -- Category suggestions
  UNION ALL
  
  SELECT DISTINCT TRIM(unnest(string_to_array(si.category_names, ' '))) AS suggestion, 
         'category'::TEXT AS type, COUNT(*) OVER() AS count
  FROM search_index si
  WHERE si.user_id = v_user_id
    AND si.category_names ILIKE '%' || p_query || '%'
    AND TRIM(unnest(string_to_array(si.category_names, ' '))) NOT IN (
      SELECT si2.title FROM search_index si2 
      WHERE si2.user_id = v_user_id AND si2.title ILIKE '%' || p_query || '%'
      LIMIT p_limit
    )
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- TRIGGER TO REFRESH SEARCH INDEX
-- ============================================
CREATE OR REPLACE FUNCTION trigger_refresh_search_index()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh every 50 changes or every 5 minutes (handled by application)
  PERFORM refresh_search_index();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT ON search_index TO authenticated;