-- ============================================
-- ENHANCED NOTE-TAKING SYSTEM
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
DO $$ BEGIN
  CREATE TYPE note_type AS ENUM (
    'general',
    'timestamp',
    'summary',
    'question',
    'action_item',
    'key_concept',
    'code_snippet',
    'resource_link'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE note_format AS ENUM (
    'plain',
    'markdown',
    'rich_text'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- NOTES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  
  -- Note content
  type note_type NOT NULL DEFAULT 'general',
  format note_format NOT NULL DEFAULT 'plain',
  title TEXT,
  content TEXT NOT NULL,
  
  -- Timestamp association
  timestamp_seconds INTEGER,
  end_timestamp_seconds INTEGER,
  
  -- Learning metadata
  importance_rating INTEGER CHECK (importance_rating >= 1 AND importance_rating <= 5),
  comprehension_level INTEGER CHECK (comprehension_level >= 1 AND comprehension_level <= 3),
  review_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed_at TIMESTAMPTZ,
  
  -- Organization
  tags TEXT[],
  color_hex TEXT DEFAULT '#3EA6FF',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  
  -- Collaboration (future use)
  is_shared BOOLEAN NOT NULL DEFAULT false,
  
  -- Search
  search_vector tsvector,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_content CHECK (char_length(content) > 0),
  CONSTRAINT valid_title CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 200),
  CONSTRAINT valid_timestamp CHECK (
    (type != 'timestamp' AND timestamp_seconds IS NULL AND end_timestamp_seconds IS NULL) OR
    (type = 'timestamp' AND timestamp_seconds IS NOT NULL)
  ),
  CONSTRAINT valid_timestamp_range CHECK (
    end_timestamp_seconds IS NULL OR 
    end_timestamp_seconds > timestamp_seconds
  )
);

-- ============================================
-- NOTE_TAGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS note_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_hex TEXT DEFAULT '#3EA6FF',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, name),
  CONSTRAINT valid_tag_name CHECK (char_length(name) BETWEEN 1 AND 50)
);

-- ============================================
-- NOTE_REVISIONS TABLE (Version History)
-- ============================================
CREATE TABLE IF NOT EXISTS note_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  content TEXT NOT NULL,
  title TEXT,
  type note_type,
  format note_format,
  
  revision_number INTEGER NOT NULL,
  change_description TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(note_id, revision_number)
);

-- ============================================
-- INDEXES
-- ============================================

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_video ON notes(user_id, video_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_type ON notes(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notes_user_pinned ON notes(user_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_notes_user_importance ON notes(user_id, importance_rating) WHERE importance_rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notes_timestamp ON notes(video_id, timestamp_seconds) WHERE type = 'timestamp';
CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_playlist ON notes(playlist_id) WHERE playlist_id IS NOT NULL;

-- Full-text search
CREATE INDEX IF NOT EXISTS idx_notes_search ON notes USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_notes_title_trgm ON notes USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notes_content_trgm ON notes USING gin(content gin_trgm_ops);

-- Note tags indexes
CREATE INDEX IF NOT EXISTS idx_note_tags_user ON note_tags(user_id, usage_count DESC);

-- Note revisions indexes
CREATE INDEX IF NOT EXISTS idx_note_revisions_note ON note_revisions(note_id, revision_number DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update search vector for notes
CREATE OR REPLACE FUNCTION update_note_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_note_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content, tags ON notes
  FOR EACH ROW EXECUTE FUNCTION update_note_search_vector();

-- Create note with revision
CREATE OR REPLACE FUNCTION create_note(
  p_video_id UUID,
  p_content TEXT,
  p_type note_type DEFAULT 'general',
  p_format note_format DEFAULT 'plain',
  p_title TEXT DEFAULT NULL,
  p_timestamp_seconds INTEGER DEFAULT NULL,
  p_end_timestamp_seconds INTEGER DEFAULT NULL,
  p_importance_rating INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_color_hex TEXT DEFAULT '#3EA6FF',
  p_playlist_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_note_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Insert note
  INSERT INTO notes (
    user_id, video_id, playlist_id, type, format, title, content,
    timestamp_seconds, end_timestamp_seconds, importance_rating, tags, color_hex
  ) VALUES (
    v_user_id, p_video_id, p_playlist_id, p_type, p_format, p_title, p_content,
    p_timestamp_seconds, p_end_timestamp_seconds, p_importance_rating, p_tags, p_color_hex
  )
  RETURNING id INTO v_note_id;
  
  -- Create initial revision
  INSERT INTO note_revisions (note_id, user_id, content, title, type, format, revision_number)
  VALUES (v_note_id, v_user_id, p_content, p_title, p_type, p_format, 1);
  
  -- Update user_videos notes count
  UPDATE user_videos 
  SET private_notes_count = private_notes_count + 1, updated_at = NOW()
  WHERE user_id = v_user_id AND video_id = p_video_id;
  
  -- Update tags usage
  IF array_length(p_tags, 1) > 0 THEN
    INSERT INTO note_tags (user_id, name, color_hex, usage_count)
    SELECT v_user_id, unnest(p_tags), p_color_hex, 1
    ON CONFLICT (user_id, name) 
    DO UPDATE SET usage_count = note_tags.usage_count + 1;
  END IF;
  
  -- Return created note
  SELECT row_to_json(n.*)::jsonb INTO v_result
  FROM notes n WHERE id = v_note_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update note with revision tracking
CREATE OR REPLACE FUNCTION update_note(
  p_note_id UUID,
  p_content TEXT DEFAULT NULL,
  p_type note_type DEFAULT NULL,
  p_format note_format DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_timestamp_seconds INTEGER DEFAULT NULL,
  p_end_timestamp_seconds INTEGER DEFAULT NULL,
  p_importance_rating INTEGER DEFAULT NULL,
  p_comprehension_level INTEGER DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_color_hex TEXT DEFAULT NULL,
  p_is_pinned BOOLEAN DEFAULT NULL,
  p_change_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_old_content TEXT;
  v_revision_number INTEGER;
  v_result JSONB;
  v_content_changed BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM notes WHERE id = p_note_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Note not found or access denied';
  END IF;
  
  -- Get old content for revision
  SELECT content INTO v_old_content FROM notes WHERE id = p_note_id;
  
  -- Update note
  UPDATE notes SET
    content = COALESCE(p_content, content),
    type = COALESCE(p_type, type),
    format = COALESCE(p_format, format),
    title = COALESCE(p_title, title),
    timestamp_seconds = COALESCE(p_timestamp_seconds, timestamp_seconds),
    end_timestamp_seconds = COALESCE(p_end_timestamp_seconds, end_timestamp_seconds),
    importance_rating = COALESCE(p_importance_rating, importance_rating),
    comprehension_level = COALESCE(p_comprehension_level, comprehension_level),
    tags = COALESCE(p_tags, tags),
    color_hex = COALESCE(p_color_hex, color_hex),
    is_pinned = COALESCE(p_is_pinned, is_pinned),
    updated_at = NOW()
  WHERE id = p_note_id AND user_id = v_user_id;
  
  -- Check if content changed
  v_content_changed := p_content IS NOT NULL AND p_content != v_old_content;
  
  -- Create revision if content changed
  IF v_content_changed THEN
    SELECT COALESCE(MAX(revision_number), 0) + 1 INTO v_revision_number
    FROM note_revisions WHERE note_id = p_note_id;
    
    INSERT INTO note_revisions (
      note_id, user_id, content, title, type, format, 
      revision_number, change_description
    ) VALUES (
      p_note_id, v_user_id, p_content, p_title, p_type, p_format,
      v_revision_number, p_change_description
    );
  END IF;
  
  -- Return updated note
  SELECT row_to_json(n.*)::jsonb INTO v_result
  FROM notes n WHERE id = p_note_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete note with cleanup
CREATE OR REPLACE FUNCTION delete_note(p_note_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_video_id UUID;
  v_tags TEXT[];
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Get note info before deletion
  SELECT video_id, tags INTO v_video_id, v_tags
  FROM notes WHERE id = p_note_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Note not found or access denied';
  END IF;
  
  -- Delete note (cascade will handle revisions)
  DELETE FROM notes WHERE id = p_note_id AND user_id = v_user_id;
  
  -- Update user_videos count
  UPDATE user_videos 
  SET private_notes_count = GREATEST(private_notes_count - 1, 0), updated_at = NOW()
  WHERE user_id = v_user_id AND video_id = v_video_id;
  
  -- Update tags usage
  IF array_length(v_tags, 1) > 0 THEN
    UPDATE note_tags 
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE user_id = v_user_id AND name = ANY(v_tags);
    
    -- Remove unused tags
    DELETE FROM note_tags WHERE user_id = v_user_id AND usage_count <= 0;
  END IF;
  
  RETURN jsonb_build_object(
    'deleted', true,
    'note_id', p_note_id,
    'video_id', v_video_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get notes for a video
CREATE OR REPLACE FUNCTION get_video_notes(
  p_video_id UUID,
  p_type note_type DEFAULT NULL,
  p_include_archived BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  type note_type,
  format note_format,
  title TEXT,
  content TEXT,
  timestamp_seconds INTEGER,
  end_timestamp_seconds INTEGER,
  importance_rating INTEGER,
  comprehension_level INTEGER,
  tags TEXT[],
  color_hex TEXT,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    n.id, n.type, n.format, n.title, n.content,
    n.timestamp_seconds, n.end_timestamp_seconds,
    n.importance_rating, n.comprehension_level,
    n.tags, n.color_hex, n.is_pinned,
    n.created_at, n.updated_at
  FROM notes n
  WHERE n.user_id = v_user_id
    AND n.video_id = p_video_id
    AND (p_type IS NULL OR n.type = p_type)
    AND (p_include_archived OR NOT n.is_archived)
  ORDER BY 
    n.is_pinned DESC,
    n.timestamp_seconds ASC NULLS LAST,
    n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Search notes
CREATE OR REPLACE FUNCTION search_notes(
  p_query TEXT,
  p_video_id UUID DEFAULT NULL,
  p_type note_type DEFAULT NULL,
  p_tag TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  video_id UUID,
  video_title TEXT,
  video_thumbnail TEXT,
  channel_name TEXT,
  type note_type,
  title TEXT,
  content TEXT,
  snippet TEXT,
  timestamp_seconds INTEGER,
  importance_rating INTEGER,
  tags TEXT[],
  color_hex TEXT,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL,
  total_count BIGINT
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    n.id,
    n.video_id,
    v.title AS video_title,
    v.thumbnail_url AS video_thumbnail,
    v.channel_name,
    n.type,
    n.title,
    n.content,
    ts_headline('english', n.content, plainto_tsquery('english', p_query), 
      'MaxWords=30, MinWords=15, ShortWord=3, MaxFragments=3, FragmentDelimiter="..."'
    ) AS snippet,
    n.timestamp_seconds,
    n.importance_rating,
    n.tags,
    n.color_hex,
    n.is_pinned,
    n.created_at,
    n.updated_at,
    ts_rank(n.search_vector, plainto_tsquery('english', p_query)) AS rank,
    COUNT(*) OVER() AS total_count
  FROM notes n
  INNER JOIN videos v ON v.id = n.video_id
  WHERE n.user_id = v_user_id
    AND NOT n.is_archived
    AND n.search_vector @@ plainto_tsquery('english', p_query)
    AND (p_video_id IS NULL OR n.video_id = p_video_id)
    AND (p_type IS NULL OR n.type = p_type)
    AND (p_tag IS NULL OR p_tag = ANY(n.tags))
  ORDER BY 
    n.is_pinned DESC,
    rank DESC,
    n.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get note statistics
CREATE OR REPLACE FUNCTION get_note_statistics(p_video_id UUID DEFAULT NULL)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  SELECT jsonb_build_object(
    'total_notes', COUNT(*),
    'timestamp_notes', COUNT(*) FILTER (WHERE type = 'timestamp'),
    'general_notes', COUNT(*) FILTER (WHERE type = 'general'),
    'key_concepts', COUNT(*) FILTER (WHERE type = 'key_concept'),
    'questions', COUNT(*) FILTER (WHERE type = 'question'),
    'action_items', COUNT(*) FILTER (WHERE type = 'action_item'),
    'pinned_notes', COUNT(*) FILTER (WHERE is_pinned),
    'average_importance', ROUND(AVG(importance_rating)::numeric, 1),
    'recent_notes', COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'),
    'by_tag', (
      SELECT COALESCE(jsonb_object_agg(tag, count), '{}'::jsonb)
      FROM (
        SELECT unnest(tags) AS tag, COUNT(*) AS count
        FROM notes
        WHERE user_id = v_user_id
          AND (p_video_id IS NULL OR video_id = p_video_id)
          AND NOT is_archived
        GROUP BY tag
      ) sub
    )
  ) INTO v_result
  FROM notes
  WHERE user_id = v_user_id
    AND (p_video_id IS NULL OR video_id = p_video_id)
    AND NOT is_archived;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON note_tags TO authenticated;
GRANT SELECT ON note_revisions TO authenticated;