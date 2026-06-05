import { supabase } from './client';

/**
 * Health check configuration
 */
const HEALTH_CHECK_CONFIG = {
  timeout: 5000, // 5 seconds timeout
  retries: 3,
  retryDelay: 1000, // 1 second between retries
  requiredTables: ['profiles', 'videos', 'user_videos', 'playlists', 'notes'],
};

/**
 * Custom error class for Supabase connection issues
 */
export class SupabaseConnectionError extends Error {
  constructor(message, originalError = null, context = {}) {
    super(message);
    this.name = 'SupabaseConnectionError';
    this.originalError = originalError;
    this.context = context;
    this.timestamp = new Date().toISOString();
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupabaseConnectionError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
      stack: this.stack,
    };
  }
}

/**
 * Test basic connectivity to Supabase
 */
async function testConnectivity() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_CONFIG.timeout);

  try {
    const startTime = performance.now();
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);
    const latency = Math.round(performance.now() - startTime);

    if (error) {
      throw new SupabaseConnectionError(
        'Failed to connect to Supabase database',
        error,
        { errorCode: error.code, errorMessage: error.message, latency }
      );
    }

    return {
      connected: true,
      latency,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new SupabaseConnectionError(
        `Connection timeout after ${HEALTH_CHECK_CONFIG.timeout}ms`,
        error,
        { timeout: HEALTH_CHECK_CONFIG.timeout }
      );
    }

    throw error;
  }
}

/**
 * Test authentication service
 */
async function testAuth() {
  try {
    const { data, error } = await supabase.auth.getSession();
    
    if (error) {
      throw new SupabaseConnectionError(
        'Failed to connect to Supabase authentication service',
        error,
        { errorCode: error.code }
      );
    }

    return {
      authWorking: true,
      hasSession: !!data.session,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof SupabaseConnectionError) {
      throw error;
    }
    
    throw new SupabaseConnectionError(
      'Authentication service check failed',
      error
    );
  }
}

/**
 * Check if required database tables exist and are accessible
 */
async function testTables() {
  const tableResults = {};
  
  for (const table of HEALTH_CHECK_CONFIG.requiredTables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true })
        .limit(1);

      tableResults[table] = {
        accessible: !error,
        error: error ? error.message : null,
      };
    } catch (error) {
      tableResults[table] = {
        accessible: false,
        error: error.message,
      };
    }
  }

  return tableResults;
}

/**
 * Perform retry logic for health checks
 */
async function withRetry(operation, operationName) {
  let lastError;

  for (let attempt = 1; attempt <= HEALTH_CHECK_CONFIG.retries; attempt++) {
    try {
      const result = await operation();
      return result;
    } catch (error) {
      lastError = error;
      
      if (attempt < HEALTH_CHECK_CONFIG.retries) {
        console.warn(
          `Health check "${operationName}" failed (attempt ${attempt}/${HEALTH_CHECK_CONFIG.retries}). ` +
          `Retrying in ${HEALTH_CHECK_CONFIG.retryDelay}ms...`
        );
        await new Promise(resolve => setTimeout(resolve, HEALTH_CHECK_CONFIG.retryDelay));
      }
    }
  }

  throw lastError;
}

/**
 * Comprehensive health check
 */
export async function performHealthCheck() {
  const healthReport = {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: import.meta.env.VITE_NODE_ENV,
    checks: {
      connectivity: null,
      auth: null,
      tables: null,
    },
    errors: [],
  };

  // Test connectivity
  try {
    healthReport.checks.connectivity = await withRetry(testConnectivity, 'connectivity');
  } catch (error) {
    healthReport.errors.push({
      component: 'connectivity',
      message: error.message,
      context: error.context,
    });
    healthReport.checks.connectivity = { connected: false };
  }

  // Test auth
  try {
    healthReport.checks.auth = await withRetry(testAuth, 'auth');
  } catch (error) {
    healthReport.errors.push({
      component: 'auth',
      message: error.message,
      context: error.context,
    });
    healthReport.checks.auth = { authWorking: false };
  }

  // Test tables
  try {
    healthReport.checks.tables = await withRetry(testTables, 'tables');
  } catch (error) {
    healthReport.errors.push({
      component: 'tables',
      message: error.message,
    });
    healthReport.checks.tables = {};
  }

  // Determine overall status
  const hasConnectivity = healthReport.checks.connectivity?.connected;
  const hasAuth = healthReport.checks.auth?.authWorking;
  const tablesAccessible = healthReport.checks.tables 
    ? Object.values(healthReport.checks.tables).every(t => t.accessible)
    : false;

  healthReport.status = (hasConnectivity && hasAuth && tablesAccessible) 
    ? 'healthy' 
    : 'degraded';

  return healthReport;
}

/**
 * Quick connection check (lightweight)
 */
export async function quickConnectionCheck() {
  try {
    const { data } = await supabase.auth.getSession();
    return {
      connected: true,
      authenticated: !!data?.session,
    };
  } catch (error) {
    return {
      connected: false,
      authenticated: false,
      error: error.message,
    };
  }
}

/**
 * Start periodic health monitoring
 */
export function startHealthMonitoring(callback, intervalMs = 60000) {
  const check = async () => {
    try {
      const report = await performHealthCheck();
      callback(report);
    } catch (error) {
      console.error('Health monitoring failed:', error);
      callback({
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  };

  // Initial check
  check();

  // Periodic checks
  const intervalId = setInterval(check, intervalMs);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

export default {
  performHealthCheck,
  quickConnectionCheck,
  startHealthMonitoring,
  SupabaseConnectionError,
};