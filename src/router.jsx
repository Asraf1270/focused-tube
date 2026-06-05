import { createBrowserRouter } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from './components/layout/MainLayout';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home/Home'));
const Watch = lazy(() => import('./pages/Watch/Watch'));
const Library = lazy(() => import('./pages/Library/Library'));
const History = lazy(() => import('./pages/History/History'));
const LikedVideos = lazy(() => import('./pages/LikedVideos/LikedVideos'));
const NotFound = lazy(() => import('./pages/NotFound/NotFound'));

const SuspenseWrapper = ({ children }) => (
  <Suspense fallback={<LoadingSpinner />}>
    {children}
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
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
      {
        path: 'liked-videos',
        element: (
          <SuspenseWrapper>
            <LikedVideos />
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
    ],
  },
]);