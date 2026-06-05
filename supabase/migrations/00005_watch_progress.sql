-- ============================================
-- WATCH PROGRESS TRACKING SYSTEM
-- ============================================

-- ============================================
-- ENUMS (if not already created)
-- ============================================
DO $$ BEGIN
  CREATE TYPE watch_status AS ENUM (
    'not_started',
    'in_progress',
    'completed',
    'dropped'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- WATCH SESSIONS TABLE
-- Tracks individual viewing sessions
-- ============================================
CREATE TABLE IF NOT EXISTS watch_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Session details
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Position tracking
  start_position_seconds INTEGER NOT NULL DEFAULT 0,
  end_position_seconds INTEGER,
  total_watched_seconds INTEGER,
  
  -- Playback info
  playback_speed DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  quality TEXT,
  device_type TEXT,
  device_info JSONB DEFAULT '{}'::jsonb,
  
  -- Session context
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  is_focus_mode BOOLEAN NOT NULL DEFAULT false,
  
  -- Engagement metrics
  pauses_count INTEGER DEFAULT 0,
  seeks_count INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2),
  
  -- Session completion status
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_session_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT valid_positions CHECK (
    end_position_seconds IS NULL OR 
    end_position_seconds >= start_position_seconds
  )
);

-- ============================================
-- WATCH PROGRESS TABLE
-- Stores cumulative progress for each video
-- ============================================
CREATE TABLE IF NOT EXISTS watch_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Progress tracking
  status watch_status NOT NULL DEFAULT 'not_started',
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- Watch statistics
  watch_count INTEGER NOT NULL DEFAULT 0,
  total_watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  average_watch_percentage DECIMAL(5,2),
  
  -- Timestamps
  first_watched_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Resume data
  resume_data JSONB DEFAULT '{}'::jsonb,
  
  -- Sync tracking
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'synced',
  local_version INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, video_id),
  CONSTRAINT valid_progress CHECK (progress_seconds >= 0 AND last_position_seconds >= 0),
  CONSTRAINT valid_watch_time CHECK (total_watch_time_seconds >= 0)
);

-- ============================================
-- PLAYBACK_STATES TABLE
-- Stores player state for exact resume
-- ============================================
CREATE TABLE IF NOT EXISTS playback_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Player state
  current_time_seconds INTEGER NOT NULL DEFAULT 0,
  playback_rate DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  volume INTEGER DEFAULT 100,
  is_muted BOOLEAN DEFAULT false,
  quality TEXT,
  
  -- Subtitle state
  captions_enabled BOOLEAN DEFAULT false,
  caption_language TEXT DEFAULT 'en',
  
  -- Timestamps
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, video_id)
);

-- ============================================
-- PROGRESS_SNAPSHOTS TABLE
-- Periodic snapshots for analytics
-- ============================================
CREATE TABLE IF NOT EXISTS progress_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Snapshot data
  position_seconds INTEGER NOT NULL,
  video_duration_seconds INTEGER,
  completion_percentage DECIMAL(5,2),
  
  -- Timestamp
  snapshot_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Watch sessions indexes
CREATE INDEX IF NOT EXISTS idx_watch_sessions_user_time 
  ON watch_sessions(user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_video 
  ON watch_sessions(video_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_watch_sessions_active 
  ON watch_sessions(user_id) WHERE end_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_watch_sessions_playlist 
  ON watch_sessions(playlist_id) WHERE playlist_id IS NOT NULL;

-- Watch progress indexes
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_status 
  ON watch_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_watch_progress_last_watched 
  ON watch_progress(user_id, last_watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_watch_progress_in_progress 
  ON watch_progress(user_id, progress_seconds) 
  WHERE status = 'in_progress';

-- Progress snapshots indexes
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_user 
  ON progress_snapshots(user_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_video 
  ON progress_snapshots(video_id, snapshot_time DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Update watch progress
CREATE OR REPLACE FUNCTION update_watch_progress(
  p_video_id UUID,
  p_position_seconds INTEGER,
  p_duration_seconds INTEGER DEFAULT NULL,
  p_status watch_status DEFAULT 'in_progress'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
  v_completion_percentage DECIMAL(5,2);
  v_existing_status watch_status;
BEGIN
  v_user_id := auth.uid();
  
  -- Calculate completion percentage
  IF p_duration_seconds IS NOT NULL AND p_duration_seconds > 0 THEN
    v_completion_percentage := ROUND((p_position_seconds::DECIMAL / p_duration_seconds::DECIMAL) * 100, 2);
  END IF;
  
  -- Get existing status
  SELECT status INTO v_existing_status 
  FROM watch_progress 
  WHERE user_id = v_user_id AND video_id = p_video_id;
  
  -- Insert or update progress
  INSERT INTO watch_progress (
    user_id,
    video_id,
    status,
    progress_seconds,
    last_position_seconds,
    watch_count,
    total_watch_time_seconds,
    first_watched_at,
    last_watched_at,
    completed_at,
    last_synced_at,
    sync_status,
    local_version
  ) VALUES (
    v_user_id,
    p_video_id,
    p_status,
    p_position_seconds,
    p_position_seconds,
    1,
    p_position_seconds,
    NOW(),
    NOW(),
    CASE WHEN p_status = 'completed' THEN NOW() ELSE NULL END,
    NOW(),
    'synced',
    1
  )
  ON CONFLICT (user_id, video_id) 
  DO UPDATE SET
    status = CASE 
      WHEN watch_progress.status = 'completed' THEN 'completed'
      ELSE p_status 
    END,
    progress_seconds = GREATEST(watch_progress.progress_seconds, p_position_seconds),
    last_position_seconds = p_position_seconds,
    watch_count = watch_progress.watch_count + 1,
    total_watch_time_seconds = watch_progress.total_watch_time_seconds + 
      GREATEST(p_position_seconds - watch_progress.last_position_seconds, 0),
    last_watched_at = NOW(),
    completed_at = CASE 
      WHEN p_status = 'completed' AND watch_progress.completed_at IS NULL 
      THEN NOW() 
      ELSE watch_progress.completed_at 
    END,
    last_synced_at = NOW(),
    sync_status = 'synced',
    local_version = watch_progress.local_version + 1,
    updated_at = NOW();
  
  -- Calculate average watch percentage
  IF v_completion_percentage IS NOT NULL THEN
    UPDATE watch_progress
    SET average_watch_percentage = (
      SELECT ROUND(AVG(completion_percentage), 2)
      FROM progress_snapshots
      WHERE user_id = v_user_id AND video_id = p_video_id
    )
    WHERE user_id = v_user_id AND video_id = p_video_id;
  END IF;
  
  -- Build result
  SELECT jsonb_build_object(
    'video_id', p_video_id,
    'position', p_position_seconds,
    'status', p_status,
    'completion_percentage', v_completion_percentage,
    'synced_at', NOW()
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Save playback state
CREATE OR REPLACE FUNCTION save_playback_state(
  p_video_id UUID,
  p_current_time_seconds INTEGER,
  p_playback_rate DECIMAL DEFAULT 1.0,
  p_volume INTEGER DEFAULT 100,
  p_is_muted BOOLEAN DEFAULT false,
  p_quality TEXT DEFAULT NULL,
  p_captions_enabled BOOLEAN DEFAULT false,
  p_caption_language TEXT DEFAULT 'en'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  INSERT INTO playback_states (
    user_id,
    video_id,
    current_time_seconds,
    playback_rate,
    volume,
    is_muted,
    quality,
    captions_enabled,
    caption_language,
    last_updated
  ) VALUES (
    v_user_id,
    p_video_id,
    p_current_time_seconds,
    p_playback_rate,
    p_volume,
    p_is_muted,
    p_quality,
    p_captions_enabled,
    p_caption_language,
    NOW()
  )
  ON CONFLICT (user_id, video_id)
  DO UPDATE SET
    current_time_seconds = EXCLUDED.current_time_seconds,
    playback_rate = EXCLUDED.playback_rate,
    volume = EXCLUDED.volume,
    is_muted = EXCLUDED.is_muted,
    quality = EXCLUDED.quality,
    captions_enabled = EXCLUDED.captions_enabled,
    caption_language = EXCLUDED.caption_language,
    last_updated = NOW();
  
  RETURN jsonb_build_object(
    'video_id', p_video_id,
    'current_time', p_current_time_seconds,
    'saved_at', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get resume data
CREATE OR REPLACE FUNCTION get_resume_data(p_video_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_progress watch_progress;
  v_playback_state playback_states;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();
  
  -- Get watch progress
  SELECT * INTO v_progress
  FROM watch_progress
  WHERE user_id = v_user_id AND video_id = p_video_id;
  
  -- Get playback state
  SELECT * INTO v_playback_state
  FROM playback_states
  WHERE user_id = v_user_id AND video_id = p_video_id;
  
  -- Build result
  v_result := jsonb_build_object(
    'video_id', p_video_id,
    'has_progress', v_progress IS NOT NULL,
    'progress', CASE WHEN v_progress IS NOT NULL THEN
      jsonb_build_object(
        'status', v_progress.status,
        'position_seconds', v_progress.last_position_seconds,
        'progress_seconds', v_progress.progress_seconds,
        'watch_count', v_progress.watch_count,
        'last_watched_at', v_progress.last_watched_at
      )
    ELSE NULL END,
    'playback_state', CASE WHEN v_playback_state IS NOT NULL THEN
      jsonb_build_object(
        'current_time', v_playback_state.current_time_seconds,
        'playback_rate', v_playback_state.playback_rate,
        'volume', v_playback_state.volume,
        'is_muted', v_playback_state.is_muted,
        'quality', v_playback_state.quality,
        'captions_enabled', v_playback_state.captions_enabled,
        'caption_language', v_playback_state.caption_language
      )
    ELSE NULL END
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create progress snapshot
CREATE OR REPLACE FUNCTION create_progress_snapshot(
  p_video_id UUID,
  p_position_seconds INTEGER,
  p_duration_seconds INTEGER DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_completion_percentage DECIMAL(5,2);
BEGIN
  v_user_id := auth.uid();
  
  -- Calculate completion
  IF p_duration_seconds IS NOT NULL AND p_duration_seconds > 0 THEN
    v_completion_percentage := ROUND((p_position_seconds::DECIMAL / p_duration_seconds::DECIMAL) * 100, 2);
  END IF;
  
  -- Insert snapshot
  INSERT INTO progress_snapshots (
    user_id,
    video_id,
    position_seconds,
    video_duration_seconds,
    completion_percentage
  ) VALUES (
    v_user_id,
    p_video_id,
    p_position_seconds,
    p_duration_seconds,
    v_completion_percentage
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get watch history
CREATE OR REPLACE FUNCTION get_watch_history(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status watch_status DEFAULT NULL
)
RETURNS TABLE (
  video_id UUID,
  youtube_id TEXT,
  title TEXT,
  channel_name TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  status watch_status,
  progress_seconds INTEGER,
  last_position_seconds INTEGER,
  last_watched_at TIMESTAMPTZ,
  completion_percentage DECIMAL(5,2)
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
    wp.status,
    wp.progress_seconds,
    wp.last_position_seconds,
    wp.last_watched_at,
    CASE 
      WHEN v.duration_seconds > 0 
      THEN ROUND((wp.progress_seconds::DECIMAL / v.duration_seconds::DECIMAL) * 100, 2)
      ELSE 0
    END AS completion_percentage
  FROM watch_progress wp
  INNER JOIN videos v ON v.id = wp.video_id
  WHERE wp.user_id = v_user_id
    AND (p_status IS NULL OR wp.status = p_status)
  ORDER BY wp.last_watched_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_watch_sessions_updated_at
  BEFORE UPDATE ON watch_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watch_progress_updated_at
  BEFORE UPDATE ON watch_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON watch_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON watch_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON playback_states TO authenticated;
GRANT SELECT, INSERT ON progress_snapshots TO authenticated;