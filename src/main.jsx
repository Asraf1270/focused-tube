import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupabaseProvider } from '@/providers/SupabaseProvider';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

// Create React Query client with Supabase-aware defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.code === 'AUTH_ERROR') return false;
        // Retry up to 3 times for network errors
        if (error?.code === 'NETWORK_ERROR') return failureCount < 3;
        // Default retry logic
        return failureCount < 2;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: import.meta.env.VITE_NODE_ENV === 'production',
    },
    mutations: {
      retry: 2,
      onError: (error) => {
        console.error('Mutation error:', error);
      },
    },
  },
});

// Expose queryClient for auth state changes
window.queryClient = queryClient;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SupabaseProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1F1F1F',
              color: '#F1F1F1',
              border: '1px solid #2F2F2F',
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
            },
          }}
        />
      </SupabaseProvider>
    </QueryClientProvider>
  </React.StrictMode>
);