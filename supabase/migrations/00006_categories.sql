-- ============================================
-- CATEGORY MANAGEMENT SYSTEM
-- ============================================

-- ============================================
-- CATEGORIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Category info
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT NOT NULL DEFAULT '#3EA6FF',
  icon TEXT,
  emoji TEXT,
  
  -- Hierarchy
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,
  
  -- Stats (denormalized for performance)
  video_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_category_name CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT valid_color CHECK (color_hex ~* '^#[a-fA-F0-9]{6}$'),
  CONSTRAINT no_self_parent CHECK (id != parent_id),
  UNIQUE(user_id, name)
);

-- ============================================
-- VIDEO_CATEGORIES TABLE (Junction)
-- ============================================
CREATE TABLE IF NOT EXISTS video_categories (
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Ordering within category
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (video_id, category_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_depth ON categories(user_id, depth);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(user_id, name);

-- Video categories indexes
CREATE INDEX IF NOT EXISTS idx_video_categories_video ON video_categories(video_id);
CREATE INDEX IF NOT EXISTS idx_video_categories_category ON video_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_video_categories_user ON video_categories(user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Create category
CREATE OR REPLACE FUNCTION create_category(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_color_hex TEXT DEFAULT '#3EA6FF',
  p_icon TEXT DEFAULT NULL,
  p_emoji TEXT DEFAULT NULL,
  p_parent_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_category_id UUID;
  v_depth INTEGER;
  v_sort_order INTEGER;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Calculate depth
  IF p_parent_id IS NOT NULL THEN
    SELECT depth + 1 INTO v_depth FROM categories WHERE id = p_parent_id AND user_id = v_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent category not found';
    END IF;
  ELSE
    v_depth := 0;
  END IF;
  
  -- Get max sort order
  SELECT COALESCE(MAX(sort_order), -1) + 1 INTO v_sort_order
  FROM categories
  WHERE user_id = v_user_id AND parent_id IS NOT DISTINCT FROM p_parent_id;
  
  -- Insert category
  INSERT INTO categories (
    user_id, name, description, color_hex, icon, emoji,
    parent_id, sort_order, depth
  ) VALUES (
    v_user_id, p_name, p_description, p_color_hex, p_icon, p_emoji,
    p_parent_id, v_sort_order, v_depth
  )
  RETURNING id INTO v_category_id;
  
  -- Build result
  SELECT row_to_json(c)::jsonb INTO v_result
  FROM categories c
  WHERE id = v_category_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update category
CREATE OR REPLACE FUNCTION update_category(
  p_category_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_color_hex TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_emoji TEXT DEFAULT NULL,
  p_sort_order INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Check ownership
  IF NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE id = p_category_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Category not found or access denied';
  END IF;
  
  -- Update category
  UPDATE categories SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    color_hex = COALESCE(p_color_hex, color_hex),
    icon = COALESCE(p_icon, icon),
    emoji = COALESCE(p_emoji, emoji),
    sort_order = COALESCE(p_sort_order, sort_order),
    updated_at = NOW()
  WHERE id = p_category_id AND user_id = v_user_id;
  
  -- Build result
  SELECT row_to_json(c)::jsonb INTO v_result
  FROM categories c
  WHERE id = p_category_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Delete category
CREATE OR REPLACE FUNCTION delete_category(p_category_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_category_name TEXT;
BEGIN
  v_user_id := auth.uid();
  
  -- Get category name before deleting
  SELECT name INTO v_category_name
  FROM categories
  WHERE id = p_category_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category not found or access denied';
  END IF;
  
  -- Delete category (cascade will handle video_categories)
  DELETE FROM categories
  WHERE id = p_category_id AND user_id = v_user_id;
  
  RETURN jsonb_build_object(
    'deleted', true,
    'category_name', v_category_name,
    'category_id', p_category_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Assign video to category
CREATE OR REPLACE FUNCTION assign_video_to_category(
  p_video_id UUID,
  p_category_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Check category ownership
  IF NOT EXISTS (
    SELECT 1 FROM categories 
    WHERE id = p_category_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Category not found or access denied';
  END IF;
  
  -- Insert or ignore if already exists
  INSERT INTO video_categories (video_id, category_id, user_id)
  VALUES (p_video_id, p_category_id, v_user_id)
  ON CONFLICT (video_id, category_id, user_id) DO NOTHING;
  
  -- Update category count
  UPDATE categories
  SET video_count = (
    SELECT COUNT(*) FROM video_categories WHERE category_id = p_category_id
  ),
  updated_at = NOW()
  WHERE id = p_category_id;
  
  RETURN jsonb_build_object(
    'assigned', true,
    'video_id', p_video_id,
    'category_id', p_category_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove video from category
CREATE OR REPLACE FUNCTION remove_video_from_category(
  p_video_id UUID,
  p_category_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  DELETE FROM video_categories
  WHERE video_id = p_video_id 
    AND category_id = p_category_id 
    AND user_id = v_user_id;
  
  -- Update category count
  UPDATE categories
  SET video_count = (
    SELECT COUNT(*) FROM video_categories WHERE category_id = p_category_id
  ),
  updated_at = NOW()
  WHERE id = p_category_id;
  
  RETURN jsonb_build_object(
    'removed', true,
    'video_id', p_video_id,
    'category_id', p_category_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get categories with video counts
CREATE OR REPLACE FUNCTION get_categories_with_stats()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color_hex TEXT,
  icon TEXT,
  emoji TEXT,
  parent_id UUID,
  sort_order INTEGER,
  depth INTEGER,
  video_count INTEGER,
  completed_count INTEGER,
  total_duration_seconds INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    c.id, c.name, c.description, c.color_hex, c.icon, c.emoji,
    c.parent_id, c.sort_order, c.depth,
    c.video_count, c.completed_count, c.total_duration_seconds,
    c.created_at, c.updated_at
  FROM categories c
  WHERE c.user_id = v_user_id
  ORDER BY c.depth, c.sort_order, c.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get videos in category
CREATE OR REPLACE FUNCTION get_category_videos(p_category_id UUID)
RETURNS TABLE (
  video_id UUID,
  youtube_id TEXT,
  title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  sort_order INTEGER,
  added_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  SELECT 
    v.id, v.youtube_id, v.title, v.channel_name, 
    v.thumbnail_url, v.duration_seconds,
    vc.sort_order, vc.created_at AS added_at
  FROM video_categories vc
  INNER JOIN videos v ON v.id = vc.video_id
  WHERE vc.category_id = p_category_id 
    AND vc.user_id = v_user_id
  ORDER BY vc.sort_order, vc.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Prevent circular references
CREATE OR REPLACE FUNCTION prevent_circular_category_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (
      WITH RECURSIVE category_tree AS (
        SELECT id, parent_id, 1 AS depth
        FROM categories
        WHERE id = NEW.parent_id
        
        UNION ALL
        
        SELECT c.id, c.parent_id, ct.depth + 1
        FROM categories c
        INNER JOIN category_tree ct ON c.id = ct.parent_id
        WHERE ct.depth < 10
      )
      SELECT 1 FROM category_tree WHERE id = NEW.id
    ) THEN
      RAISE EXCEPTION 'Circular reference detected in category hierarchy';
    END IF;
    
    -- Set depth based on parent
    SELECT depth + 1 INTO NEW.depth FROM categories WHERE id = NEW.parent_id;
  ELSE
    NEW.depth := 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_circular_categories
  BEFORE INSERT OR UPDATE OF parent_id ON categories
  FOR EACH ROW
  WHEN (NEW.parent_id IS NOT NULL)
  EXECUTE FUNCTION prevent_circular_category_reference();

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT SELECT, INSERT, DELETE ON video_categories TO authenticated;