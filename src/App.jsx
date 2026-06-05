import { useEffect, Suspense, lazy } from 'react';
import { RouterProvider, createBrowserRouter, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';
import { SupabaseProvider } from '@/providers/SupabaseProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { progressSyncManager } from '@/lib/sync/progressSyncManager';
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute/ProtectedRoute';
import MainLayout from '@/components/layout/MainLayout';
import AuthLayout from '@/components/layout/AuthLayout';
import LoadingScreen from '@/components/ui/LoadingScreen';

// Lazy load pages for code splitting
const Home = lazy(() => import('@/pages/Home/Home'));
const Watch = lazy(() => import('@/pages/Watch/Watch'));
const Search = lazy(() => import('@/pages/Search/Search'));
const AddVideo = lazy(() => import('@/pages/AddVideo/AddVideo'));
const Favorites = lazy(() => import('@/pages/Favorites/Favorites'));
const ContinueWatching = lazy(() => import('@/pages/ContinueWatching/ContinueWatching'));
const Library = lazy(() => import('@/pages/Library/Library'));
const History = lazy(() => import('@/pages/History/History'));
const Categories = lazy(() => import('@/pages/Categories/Categories'));
const Settings = lazy(() => import('@/pages/Settings/Settings'));
const Login = lazy(() => import('@/pages/Login/Login'));
const AuthCallback = lazy(() => import('@/pages/Auth/Callback'));
const NotFound = lazy(() => import('@/pages/NotFound/NotFound'));

// Loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-surface-base flex items-center justify-center">
    <div className="text-center">
      <div className="relative w-16 h-16 mx-auto mb-4">
        <div className="w-16 h-16 border-4 border-surface-hover rounded-full" />
        <div className="absolute top-0 left-0 w-16 h-16 border-4 border-accent-blue rounded-full border-t-transparent animate-spin" />
      </div>
      <p className="text-body-base text-text-secondary">Loading...</p>
    </div>
  </div>
);

// Wrap lazy component with Suspense
const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<PageLoader />}>
    {children}
  </Suspense>
);

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes
      gcTime: 30 * 60 * 1000,          // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        if (error?.code === 'AUTH_ERROR') return false;
        if (error?.code === 'NETWORK_ERROR') return failureCount < 3;
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: import.meta.env.PROD,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 2,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Router configuration
const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    errorElement: <NotFound />,
    children: [
      {
        index: true,
        element: <SuspenseWrapper><Home /></SuspenseWrapper>,
      },
      {
        path: 'watch/:videoId',
        element: <SuspenseWrapper><Watch /></SuspenseWrapper>,
      },
      {
        path: 'search',
        element: <SuspenseWrapper><Search /></SuspenseWrapper>,
      },
      {
        path: 'add-video',
        element: <SuspenseWrapper><AddVideo /></SuspenseWrapper>,
      },
      {
        path: 'favorites',
        element: <SuspenseWrapper><Favorites /></SuspenseWrapper>,
      },
      {
        path: 'continue-watching',
        element: <SuspenseWrapper><ContinueWatching /></SuspenseWrapper>,
      },
      {
        path: 'library',
        element: <SuspenseWrapper><Library /></SuspenseWrapper>,
      },
      {
        path: 'history',
        element: <SuspenseWrapper><History /></SuspenseWrapper>,
      },
      {
        path: 'categories',
        element: <SuspenseWrapper><Categories /></SuspenseWrapper>,
      },
      {
        path: 'settings',
        element: <SuspenseWrapper><Settings /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <AuthLayout />
      </PublicRoute>
    ),
    children: [
      {
        index: true,
        element: <SuspenseWrapper><Login /></SuspenseWrapper>,
      },
    ],
  },
  {
    path: '/auth/callback',
    element: <SuspenseWrapper><AuthCallback /></SuspenseWrapper>,
  },
  {
    path: '*',
    element: <SuspenseWrapper><NotFound /></SuspenseWrapper>,
  },
]);

export default function App() {
  // Initialize progress sync manager
  useEffect(() => {
    progressSyncManager.start({
      syncIntervalMs: 5000,
      maxRetries: 3,
    });

    return () => {
      progressSyncManager.stop();
    };
  }, []);

  // Register service worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <AuthProvider>
          <ThemeProvider>
            <RouterProvider router={router} />
            
            {/* Toast Notifications */}
            <Toaster
              position="bottom-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#1F1F1F',
                  color: '#F1F1F1',
                  border: '1px solid #2F2F2F',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  fontSize: '14px',
                },
                success: {
                  iconTheme: {
                    primary: '#2BA640',
                    secondary: '#F1F1F1',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#E8453C',
                    secondary: '#F1F1F1',
                  },
                  duration: 5000,
                },
              }}
              containerStyle={{
                bottom: 80, // Above bottom nav on mobile
              }}
            />
          </ThemeProvider>
        </AuthProvider>
      </SupabaseProvider>
      
      {/* React Query Devtools (Development only) */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom-left" />
      )}
    </QueryClientProvider>
  );
}