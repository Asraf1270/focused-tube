import { useState, useEffect, useCallback } from 'react';
import { quickConnectionCheck } from '@/lib/supabase/healthCheck';

export function useSupabaseConnection(options = {}) {
  const { 
    checkInterval = 30000, // Check every 30 seconds
    autoCheck = true,
    onConnectionChange = null,
  } = options;

  const [isConnected, setIsConnected] = useState(true); // Optimistic
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      const result = await quickConnectionCheck();
      
      setIsConnected(result.connected);
      setIsAuthenticated(result.authenticated);
      setLastChecked(new Date().toISOString());

      if (result.error) {
        setError(result.error);
      }

      // Notify on connection change
      if (onConnectionChange) {
        onConnectionChange(result);
      }

      return result;
    } catch (err) {
      setIsConnected(false);
      setError(err.message);
      
      if (onConnectionChange) {
        onConnectionChange({ connected: false, error: err.message });
      }
    } finally {
      setIsChecking(false);
    }
  }, [onConnectionChange]);

  useEffect(() => {
    if (autoCheck) {
      // Initial check
      checkConnection();

      // Periodic checks
      const intervalId = setInterval(checkConnection, checkInterval);

      return () => clearInterval(intervalId);
    }
  }, [autoCheck, checkInterval, checkConnection]);

  return {
    isConnected,
    isAuthenticated,
    isChecking,
    lastChecked,
    error,
    checkConnection,
  };
}