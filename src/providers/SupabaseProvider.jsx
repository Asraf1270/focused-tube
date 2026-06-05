import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useSupabaseConnection } from '@/hooks/useSupabaseConnection';
import { performHealthCheck } from '@/lib/supabase/healthCheck';

const SupabaseContext = createContext({});

export function SupabaseProvider({ children }) {
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState(null);
  
  const connection = useSupabaseConnection({
    checkInterval: 60000,
    autoCheck: true,
  });

  useEffect(() => {
    initializeSupabase();
  }, []);

  async function initializeSupabase() {
    try {
      // Perform initial health check
      const healthReport = await performHealthCheck();
      
      if (healthReport.status === 'unhealthy') {
        console.warn('Supabase initialization warning:', healthReport.errors);
      }

      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_OUT') {
            // Clear any cached data
            if (window.queryClient) {
              window.queryClient.clear();
            }
          }
        }
      );

      setInitialized(true);
      
      // Cleanup subscription on unmount
      return () => subscription.unsubscribe();
      
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      setInitError(error.message);
      setInitialized(true); // Still render the app
    }
  }

  const value = {
    supabase,
    ...connection,
    initialized,
    initError,
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4" />
          <p className="text-text-secondary">Initializing application...</p>
        </div>
      </div>
    );
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(SupabaseContext);
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
};