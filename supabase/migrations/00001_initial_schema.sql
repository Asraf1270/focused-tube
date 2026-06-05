-- ============================================
-- FocusedTube Database Schema
-- Version: 1.0.0
-- Description: Core schema for distraction-free learning platform
-- ============================================

-- ============================================
-- EXTENSIONS
-- ============================================

-- UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================
-- ENUMS
-- ============================================

-- Video content type
CREATE TYPE video_type AS ENUM (
  'video',
  'short',
  'live',
  'premiere'
);

-- Watch status tracking
CREATE TYPE watch_status AS ENUM (
  'watch_later',
  'not_started',
  'in_progress',
  'completed',
  'dropped'
);

-- Note types for different contexts
CREATE TYPE note_type AS ENUM (
  'general',
  'timestamp',
  'summary',
  'question',
  'action_item',
  'key_concept'
);

-- Playlist/category visibility
CREATE TYPE content_visibility AS ENUM (
  'private',
  'unlisted',
  'public'
);

-- Difficulty level for learning content
CREATE TYPE difficulty_level AS ENUM (
  'beginner',
  'intermediate',
  'advanced',
  'expert'
);

-- Learning path progress status
CREATE TYPE path_status AS ENUM (
  'not_started',
  'in_progress',
  'completed',
  'mastered'
);

-- ============================================
-- TABLES
-- ============================================

-- ============================================
-- 1. PROFILES
-- User profile and preferences
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  
  -- Learning preferences
  learning_goal TEXT,
  daily_target_minutes INTEGER DEFAULT 30 CHECK (daily_target_minutes > 0 AND daily_target_minutes <= 480),
  
  -- UI preferences (JSON for flexibility)
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
      "hide_likes": true,
      "hide_views": true
    },
    "notifications": {
      "daily_reminder": false,
      "weekly_report": true,
      "achievement_alerts": true
    }
  }'::jsonb,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT valid_username CHECK (username ~* '^[a-zA-Z0-9_]{3,30}$'),
  CONSTRAINT valid_website CHECK (website IS NULL OR website ~* '^https?://.*$')
);

-- ============================================
-- 2. VIDEOS
-- Core video content storage
-- ============================================
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  youtube_id TEXT UNIQUE NOT NULL,
  
  -- Basic info
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  thumbnail_high_url TEXT,
  duration_seconds INTEGER CHECK (duration_seconds > 0),
  
  -- Channel info
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_thumbnail_url TEXT,
  
  -- Video metadata
  type video_type DEFAULT 'video',
  published_at TIMESTAMPTZ,
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  
  -- Categorization
  category TEXT,
  tags TEXT[],
  language TEXT DEFAULT 'en',
  is_educational BOOLEAN DEFAULT true,
  difficulty difficulty_level,
  
  -- Content quality flags
  has_captions BOOLEAN DEFAULT false,
  has_transcript BOOLEAN DEFAULT false,
  is_hd BOOLEAN DEFAULT false,
  
  -- Additional metadata (flexible)
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Full-text search vector
  search_vector tsvector,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_youtube_id CHECK (youtube_id ~* '^[a-zA-Z0-9_-]{11}$'),
  CONSTRAINT valid_title CHECK (char_length(title) BETWEEN 1 AND 500)
);

-- ============================================
-- 3. CATEGORIES
-- User-defined categories with hierarchy
-- ============================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Category info
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT DEFAULT '#3EA6FF',
  icon TEXT,
  emoji TEXT,
  
  -- Hierarchy
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  depth INTEGER NOT NULL DEFAULT 0,
  
  -- Stats
  video_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_category_name CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT valid_color CHECK (color_hex ~* '^#[a-fA-F0-9]{6}$'),
  CONSTRAINT no_self_parent CHECK (id != parent_id)
);

-- ============================================
-- 4. VIDEO_CATEGORIES (Junction)
-- Many-to-many relationship between videos and categories
-- ============================================
CREATE TABLE video_categories (
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Ordering within category
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  PRIMARY KEY (video_id, category_id, user_id)
);

-- ============================================
-- 5. USER_VIDEOS
-- User's relationship with videos (watch status, progress, etc.)
-- ============================================
CREATE TABLE user_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Watch tracking
  status watch_status NOT NULL DEFAULT 'watch_later',
  progress_seconds INTEGER NOT NULL DEFAULT 0,
  last_position_seconds INTEGER NOT NULL DEFAULT 0,
  watch_count INTEGER NOT NULL DEFAULT 0,
  total_watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_watched_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Engagement
  is_favorite BOOLEAN NOT NULL DEFAULT false,
  is_bookmarked BOOLEAN NOT NULL DEFAULT false,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  is_liked BOOLEAN NOT NULL DEFAULT false,
  
  -- Learning assessment
  comprehension_rating INTEGER CHECK (comprehension_rating >= 1 AND comprehension_rating <= 5),
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
  is_key_learning BOOLEAN NOT NULL DEFAULT false,
  
  -- Personal tags
  personal_tags TEXT[],
  private_notes_count INTEGER NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, video_id),
  CONSTRAINT valid_progress CHECK (progress_seconds >= 0 AND last_position_seconds >= 0),
  CONSTRAINT valid_watch_time CHECK (total_watch_time_seconds >= 0)
);

-- ============================================
-- 6. PLAYLISTS
-- User-created playlists/learning paths
-- ============================================
CREATE TABLE playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Playlist info
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  visibility content_visibility NOT NULL DEFAULT 'private',
  
  -- Learning path specific
  is_learning_path BOOLEAN NOT NULL DEFAULT false,
  difficulty difficulty_level,
  estimated_hours DECIMAL(4,1),
  
  -- Customization
  color_hex TEXT DEFAULT '#3EA6FF',
  emoji TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  
  -- Stats
  video_count INTEGER NOT NULL DEFAULT 0,
  completed_count INTEGER NOT NULL DEFAULT 0,
  total_duration_seconds INTEGER NOT NULL DEFAULT 0,
  progress_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_playlist_name CHECK (char_length(name) BETWEEN 1 AND 200),
  CONSTRAINT valid_color_hex CHECK (color_hex ~* '^#[a-fA-F0-9]{6}$')
);

-- ============================================
-- 7. PLAYLIST_VIDEOS (Junction)
-- Videos within playlists with ordering
-- ============================================
CREATE TABLE playlist_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Ordering
  position INTEGER NOT NULL,
  
  -- Progress tracking (denormalized for performance)
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Notes specific to this playlist context
  context_notes TEXT,
  
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(playlist_id, video_id),
  UNIQUE(playlist_id, position) DEFERRABLE INITIALLY DEFERRED
);

-- ============================================
-- 8. NOTES
-- Timestamp and general notes for videos
-- ============================================
CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  
  -- Note content
  type note_type NOT NULL DEFAULT 'general',
  title TEXT,
  content TEXT NOT NULL,
  
  -- Timestamp association
  timestamp_seconds INTEGER,
  end_timestamp_seconds INTEGER,
  
  -- Formatting
  is_rich_text BOOLEAN NOT NULL DEFAULT false,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  
  -- Learning metadata
  importance_rating INTEGER CHECK (importance_rating >= 1 AND importance_rating <= 5),
  comprehension_level INTEGER CHECK (comprehension_level >= 1 AND comprehension_level <= 3),
  
  -- Organization
  tags TEXT[],
  color_hex TEXT,
  
  -- Search
  search_vector tsvector,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_content CHECK (char_length(content) > 0),
  CONSTRAINT valid_timestamp CHECK (
    (type != 'timestamp' AND timestamp_seconds IS NULL AND end_timestamp_seconds IS NULL) OR
    (type = 'timestamp' AND timestamp_seconds IS NOT NULL)
  ),
  CONSTRAINT valid_timestamp_range CHECK (end_timestamp_seconds IS NULL OR end_timestamp_seconds > timestamp_seconds)
);

-- ============================================
-- 9. BOOKMARKS
-- Saved timestamps and moments
-- ============================================
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Bookmark details
  timestamp_seconds INTEGER NOT NULL,
  label TEXT,
  description TEXT,
  
  -- Categorization
  category TEXT,
  color_hex TEXT DEFAULT '#FFD700',
  
  -- Screenshot/thumbnail
  snapshot_url TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, video_id, timestamp_seconds),
  CONSTRAINT valid_timestamp CHECK (timestamp_seconds >= 0)
);

-- ============================================
-- 10. WATCH_SESSIONS
-- Individual watch sessions for detailed tracking
-- ============================================
CREATE TABLE watch_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  
  -- Session details
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER,
  start_position_seconds INTEGER NOT NULL DEFAULT 0,
  end_position_seconds INTEGER,
  
  -- Playback info
  playback_speed DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  quality TEXT,
  device_type TEXT,
  
  -- Session context
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  is_focus_mode BOOLEAN NOT NULL DEFAULT false,
  
  -- Engagement metrics
  pauses_count INTEGER DEFAULT 0,
  seeks_count INTEGER DEFAULT 0,
  completion_percentage DECIMAL(5,2),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_session_duration CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  CONSTRAINT valid_positions CHECK (end_position_seconds IS NULL OR end_position_seconds >= start_position_seconds)
);

-- ============================================
-- 11. LEARNING_SESSIONS
-- Focused learning sessions (can span multiple videos)
-- ============================================
CREATE TABLE learning_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Session details
  title TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  planned_duration_minutes INTEGER,
  actual_duration_seconds INTEGER,
  
  -- Context
  playlist_id UUID REFERENCES playlists(id) ON DELETE SET NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  topic TEXT,
  
  -- Metrics
  videos_watched INTEGER NOT NULL DEFAULT 0,
  videos_completed INTEGER NOT NULL DEFAULT 0,
  notes_taken INTEGER NOT NULL DEFAULT 0,
  bookmarks_created INTEGER NOT NULL DEFAULT 0,
  
  -- Self-assessment
  focus_rating INTEGER CHECK (focus_rating >= 1 AND focus_rating <= 5),
  productivity_rating INTEGER CHECK (productivity_rating >= 1 AND focus_rating <= 5),
  comprehension_score INTEGER CHECK (comprehension_score >= 1 AND comprehension_score <= 10),
  
  -- Mood tracking
  mood_before TEXT,
  mood_after TEXT,
  energy_level_before INTEGER CHECK (energy_level_before >= 1 AND energy_level_before <= 5),
  energy_level_after INTEGER CHECK (energy_level_after >= 1 AND energy_level_after <= 5),
  
  -- Notes & reflection
  session_notes TEXT,
  key_takeaways TEXT[],
  distractions_count INTEGER DEFAULT 0,
  
  -- Environment
  location TEXT,
  device TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 12. DAILY_STATS
-- Aggregated daily learning statistics
-- ============================================
CREATE TABLE daily_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Time metrics
  total_watch_time_seconds INTEGER NOT NULL DEFAULT 0,
  active_learning_minutes INTEGER NOT NULL DEFAULT 0,
  focus_mode_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Content metrics
  videos_watched INTEGER NOT NULL DEFAULT 0,
  videos_completed INTEGER NOT NULL DEFAULT 0,
  new_videos_added INTEGER NOT NULL DEFAULT 0,
  notes_created INTEGER NOT NULL DEFAULT 0,
  bookmarks_created INTEGER NOT NULL DEFAULT 0,
  playlists_created INTEGER NOT NULL DEFAULT 0,
  
  -- Categories explored
  categories_visited INTEGER NOT NULL DEFAULT 0,
  topics_studied TEXT[],
  
  -- Learning metrics
  average_comprehension DECIMAL(3,1),
  average_focus_rating DECIMAL(2,1),
  sessions_count INTEGER NOT NULL DEFAULT 0,
  
  -- Streak tracking
  streak_days INTEGER NOT NULL DEFAULT 0,
  daily_goal_achieved BOOLEAN NOT NULL DEFAULT false,
  daily_goal_percentage DECIMAL(5,2),
  
  -- Peak learning times
  peak_focus_hour INTEGER,
  total_pauses INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, date)
);

-- ============================================
-- 13. ACHIEVEMENTS
-- Gamification and learning milestones
-- ============================================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Achievement details
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  tier INTEGER CHECK (tier >= 1 AND tier <= 5) DEFAULT 1,
  
  -- Progress
  progress_current INTEGER NOT NULL DEFAULT 0,
  progress_target INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  
  -- Rewards
  xp_earned INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(user_id, type, tier)
);

-- ============================================
-- 14. TAGS
-- User-defined tags for organization
-- ============================================
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  color_hex TEXT DEFAULT '#3EA6FF',
  usage_count INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, name),
  CONSTRAINT valid_tag_name CHECK (char_length(name) BETWEEN 1 AND 50)
);

-- ============================================
-- INDEXES
-- ============================================

-- Profiles indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_profiles_last_active ON profiles(last_active_at DESC);

-- Videos indexes
CREATE INDEX idx_videos_youtube_id ON videos(youtube_id);
CREATE INDEX idx_videos_channel_id ON videos(channel_id);
CREATE INDEX idx_videos_published_at ON videos(published_at DESC);
CREATE INDEX idx_videos_category ON videos(category);
CREATE INDEX idx_videos_type ON videos(type);
CREATE INDEX idx_videos_difficulty ON videos(difficulty);
CREATE INDEX idx_videos_educational ON videos(is_educational) WHERE is_educational = true;
-- Full-text search index
CREATE INDEX idx_videos_search ON videos USING gin(search_vector);
-- Trigram index for fuzzy search
CREATE INDEX idx_videos_title_trgm ON videos USING gin(title gin_trgm_ops);

-- Categories indexes
CREATE INDEX idx_categories_user ON categories(user_id, sort_order);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_depth ON categories(depth);
-- Prevent circular references
CREATE INDEX idx_categories_hierarchy ON categories(user_id, parent_id, depth);

-- User videos indexes
CREATE INDEX idx_user_videos_user_status ON user_videos(user_id, status);
CREATE INDEX idx_user_videos_user_favorite ON user_videos(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_videos_user_bookmarked ON user_videos(user_id, is_bookmarked) WHERE is_bookmarked = true;
CREATE INDEX idx_user_videos_user_liked ON user_videos(user_id, is_liked) WHERE is_liked = true;
CREATE INDEX idx_user_videos_last_watched ON user_videos(user_id, last_watched_at DESC);
CREATE INDEX idx_user_videos_added ON user_videos(user_id, added_at DESC);
CREATE INDEX idx_user_videos_progress ON user_videos(user_id, progress_seconds) WHERE status = 'in_progress';
CREATE INDEX idx_user_videos_rating ON user_videos(user_id, user_rating) WHERE user_rating IS NOT NULL;
CREATE INDEX idx_user_videos_key_learning ON user_videos(user_id, is_key_learning) WHERE is_key_learning = true;

-- Playlists indexes
CREATE INDEX idx_playlists_user ON playlists(user_id, sort_order);
CREATE INDEX idx_playlists_learning_path ON playlists(user_id, is_learning_path) WHERE is_learning_path = true;
CREATE INDEX idx_playlists_visibility ON playlists(user_id, visibility);

-- Playlist videos indexes
CREATE INDEX idx_playlist_videos_playlist ON playlist_videos(playlist_id, position);
CREATE INDEX idx_playlist_videos_completed ON playlist_videos(playlist_id, is_completed) WHERE is_completed = true;

-- Notes indexes
CREATE INDEX idx_notes_user_video ON notes(user_id, video_id);
CREATE INDEX idx_notes_playlist ON notes(playlist_id) WHERE playlist_id IS NOT NULL;
CREATE INDEX idx_notes_type ON notes(user_id, type);
CREATE INDEX idx_notes_timestamp ON notes(video_id, timestamp_seconds) WHERE type = 'timestamp';
CREATE INDEX idx_notes_pinned ON notes(user_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX idx_notes_importance ON notes(user_id, importance_rating) WHERE importance_rating IS NOT NULL;
-- Full-text search on notes
CREATE INDEX idx_notes_search ON notes USING gin(search_vector);

-- Bookmarks indexes
CREATE INDEX idx_bookmarks_user_video ON bookmarks(user_id, video_id);
CREATE INDEX idx_bookmarks_timestamp ON bookmarks(video_id, timestamp_seconds);
CREATE INDEX idx_bookmarks_category ON bookmarks(user_id, category) WHERE category IS NOT NULL;

-- Watch sessions indexes
CREATE INDEX idx_watch_sessions_user_time ON watch_sessions(user_id, start_time DESC);
CREATE INDEX idx_watch_sessions_video ON watch_sessions(video_id, start_time DESC);
CREATE INDEX idx_watch_sessions_playlist ON watch_sessions(playlist_id) WHERE playlist_id IS NOT NULL;

-- Learning sessions indexes
CREATE INDEX idx_learning_sessions_user_time ON learning_sessions(user_id, start_time DESC);
CREATE INDEX idx_learning_sessions_playlist ON learning_sessions(playlist_id) WHERE playlist_id IS NOT NULL;
CREATE INDEX idx_learning_sessions_category ON learning_sessions(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX idx_learning_sessions_active ON learning_sessions(user_id) WHERE end_time IS NULL;

-- Daily stats indexes
CREATE INDEX idx_daily_stats_user_date ON daily_stats(user_id, date DESC);
CREATE INDEX idx_daily_stats_streak ON daily_stats(user_id, streak_days) WHERE streak_days > 0;
CREATE INDEX idx_daily_stats_goal_achieved ON daily_stats(user_id, date) WHERE daily_goal_achieved = true;

-- Achievements indexes
CREATE INDEX idx_achievements_user ON achievements(user_id, type);
CREATE INDEX idx_achievements_completed ON achievements(user_id, is_completed) WHERE is_completed = true;

-- Tags indexes
CREATE INDEX idx_tags_user ON tags(user_id, usage_count DESC);

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- ============================================
-- UPDATED_AT TRIGGER
-- Automatically updates the updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at 
  BEFORE UPDATE ON videos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_videos_updated_at 
  BEFORE UPDATE ON user_videos 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_playlists_updated_at 
  BEFORE UPDATE ON playlists 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notes_updated_at 
  BEFORE UPDATE ON notes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookmarks_updated_at 
  BEFORE UPDATE ON bookmarks 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_learning_sessions_updated_at 
  BEFORE UPDATE ON learning_sessions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_stats_updated_at 
  BEFORE UPDATE ON daily_stats 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_achievements_updated_at 
  BEFORE UPDATE ON achievements 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SEARCH VECTOR UPDATES
-- ============================================

-- Update video search vector
CREATE OR REPLACE FUNCTION update_video_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.channel_name, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_video_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, description, channel_name ON videos
  FOR EACH ROW EXECUTE FUNCTION update_video_search_vector();

-- Update note search vector
CREATE OR REPLACE FUNCTION update_note_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector = 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_note_search_vector_trigger
  BEFORE INSERT OR UPDATE OF title, content ON notes
  FOR EACH ROW EXECUTE FUNCTION update_note_search_vector();

-- ============================================
-- CATEGORY VIDEO COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_category_video_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE categories 
    SET video_count = video_count + 1,
        updated_at = NOW()
    WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE categories 
    SET video_count = GREATEST(video_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.category_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_category_count_on_insert
  AFTER INSERT ON video_categories
  FOR EACH ROW EXECUTE FUNCTION update_category_video_count();

CREATE TRIGGER update_category_count_on_delete
  AFTER DELETE ON video_categories
  FOR EACH ROW EXECUTE FUNCTION update_category_video_count();

-- ============================================
-- PLAYLIST STATS UPDATE
-- ============================================
CREATE OR REPLACE FUNCTION update_playlist_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE playlists 
    SET video_count = video_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playlist_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE playlists 
    SET video_count = GREATEST(video_count - 1, 0),
        updated_at = NOW()
    WHERE id = OLD.playlist_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlist_stats_on_insert
  AFTER INSERT ON playlist_videos
  FOR EACH ROW EXECUTE FUNCTION update_playlist_stats();

CREATE TRIGGER update_playlist_stats_on_delete
  AFTER DELETE ON playlist_videos
  FOR EACH ROW EXECUTE FUNCTION update_playlist_stats();

-- ============================================
-- USER VIDEO NOTES COUNT
-- ============================================
CREATE OR REPLACE FUNCTION update_user_video_notes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE user_videos 
    SET private_notes_count = private_notes_count + 1,
        updated_at = NOW()
    WHERE video_id = NEW.video_id AND user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_videos 
    SET private_notes_count = GREATEST(private_notes_count - 1, 0),
        updated_at = NOW()
    WHERE video_id = OLD.video_id AND user_id = OLD.user_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notes_count_on_insert
  AFTER INSERT ON notes
  FOR EACH ROW EXECUTE FUNCTION update_user_video_notes_count();

CREATE TRIGGER update_notes_count_on_delete
  AFTER DELETE ON notes
  FOR EACH ROW EXECUTE FUNCTION update_user_video_notes_count();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substring(NEW.id::text from 1 for 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- UPDATE DAILY STATS ON WATCH SESSION
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_stats_on_watch()
RETURNS TRIGGER AS $$
DECLARE
  stat_date DATE;
BEGIN
  stat_date := NEW.start_time::DATE;
  
  INSERT INTO daily_stats (user_id, date, total_watch_time_seconds, videos_watched)
  VALUES (NEW.user_id, stat_date, COALESCE(NEW.duration_seconds, 0), 1)
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_watch_time_seconds = daily_stats.total_watch_time_seconds + COALESCE(NEW.duration_seconds, 0),
    videos_watched = daily_stats.videos_watched + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stats_on_watch_session
  AFTER INSERT ON watch_sessions
  FOR EACH ROW EXECUTE FUNCTION update_daily_stats_on_watch();

-- ============================================
-- TAG USAGE COUNTER
-- ============================================
CREATE OR REPLACE FUNCTION increment_tag_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tags 
  SET usage_count = usage_count + 1
  WHERE id = NEW.tag_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PREVENT CIRCULAR CATEGORY REFERENCES
-- ============================================
CREATE OR REPLACE FUNCTION prevent_circular_category_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE category_tree AS (
      SELECT id, parent_id, 1 AS depth
      FROM categories
      WHERE id = NEW.parent_id
      
      UNION ALL
      
      SELECT c.id, c.parent_id, ct.depth + 1
      FROM categories c
      INNER JOIN category_tree ct ON c.id = ct.parent_id
      WHERE ct.depth < 10  -- Prevent infinite recursion
    )
    SELECT 1 FROM category_tree WHERE id = NEW.id
  ) THEN
    RAISE EXCEPTION 'Circular reference detected in category hierarchy';
  END IF;
  
  -- Set depth based on parent
  IF NEW.parent_id IS NULL THEN
    NEW.depth := 0;
  ELSE
    SELECT depth + 1 INTO NEW.depth FROM categories WHERE id = NEW.parent_id;
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
-- HELPER FUNCTIONS
-- ============================================

-- Get video progress percentage
CREATE OR REPLACE FUNCTION get_video_progress(p_video_id UUID, p_user_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_duration INTEGER;
  v_progress INTEGER;
BEGIN
  SELECT duration_seconds INTO v_duration FROM videos WHERE id = p_video_id;
  SELECT progress_seconds INTO v_progress FROM user_videos 
  WHERE video_id = p_video_id AND user_id = p_user_id;
  
  IF v_duration IS NULL OR v_duration = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND((v_progress::DECIMAL / v_duration::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql STABLE;

-- Search videos with full-text search
CREATE OR REPLACE FUNCTION search_videos(
  p_user_id UUID,
  p_query TEXT,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  channel_name TEXT,
  rank REAL,
  relevance TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.channel_name,
    ts_rank(v.search_vector, query) AS rank,
    CASE 
      WHEN ts_rank(v.search_vector, query) > 0.1 THEN 'high'
      WHEN ts_rank(v.search_vector, query) > 0.05 THEN 'medium'
      ELSE 'low'
    END AS relevance
  FROM videos v, 
       plainto_tsquery('english', p_query) query
  WHERE v.search_vector @@ query
  ORDER BY rank DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get learning stats for date range
CREATE OR REPLACE FUNCTION get_learning_stats(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(
  total_videos_watched BIGINT,
  total_watch_time_seconds BIGINT,
  total_notes INTEGER,
  average_focus_rating DECIMAL,
  streak_days INTEGER,
  completion_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ds.videos_watched), 0)::BIGINT,
    COALESCE(SUM(ds.total_watch_time_seconds), 0)::BIGINT,
    COALESCE(SUM(ds.notes_created), 0),
    ROUND(AVG(ds.average_focus_rating)::DECIMAL, 1),
    MAX(ds.streak_days),
    CASE 
      WHEN SUM(ds.videos_watched) > 0 
      THEN ROUND((SUM(ds.videos_completed)::DECIMAL / SUM(ds.videos_watched)::DECIMAL) * 100, 1)
      ELSE 0
    END
  FROM daily_stats ds
  WHERE ds.user_id = p_user_id
    AND ds.date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- GRANTS AND PERMISSIONS
-- ============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on all tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert, update, delete on user-owned tables
GRANT INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON user_videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON playlists TO authenticated;
GRANT INSERT, UPDATE, DELETE ON playlist_videos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON notes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON bookmarks TO authenticated;
GRANT INSERT, UPDATE, DELETE ON watch_sessions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON learning_sessions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON daily_stats TO authenticated;
GRANT INSERT, UPDATE, DELETE ON achievements TO authenticated;
GRANT INSERT, UPDATE, DELETE ON tags TO authenticated;

-- Videos are read-only for authenticated users (managed by system)
GRANT SELECT ON videos TO authenticated;
GRANT INSERT ON videos TO authenticated;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE profiles IS 'User profiles with preferences and learning goals';
COMMENT ON TABLE videos IS 'Core video content from YouTube';
COMMENT ON TABLE categories IS 'User-defined hierarchical categories';
COMMENT ON TABLE video_categories IS 'Many-to-many relationship between videos and categories';
COMMENT ON TABLE user_videos IS 'User''s personal video library with watch tracking';
COMMENT ON TABLE playlists IS 'Custom playlists and learning paths';
COMMENT ON TABLE playlist_videos IS 'Ordered videos within playlists';
COMMENT ON TABLE notes IS 'Timestamp and general notes for videos';
COMMENT ON TABLE bookmarks IS 'Saved timestamps and moments in videos';
COMMENT ON TABLE watch_sessions IS 'Individual video watch sessions';
COMMENT ON TABLE learning_sessions IS 'Focused learning sessions spanning multiple videos';
COMMENT ON TABLE daily_stats IS 'Aggregated daily learning statistics';
COMMENT ON TABLE achievements IS 'Gamification achievements and milestones';
COMMENT ON TABLE tags IS 'User-defined tags for organization';