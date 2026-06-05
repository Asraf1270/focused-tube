-- ============================================
-- SETTINGS & DATA MANAGEMENT SYSTEM
-- ============================================

-- ============================================
-- USER SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Appearance
  theme TEXT NOT NULL DEFAULT 'dark',
  font_size TEXT NOT NULL DEFAULT 'medium',
  reduced_motion BOOLEAN NOT NULL DEFAULT false,
  high_contrast BOOLEAN NOT NULL DEFAULT false,
  
  -- Playback defaults
  default_playback_speed DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  default_quality TEXT DEFAULT 'auto',
  autoplay BOOLEAN NOT NULL DEFAULT false,
  autoplay_next BOOLEAN NOT NULL DEFAULT false,
  show_captions BOOLEAN NOT NULL DEFAULT true,
  caption_language TEXT DEFAULT 'en',
  
  -- Focus mode defaults
  focus_mode_enabled BOOLEAN NOT NULL DEFAULT false,
  focus_hide_comments BOOLEAN NOT NULL DEFAULT true,
  focus_hide_suggestions BOOLEAN NOT NULL DEFAULT true,
  focus_hide_likes BOOLEAN NOT NULL DEFAULT true,
  focus_hide_views BOOLEAN NOT NULL DEFAULT true,
  
  -- Notifications
  daily_reminder BOOLEAN NOT NULL DEFAULT false,
  daily_reminder_time TIME DEFAULT '09:00',
  weekly_report BOOLEAN NOT NULL DEFAULT true,
  achievement_alerts BOOLEAN NOT NULL DEFAULT true,
  
  -- Privacy
  share_watch_history BOOLEAN NOT NULL DEFAULT false,
  share_playlists BOOLEAN NOT NULL DEFAULT false,
  
  -- Learning preferences
  daily_goal_minutes INTEGER DEFAULT 30,
  weekly_goal_days INTEGER DEFAULT 5,
  preferred_categories TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id),
  CONSTRAINT valid_theme CHECK (theme IN ('dark', 'light', 'system')),
  CONSTRAINT valid_font_size CHECK (font_size IN ('small', 'medium', 'large')),
  CONSTRAINT valid_playback_speed CHECK (default_playback_speed >= 0.25 AND default_playback_speed <= 2.0),
  CONSTRAINT valid_daily_goal CHECK (daily_goal_minutes > 0 AND daily_goal_minutes <= 480)
);

-- ============================================
-- DATA EXPORT/IMPORT FUNCTIONS
-- ============================================

-- Export all user data as JSON
CREATE OR REPLACE FUNCTION export_user_data()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  SELECT jsonb_build_object(
    'export_date', NOW(),
    'version', '1.0',
    'profile', (SELECT row_to_json(p) FROM profiles p WHERE id = v_user_id),
    'settings', (SELECT row_to_json(s) FROM user_settings s WHERE user_id = v_user_id),
    'videos', (
      SELECT COALESCE(jsonb_agg(row_to_json(uv)), '[]'::jsonb)
      FROM user_videos uv WHERE user_id = v_user_id
    ),
    'playlists', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM playlists p WHERE user_id = v_user_id
    ),
    'playlist_videos', (
      SELECT COALESCE(jsonb_agg(row_to_json(pv)), '[]'::jsonb)
      FROM playlist_videos pv
      INNER JOIN playlists p ON p.id = pv.playlist_id
      WHERE p.user_id = v_user_id
    ),
    'notes', (
      SELECT COALESCE(jsonb_agg(row_to_json(n)), '[]'::jsonb)
      FROM notes n WHERE user_id = v_user_id
    ),
    'bookmarks', (
      SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb)
      FROM bookmarks b WHERE user_id = v_user_id
    ),
    'categories', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM categories c WHERE user_id = v_user_id
    ),
    'favorites', (
      SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb)
      FROM favorites f WHERE user_id = v_user_id
    ),
    'watch_progress', (
      SELECT COALESCE(jsonb_agg(row_to_json(wp)), '[]'::jsonb)
      FROM watch_progress wp WHERE user_id = v_user_id
    ),
    'learning_sessions', (
      SELECT COALESCE(jsonb_agg(row_to_json(ls)), '[]'::jsonb)
      FROM learning_sessions ls WHERE user_id = v_user_id
    ),
    'daily_stats', (
      SELECT COALESCE(jsonb_agg(row_to_json(ds)), '[]'::jsonb)
      FROM daily_stats ds WHERE user_id = v_user_id
    ),
    'achievements', (
      SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
      FROM achievements a WHERE user_id = v_user_id
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Import user data
CREATE OR REPLACE FUNCTION import_user_data(p_data JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
  v_imported INTEGER := 0;
  v_skipped INTEGER := 0;
BEGIN
  v_user_id := auth.uid();
  
  -- Import videos
  IF p_data ? 'videos' THEN
    WITH inserted AS (
      INSERT INTO user_videos (
        user_id, video_id, status, progress_seconds, last_position_seconds,
        watch_count, total_watch_time_seconds, last_watched_at, first_watched_at,
        is_favorite, is_bookmarked, is_liked, personal_tags
      )
      SELECT 
        v_user_id, 
        (item->>'video_id')::UUID,
        (item->>'status')::watch_status,
        (item->>'progress_seconds')::INTEGER,
        (item->>'last_position_seconds')::INTEGER,
        (item->>'watch_count')::INTEGER,
        (item->>'total_watch_time_seconds')::INTEGER,
        (item->>'last_watched_at')::TIMESTAMPTZ,
        (item->>'first_watched_at')::TIMESTAMPTZ,
        (item->>'is_favorite')::BOOLEAN,
        (item->>'is_bookmarked')::BOOLEAN,
        (item->>'is_liked')::BOOLEAN,
        (SELECT ARRAY(SELECT jsonb_array_elements_text(item->'personal_tags')))
      FROM jsonb_array_elements(p_data->'videos') AS item
      ON CONFLICT (user_id, video_id) DO UPDATE SET
        status = EXCLUDED.status,
        progress_seconds = GREATEST(user_videos.progress_seconds, EXCLUDED.progress_seconds),
        last_position_seconds = EXCLUDED.last_position_seconds,
        last_watched_at = EXCLUDED.last_watched_at,
        is_favorite = EXCLUDED.is_favorite,
        is_bookmarked = EXCLUDED.is_bookmarked,
        is_liked = EXCLUDED.is_liked,
        updated_at = NOW()
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_imported FROM inserted;
  END IF;
  
  -- Import playlists
  IF p_data ? 'playlists' THEN
    INSERT INTO playlists (user_id, name, description, visibility, is_learning_path, color_hex, emoji)
    SELECT 
      v_user_id,
      item->>'name',
      item->>'description',
      (item->>'visibility')::content_visibility,
      (item->>'is_learning_path')::BOOLEAN,
      COALESCE(item->>'color_hex', '#3EA6FF'),
      item->>'emoji'
    FROM jsonb_array_elements(p_data->'playlists') AS item
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Import notes
  IF p_data ? 'notes' THEN
    INSERT INTO notes (user_id, video_id, type, content, timestamp_seconds, tags)
    SELECT 
      v_user_id,
      (item->>'video_id')::UUID,
      (COALESCE(item->>'type', 'general'))::note_type,
      item->>'content',
      (item->>'timestamp_seconds')::INTEGER,
      (SELECT ARRAY(SELECT jsonb_array_elements_text(item->'tags')))
    FROM jsonb_array_elements(p_data->'notes') AS item
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Import bookmarks
  IF p_data ? 'bookmarks' THEN
    INSERT INTO bookmarks (user_id, video_id, timestamp_seconds, label, color_hex)
    SELECT 
      v_user_id,
      (item->>'video_id')::UUID,
      (item->>'timestamp_seconds')::INTEGER,
      item->>'label',
      COALESCE(item->>'color_hex', '#FFD700')
    FROM jsonb_array_elements(p_data->'bookmarks') AS item
    ON CONFLICT (user_id, video_id, timestamp_seconds) DO NOTHING;
  END IF;
  
  -- Import categories
  IF p_data ? 'categories' THEN
    INSERT INTO categories (user_id, name, color_hex, emoji)
    SELECT 
      v_user_id,
      item->>'name',
      COALESCE(item->>'color_hex', '#3EA6FF'),
      item->>'emoji'
    FROM jsonb_array_elements(p_data->'categories') AS item
    ON CONFLICT (user_id, name) DO NOTHING;
  END IF;
  
  -- Import settings
  IF p_data ? 'settings' AND p_data->'settings' IS NOT NULL THEN
    INSERT INTO user_settings (user_id, theme, default_playback_speed, autoplay, show_captions)
    SELECT 
      v_user_id,
      COALESCE(p_data->'settings'->>'theme', 'dark'),
      COALESCE((p_data->'settings'->>'default_playback_speed')::DECIMAL, 1.0),
      COALESCE((p_data->'settings'->>'autoplay')::BOOLEAN, false),
      COALESCE((p_data->'settings'->>'show_captions')::BOOLEAN, true)
    ON CONFLICT (user_id) DO UPDATE SET
      theme = COALESCE(EXCLUDED.theme, user_settings.theme),
      updated_at = NOW();
  END IF;
  
  RETURN jsonb_build_object(
    'imported', v_imported,
    'status', 'success',
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DELETE ACCOUNT FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  -- Delete all user data (cascade will handle most)
  DELETE FROM user_settings WHERE user_id = v_user_id;
  DELETE FROM profiles WHERE id = v_user_id;
  
  -- Delete auth user
  DELETE FROM auth.users WHERE id = v_user_id;
  
  RETURN jsonb_build_object(
    'deleted', true,
    'timestamp', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET/SET USER SETTINGS
-- ============================================
CREATE OR REPLACE FUNCTION get_user_settings()
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  SELECT row_to_json(s)::jsonb INTO v_result
  FROM user_settings s
  WHERE user_id = v_user_id;
  
  -- Return defaults if no settings exist
  IF v_result IS NULL THEN
    INSERT INTO user_settings (user_id) VALUES (v_user_id)
    RETURNING row_to_json(user_settings)::jsonb INTO v_result;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_user_settings(p_settings JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO user_settings (user_id) VALUES (v_user_id)
  ON CONFLICT (user_id) DO NOTHING;
  
  UPDATE user_settings SET
    theme = COALESCE(p_settings->>'theme', theme),
    font_size = COALESCE(p_settings->>'font_size', font_size),
    reduced_motion = COALESCE((p_settings->>'reduced_motion')::BOOLEAN, reduced_motion),
    high_contrast = COALESCE((p_settings->>'high_contrast')::BOOLEAN, high_contrast),
    default_playback_speed = COALESCE((p_settings->>'default_playback_speed')::DECIMAL, default_playback_speed),
    autoplay = COALESCE((p_settings->>'autoplay')::BOOLEAN, autoplay),
    show_captions = COALESCE((p_settings->>'show_captions')::BOOLEAN, show_captions),
    focus_mode_enabled = COALESCE((p_settings->>'focus_mode_enabled')::BOOLEAN, focus_mode_enabled),
    daily_goal_minutes = COALESCE((p_settings->>'daily_goal_minutes')::INTEGER, daily_goal_minutes),
    updated_at = NOW()
  WHERE user_id = v_user_id
  RETURNING row_to_json(user_settings)::jsonb INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO authenticated;