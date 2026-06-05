import { useState, useEffect } from 'react';
import { performHealthCheck } from '@/lib/supabase/healthCheck';
import { supabase } from '@/lib/supabase/client';

export default function ConnectionTest() {
  const [healthReport, setHealthReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    runHealthCheck();
  }, []);

  async function runHealthCheck() {
    try {
      setLoading(true);
      setError(null);
      
      const report = await performHealthCheck();
      setHealthReport(report);
      
      if (import.meta.env.VITE_NODE_ENV === 'development') {
        console.log('🔍 Health Check Report:', report);
      }
    } catch (err) {
      setError(err.message);
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'unhealthy': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue" />
        <span className="ml-3 text-text-secondary">Testing connection...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-error/10 border border-error/20 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <h3 className="text-lg font-semibold text-error">Connection Failed</h3>
        </div>
        <p className="text-text-secondary mb-4">{error}</p>
        <button
          onClick={runHealthCheck}
          className="px-4 py-2 bg-surface-hover rounded-md hover:bg-surface-active transition-colors"
        >
          Retry Connection Test
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-surface-raised border border-border-subtle rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(healthReport?.status)}`} />
          <h3 className="text-lg font-semibold text-text-primary">
            Connection Status: {healthReport?.status?.charAt(0).toUpperCase() + healthReport?.status?.slice(1)}
          </h3>
        </div>
        <button
          onClick={runHealthCheck}
          className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
        >
          Test Again
        </button>
      </div>

      {/* Connection Details */}
      <div className="space-y-4">
        <div className="bg-surface-overlay rounded-md p-4">
          <h4 className="text-body-sm font-medium text-text-secondary mb-2">Database Connectivity</h4>
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-text-tertiary">Status</span>
            <span className={healthReport?.checks?.connectivity?.connected ? 'text-success' : 'text-error'}>
              {healthReport?.checks?.connectivity?.connected ? '✓ Connected' : '✗ Disconnected'}
            </span>
          </div>
          {healthReport?.checks?.connectivity?.latency && (
            <div className="flex items-center justify-between mt-1">
              <span className="text-body-sm text-text-tertiary">Latency</span>
              <span className="text-body-sm text-text-secondary">
                {healthReport.checks.connectivity.latency}ms
              </span>
            </div>
          )}
        </div>

        <div className="bg-surface-overlay rounded-md p-4">
          <h4 className="text-body-sm font-medium text-text-secondary mb-2">Authentication</h4>
          <div className="flex items-center justify-between">
            <span className="text-body-sm text-text-tertiary">Service</span>
            <span className={healthReport?.checks?.auth?.authWorking ? 'text-success' : 'text-error'}>
              {healthReport?.checks?.auth?.authWorking ? '✓ Working' : '✗ Failed'}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-body-sm text-text-tertiary">Session</span>
            <span className="text-body-sm text-text-secondary">
              {healthReport?.checks?.auth?.hasSession ? 'Active' : 'None'}
            </span>
          </div>
        </div>

        <div className="bg-surface-overlay rounded-md p-4">
          <h4 className="text-body-sm font-medium text-text-secondary mb-2">Database Tables</h4>
          {healthReport?.checks?.tables && Object.entries(healthReport.checks.tables).map(([table, status]) => (
            <div key={table} className="flex items-center justify-between mt-1">
              <span className="text-body-sm text-text-tertiary">{table}</span>
              <span className={status.accessible ? 'text-success' : 'text-error'}>
                {status.accessible ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Environment Info */}
      <div className="mt-4 pt-4 border-t border-border-subtle">
        <div className="flex items-center justify-between text-body-xs text-text-tertiary">
          <span>Environment: {healthReport?.environment}</span>
          <span>Checked: {new Date(healthReport?.timestamp).toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Errors */}
      {healthReport?.errors?.length > 0 && (
        <div className="mt-4 p-4 bg-error/5 border border-error/20 rounded-md">
          <h4 className="text-body-sm font-medium text-error mb-2">
            Errors ({healthReport.errors.length})
          </h4>
          {healthReport.errors.map((err, index) => (
            <div key={index} className="text-body-xs text-text-secondary mt-1">
              <span className="font-medium">{err.component}:</span> {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}