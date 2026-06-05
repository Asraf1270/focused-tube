import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { ProtectedRoute, PublicRoute } from '@/components/ProtectedRoute/ProtectedRoute';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Lazy load pages
const Home = lazy(() => import('@/pages/Home/Home'));
const Watch = lazy(() => import('@/pages/Watch/Watch'));
const Library = lazy(() => import('@/pages/Library/Library'));
const History = lazy(() => import('@/pages/History/History'));
const Login = lazy(() => import('@/pages/Login/Login'));
const AuthCallback = lazy(() => import('@/pages/Auth/Callback'));
const NotFound = lazy(() => import('@/pages/NotFound/NotFound'));

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <SuspenseWrapper>
            <Home />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'watch/:videoId',
        element: (
          <SuspenseWrapper>
            <Watch />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'library',
        element: (
          <SuspenseWrapper>
            <Library />
          </SuspenseWrapper>
        ),
      },
      {
        path: 'history',
        element: (
          <SuspenseWrapper>
            <History />
          </SuspenseWrapper>
        ),
      },
    ],
  },
  {
    path: '/login',
    element: (
      <PublicRoute>
        <SuspenseWrapper>
          <Login />
        </SuspenseWrapper>
      </PublicRoute>
    ),
  },
  {
    path: '/auth/callback',
    element: (
      <SuspenseWrapper>
        <AuthCallback />
      </SuspenseWrapper>
    ),
  },
  {
    path: '*',
    element: (
      <SuspenseWrapper>
        <NotFound />
      </SuspenseWrapper>
    ),
  },
]);