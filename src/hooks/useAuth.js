import { useContext, useCallback } from 'react';
import AuthContext from '@/contexts/AuthContext';

/**
 * Custom hook for authentication
 * Provides auth state and methods with error handling
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
      'Wrap your app with <AuthProvider> in the component tree.'
    );
  }

  const {
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
  } = context;

  /**
   * Check if user has required permissions
   */
  const hasPermission = useCallback((permission) => {
    // For single-user app, any authenticated user has all permissions
    return isAuthenticated;
  }, [isAuthenticated]);

  /**
   * Get user display name
   */
  const getUserDisplayName = useCallback(() => {
    if (profile?.display_name) return profile.display_name;
    if (user?.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  }, [user, profile]);

  /**
   * Get user avatar URL
   */
  const getUserAvatar = useCallback(() => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (user?.user_metadata?.avatar_url) return user.user_metadata.avatar_url;
    return null;
  }, [user, profile]);

  /**
   * Get user initials for avatar fallback
   */
  const getUserInitials = useCallback(() => {
    const name = getUserDisplayName();
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, [getUserDisplayName]);

  /**
   * Check if profile is complete
   */
  const isProfileComplete = useCallback(() => {
    return !!(profile?.display_name && profile?.username);
  }, [profile]);

  return {
    // State
    user,
    profile,
    session,
    loading,
    error,
    isAuthenticated,

    // Auth methods
    signInWithGoogle,
    signOut,
    updateProfile,
    refreshUser,

    // Utility methods
    hasPermission,
    getUserDisplayName,
    getUserAvatar,
    getUserInitials,
    isProfileComplete,
  };
}

export default useAuth;