import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-surface-hover rounded-full" />
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-accent-blue rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="mt-4 text-text-secondary text-body-lg">
            Loading your learning space...
          </p>
          <p className="mt-2 text-text-tertiary text-body-sm">
            Preparing your distraction-free environment
          </p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the attempted URL for redirect after login
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location,
          message: 'Please sign in to access this page' 
        }} 
        replace 
      />
    );
  }

  // Render protected content
  return children;
}

/**
 * Public Route Component (redirects to home if already authenticated)
 */
export function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
      </div>
    );
  }

  // Redirect to home if already authenticated
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || '/';
    return <Navigate to={from} replace />;
  }

  // Render public content
  return children;
}