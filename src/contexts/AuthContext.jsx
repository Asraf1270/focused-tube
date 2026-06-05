import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService } from '@/lib/supabase/auth';
import { supabase } from '@/lib/supabase/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * Initialize auth state
   */
  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      try {
        setLoading(true);
        setError(null);

        // Get initial session
        const currentSession = await authService.getSession();
        
        if (!mounted) return;

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);

          // Fetch user profile
          const userProfile = await authService.getUserProfile(currentSession.user.id);
          if (mounted) {
            setProfile(userProfile);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeAuth();

    // Subscribe to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        console.log('Auth state changed:', event);

        switch (event) {
          case 'SIGNED_IN':
            setSession(newSession);
            setUser(newSession.user);
            setIsAuthenticated(true);

            // Fetch profile after sign in
            if (newSession?.user) {
              const userProfile = await authService.getUserProfile(newSession.user.id);
              if (mounted) {
                setProfile(userProfile);
              }
            }
            break;

          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setProfile(null);
            setIsAuthenticated(false);
            setError(null);
            break;

          case 'TOKEN_REFRESHED':
            setSession(newSession);
            break;

          case 'USER_UPDATED':
            setUser(newSession.user);
            if (newSession?.user) {
              const userProfile = await authService.getUserProfile(newSession.user.id);
              if (mounted) {
                setProfile(userProfile);
              }
            }
            break;

          default:
            break;
        }
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Sign in with Google
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.signInWithGoogle();
      // Redirect happens, no need to update state here
    } catch (err) {
      console.error('Google sign in error:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await authService.signOut();
      
      // State will be updated by the auth state listener
    } catch (err) {
      console.error('Sign out error:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  /**
   * Update user profile
   */
  const updateProfile = useCallback(async (updates) => {
    try {
      setError(null);
      const updatedProfile = await authService.updateProfile(updates);
      setProfile(updatedProfile);
      return updatedProfile;
    } catch (err) {
      console.error('Update profile error:', err);
      setError(err.message);
      throw err;
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authService.getUser();
      if (currentUser) {
        setUser(currentUser);
        const userProfile = await authService.getUserProfile(currentUser.id);
        setProfile(userProfile);
      }
    } catch (err) {
      console.error('Refresh user error:', err);
      setError(err.message);
    }
  }, []);

  const value = {
    user,
    profile,
    session,
    loading,
    error,
    isAuthenticated,
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;