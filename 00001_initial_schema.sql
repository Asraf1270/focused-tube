-- ============================================
-- FocusedTube Database Schema
-- Single-user personal learning platform
-- ============================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================

CREATE TYPE content_status AS ENUM (
  'watch_later',
  'in_progress',
  'completed',
  'archived'
);

CREATE TYPE content_type AS ENUM (
  'video',
  'playlist',
  'channel'
);

CREATE TYPE note_type AS ENUM (
  'timestamp',
  'general',
  'summary',
  'action_item'
);

CREATE TYPE playlist_visibility AS ENUM (
  'private',
  'public'
);

-- ============================================
-- PROFILES TABLE
-- Extended user data
-- ============================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  learning_goal TEXT,
  daily_target_minutes INTEGER DEFAULT 30,
  preferences JSONB DEFAULT '{
    "theme": "dark",
    "autoplay": false,
    "playback_speed": 1.0,
    "default_quality": "auto",
    "show_captions": true,
    "focus_mode": {
      "enabled": false,
      "hide_comments": true,
      "hide_suggestions": true,
      "hide_likes": true
    }
  }'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$'),
  CONSTRAINT valid_daily_target CHECK (daily_target_minutes > 0 AND daily_target_minutes <= 480)
);

-- ============================================
-- VIDEOS TABLE
-- Core video content
-- ============================================

CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER,
  channel_name TEXT,
  channel_id TEXT,
  channel_thumbnail_url TEXT,
  published_at TIMESTAMPTZ,
  view_count BIGINT,
  like_count BIGINT,
  category TEXT,
  tags TEXT[],
  language TEXT DEFAULT 'en',
  is_short BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_duration CHECK (duration_seconds > 0),
  CONSTRAINT valid_youtube_id CHECK (youtube_id ~* '^[a-zA-Z0-9_-]{11}$')
);

-- ============================================
-- USER_VIDEOS TABLE
-- User's relationship with videos
-- ============================================

CREATE TABLE user_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Watch tracking
  status content_status DEFAULT 'watch_later',
  progress_seconds INTEGER DEFAULT 0,
  last_position_seconds INTEGER DEFAULT 0,
  watch_count INTEGER DEFAULT 0,
  last_watched_at TIMESTAMPTZ,
  first_watched_at TIMESTAMPTZ DEFAULT NOW(),
  total_watch_time_seconds INTEGER DEFAULT 0,
  
  -- User engagement
  is_liked BOOLEAN DEFAULT false,
  is_bookmarked BOOLEAN DEFAULT false,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  
  -- Organization
  notes_count INTEGER DEFAULT 0,
  tags TEXT[],
  
  -- Learning metrics
  comprehension_rating INTEGER CHECK (comprehension_rating >= 1 AND comprehension_rating <= 5),
  is_key_learning BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, video_id)
);

-- ============================================
-- PLAYLISTS TABLE
-- User-created playlists
-- ============================================

CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  visibility playlist_visibility DEFAULT 'private',
  is_learning_path BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  color_hex TEXT DEFAULT '#3EA6FF',
  emoji TEXT,
  
  -- Stats
  video_count INTEGER DEFAULT 0,
  total_duration_seconds INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_name CHECK (char_length(name) BETWEEN 1 AND 200)
);

-- ============================================
-- PLAYLIST_VIDEOS TABLE
-- Videos within playlists
-- ============================================

CREATE TABLE playlist_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  
  UNIQUE(playlist_id, video_id),
  UNIQUE(playlist_id, position)
);

-- ============================================
-- NOTES TABLE
-- Timestamp and general notes for videos
-- ============================================

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  
  type note_type DEFAULT 'general',
  content TEXT NOT NULL,
  
  -- For timestamp notes
  timestamp_seconds INTEGER,
  
  -- Formatting
  is_pinned BOOLEAN DEFAULT false,
  is_rich_text BOOLEAN DEFAULT false,
  
  -- Learning metadata
  importance_rating INTEGER CHECK (importance_rating >= 1 AND importance_rating <= 5),
  comprehension_level INTEGER CHECK (comprehension_level >= 1 AND comprehension_level <= 3),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_content CHECK (char_length(content) > 0)
);

-- ============================================
-- LEARNING_SESSIONS TABLE
-- Track focused learning sessions
-- ============================================

CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Context
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  topic TEXT,
  
  -- Metrics
  videos_watched INTEGER DEFAULT 0,
  notes_taken INTEGER DEFAULT 0,
  comprehension_score INTEGER CHECK (comprehension_score >= 1 AND comprehension_score <= 10),
  
  -- Focus tracking
  focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 5),
  distractions_count INTEGER DEFAULT 0,
  
  -- Session data
  mood_before TEXT,
  mood_after TEXT,
  session_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY_STATS TABLE
-- Aggregated daily learning statistics
-- ============================================

CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Time metrics
  total_watch_time_seconds INTEGER DEFAULT 0,
  active_learning_minutes INTEGER DEFAULT 0,
  
  -- Content metrics
  videos_watched INTEGER DEFAULT 0,
  videos_completed INTEGER DEFAULT 0,
  notes_created INTEGER DEFAULT 0,
  playlists_created INTEGER DEFAULT 0,
  
  -- Streak
  streak_days INTEGER DEFAULT 0,
  daily_goal_achieved BOOLEAN DEFAULT false,
  
  -- Focus metrics
  sessions_count INTEGER DEFAULT 0,
  average_focus_rating DECIMAL(2,1),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- ============================================
-- CATEGORIES TABLE
-- Custom learning categories
-- ============================================

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color_hex TEXT DEFAULT '#3EA6FF',
  emoji TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_category_name CHECK (char_length(name) BETWEEN 1 AND 100)
);

-- ============================================
-- VIDEO_CATEGORIES TABLE
-- Junction table for video categorization
-- ============================================

CREATE TABLE video_categories (
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (video_id, category_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Videos indexes
CREATE INDEX idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX idx_videos_channel_id ON videos(channel_id);
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX idx_videos_created_at ON videos(created_at DESC);

-- User videos indexes
CREATE INDEX idx_user_videos_user_status ON user_videos(user_id, status);
CREATE INDEX idx_user_videos_user_liked ON user_videos(user_id, is_liked) WHERE is_liked = true;
CREATE INDEX idx_user_videos_user_bookmarked ON user_videos(user_id, is_bookmarked) WHERE is_bookmarked = true;
CREATE INDEX idx_user_videos_last_watched ON user_videos(user_id, last_watched_at DESC);

-- Playlists indexes
CREATE INDEX idx_playlists_user ON playlists(user_id, sort_order);
CREATE INDEX idx_playlists_learning_path ON playlists(user_id, is_learning_path) WHERE is_learning_path = true;

-- Notes indexes
CREATE INDEX idx_notes_user_video ON notes(user_id, video_id);
CREATE INDEX idx_notes_timestamp ON notes(video_id, timestamp_seconds);

-- Learning sessions indexes
CREATE INDEX idx_learning_sessions_user_time ON learning_sessions(user_id, start_time DESC);
CREATE INDEX idx_learning_sessions_active ON learning_sessions(user_id) WHERE end_time IS NULL;

-- Daily stats indexes
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);

-- Full text search
CREATE INDEX idx_videos_title_search ON videos USING gin(to_tsvector('english', title));
CREATE INDEX idx_videos_description_search ON videos USING gin(to_tsvector('english', description));
CREATE INDEX idx_notes_content_search ON notes USING gin(to_tsvector('english', content));

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_videos_updated_at BEFORE UPDATE ON user_videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at BEFORE UPDATE ON playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update playlist video count
CREATE OR REPLACE FUNCTION update_playlist_video_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET video_count = video_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET video_count = video_count - 1,
        updated_at = NOW()
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playlist_count_on_insert
  AFTER INSERT ON playlist_videos
  FOR EACH ROW EXECUTE FUNCTION update_playlist_video_count();

CREATE TRIGGER update_playlist_count_on_delete
  AFTER DELETE ON playlist_videos
  FOR EACH ROW EXECUTE FUNCTION update_playlist_video_count();

-- Update user_videos notes count
CREATE OR REPLACE FUNCTION update_video_notes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_videos 
    SET notes_count = notes_count + 1,
        updated_at = NOW()
    WHERE video_id = NEW.video_id AND user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_videos 
    SET notes_count = GREATEST(notes_count - 1, 0),
        updated_at = NOW()
    WHERE video_id = OLD.video_id AND user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notes_count_on_insert
  AFTER INSERT ON notes
  FOR EACH ROW EXECUTE FUNCTION update_video_notes_count();

CREATE TRIGGER update_notes_count_on_delete
  AFTER DELETE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_video_notes_count();