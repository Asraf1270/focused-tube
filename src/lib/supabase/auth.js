import { supabase } from './client';

/**
 * Authentication service for FocusedTube
 * Handles all auth operations with Supabase
 */
export const authService = {
  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
            // Request specific scopes
            scopes: 'email profile openid',
          },
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Google sign in error:', error);
      throw error;
    }
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Clear local storage
      localStorage.removeItem('supabase.auth.token');
      localStorage.removeItem('focused-tube-auth');
      
      // Clear session storage
      sessionStorage.clear();
      
      return true;
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },

  /**
   * Get current session
   */
  async getSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  },

  /**
   * Get current user
   */
  async getUser() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  /**
   * Get user profile from database
   */
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          return await this.createUserProfile(userId);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      return null;
    }
  },

  /**
   * Create user profile
   */
  async createUserProfile(userId) {
    try {
      const user = await this.getUser();
      
      const profileData = {
        id: userId,
        username: user.email?.split('@')[0] || `user_${Date.now()}`,
        display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || null,
        preferences: {
          theme: 'dark',
          autoplay: false,
          playback_speed: 1.0,
          default_quality: 'auto',
          show_captions: true,
          focus_mode: {
            enabled: false,
            hide_comments: true,
            hide_suggestions: true,
            hide_likes: true,
          },
        },
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create user profile error:', error);
      return null;
    }
  },

  /**
   * Update user profile
   */
  async updateProfile(updates) {
    try {
      const user = await this.getUser();
      if (!user) throw new Error('No user logged in');

      // Update auth metadata if needed
      if (updates.display_name || updates.avatar_url) {
        await supabase.auth.updateUser({
          data: {
            full_name: updates.display_name,
            avatar_url: updates.avatar_url,
          },
        });
      }

      // Update profile in database
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update profile error:', error);
      throw error;
    }
  },

  /**
   * Set up auth state change listener
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user?.email);
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed');
      } else if (event === 'USER_UPDATED') {
        console.log('User updated');
      }

      callback(event, session);
    });
  },

  /**
   * Refresh session manually
   */
  async refreshSession() {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error('Refresh session error:', error);
      return null;
    }
  },
};

export default authService;