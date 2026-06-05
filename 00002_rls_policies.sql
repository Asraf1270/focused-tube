-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- Single-user project: Only owner can access their data
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_categories ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Profile is created automatically via trigger
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- VIDEOS POLICIES
-- ============================================

-- All authenticated users can read videos (shared content)
CREATE POLICY "Anyone can view videos"
  ON videos FOR SELECT
  USING (true);

-- Only allow insert through service role or functions
CREATE POLICY "Service can insert videos"
  ON videos FOR INSERT
  WITH CHECK (true);  -- Will be restricted at application level

-- ============================================
-- USER_VIDEOS POLICIES
-- ============================================

-- Users can view their own video relationships
CREATE POLICY "Users can view own video data"
  ON user_videos FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add videos to their collection
CREATE POLICY "Users can add videos to collection"
  ON user_videos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their video progress
CREATE POLICY "Users can update their video progress"
  ON user_videos FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can remove videos from their collection
CREATE POLICY "Users can remove videos from collection"
  ON user_videos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PLAYLISTS POLICIES
-- ============================================

-- Users can view their own playlists
CREATE POLICY "Users can view own playlists"
  ON playlists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create playlists
CREATE POLICY "Users can create playlists"
  ON playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their playlists
CREATE POLICY "Users can update own playlists"
  ON playlists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their playlists
CREATE POLICY "Users can delete own playlists"
  ON playlists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- PLAYLIST_VIDEOS POLICIES
-- ============================================

-- Users can view videos in their playlists
CREATE POLICY "Users can view playlist videos"
  ON playlist_videos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_videos.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

-- Users can add videos to their playlists
CREATE POLICY "Users can add videos to playlists"
  ON playlist_videos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_videos.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

-- Users can remove videos from their playlists
CREATE POLICY "Users can remove playlist videos"
  ON playlist_videos FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM playlists
      WHERE playlists.id = playlist_videos.playlist_id
      AND playlists.user_id = auth.uid()
    )
  );

-- ============================================
-- NOTES POLICIES
-- ============================================

-- Users can view their own notes
CREATE POLICY "Users can view own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create notes
CREATE POLICY "Users can create notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their notes
CREATE POLICY "Users can update own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their notes
CREATE POLICY "Users can delete own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- LEARNING_SESSIONS POLICIES
-- ============================================

-- Users can view their own learning sessions
CREATE POLICY "Users can view own learning sessions"
  ON learning_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create learning sessions
CREATE POLICY "Users can create learning sessions"
  ON learning_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their learning sessions
CREATE POLICY "Users can update own learning sessions"
  ON learning_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- DAILY_STATS POLICIES
-- ============================================

-- Users can view their own daily stats
CREATE POLICY "Users can view own daily stats"
  ON daily_stats FOR SELECT
  USING (auth.uid() = user_id);

-- System can insert/update daily stats
CREATE POLICY "System can manage daily stats"
  ON daily_stats FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- CATEGORIES POLICIES
-- ============================================

-- Users can manage their own categories
CREATE POLICY "Users can manage own categories"
  ON categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- VIDEO_CATEGORIES POLICIES
-- ============================================

-- Users can manage their video categorizations
CREATE POLICY "Users can manage video categories"
  ON video_categories FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HELPER FUNCTIONS FOR COMPLEX POLICIES
-- ============================================

-- Function to get user's video status
CREATE OR REPLACE FUNCTION get_user_video_status(p_video_id UUID)
RETURNS content_status AS $$
  SELECT status FROM user_videos
  WHERE user_id = auth.uid() AND video_id = p_video_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to get user's playlists
CREATE OR REPLACE FUNCTION get_user_playlists()
RETURNS SETOF playlists AS $$
  SELECT * FROM playlists
  WHERE user_id = auth.uid()
  ORDER BY sort_order;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to search user's notes
CREATE OR REPLACE FUNCTION search_user_notes(search_query TEXT)
RETURNS SETOF notes AS $$
  SELECT * FROM notes
  WHERE user_id = auth.uid()
  AND to_tsvector('english', content) @@ to_tsquery('english', search_query)
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY DEFINER;