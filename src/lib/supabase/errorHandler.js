/**
 * Custom error types for Supabase operations
 */
export class SupabaseError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', details = {}) {
    super(message);
    this.name = 'SupabaseError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SupabaseError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export class AuthenticationError extends SupabaseError {
  constructor(message, details = {}) {
    super(message, 'AUTH_ERROR', details);
    this.name = 'AuthenticationError';
  }
}

export class DatabaseError extends SupabaseError {
  constructor(message, details = {}) {
    super(message, 'DATABASE_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class NetworkError extends SupabaseError {
  constructor(message, details = {}) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class ValidationError extends SupabaseError {
  constructor(message, details = {}) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

/**
 * Error code mappings from Supabase
 */
const SUPABASE_ERROR_CODES = {
  // Auth errors
  'invalid_credentials': { type: AuthenticationError, message: 'Invalid email or password' },
  'user_not_found': { type: AuthenticationError, message: 'User not found' },
  'email_taken': { type: AuthenticationError, message: 'Email already registered' },
  'weak_password': { type: ValidationError, message: 'Password is too weak' },
  'session_expired': { type: AuthenticationError, message: 'Session expired, please sign in again' },
  
  // Database errors
  '23505': { type: DatabaseError, message: 'Record already exists' }, // unique violation
  '23503': { type: DatabaseError, message: 'Referenced record not found' }, // foreign key violation
  '23514': { type: ValidationError, message: 'Invalid data provided' }, // check violation
  '42P01': { type: DatabaseError, message: 'Table not found' }, // undefined table
  
  // Network errors
  'fetch_error': { type: NetworkError, message: 'Network request failed' },
  'timeout': { type: NetworkError, message: 'Request timed out' },
};

/**
 * Error handler for Supabase operations
 */
export function handleSupabaseError(error, context = {}) {
  // If error is already a SupabaseError, return it
  if (error instanceof SupabaseError) {
    return error;
  }

  // Handle Supabase error objects
  if (error?.code) {
    const errorMapping = SUPABASE_ERROR_CODES[error.code];
    
    if (errorMapping) {
      return new errorMapping.type(
        errorMapping.message,
        {
          ...context,
          originalError: error,
          supabaseCode: error.code,
          supabaseMessage: error.message,
        }
      );
    }
  }

  // Handle specific error types
  if (error?.message?.includes('Failed to fetch') || error?.message?.includes('NetworkError')) {
    return new NetworkError(
      'Unable to connect to server. Please check your internet connection.',
      { ...context, originalError: error }
    );
  }

  if (error?.message?.includes('timeout')) {
    return new NetworkError(
      'Request timed out. Please try again.',
      { ...context, originalError: error }
    );
  }

  if (error?.status === 401 || error?.status === 403) {
    return new AuthenticationError(
      'You are not authorized to perform this action.',
      { ...context, originalError: error, status: error.status }
    );
  }

  // Log the error in development
  if (import.meta.env.VITE_NODE_ENV === 'development') {
    console.error('Supabase Error:', {
      error,
      context,
      stack: error?.stack,
    });
  }

  // Default error
  return new SupabaseError(
    error?.message || 'An unexpected error occurred',
    'UNKNOWN_ERROR',
    { ...context, originalError: error }
  );
}

/**
 * Error boundary handler for React components
 */
export function createErrorBoundaryHandler(onError) {
  return (error, errorInfo) => {
    const supabaseError = handleSupabaseError(error, {
      componentStack: errorInfo?.componentStack,
    });

    // Report error to monitoring service
    if (import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true') {
      reportError(supabaseError);
    }

    // Call custom error handler
    if (onError) {
      onError(supabaseError);
    }

    console.error('Error Boundary caught:', supabaseError);
  };
}

/**
 * Report errors to monitoring service (placeholder)
 */
function reportError(error) {
  // TODO: Integrate with error monitoring service (Sentry, LogRocket, etc.)
  if (import.meta.env.VITE_NODE_ENV === 'development') {
    console.log('Error reported:', error.toJSON());
  }
}

/**
 * Safe wrapper for Supabase queries
 * Automatically handles errors and returns structured response
 */
export async function safeQuery(queryFn, options = {}) {
  const { 
    retries = 3, 
    retryDelay = 1000,
    onError = null,
    fallbackValue = null,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await queryFn();
      return { data: result, error: null };
    } catch (error) {
      lastError = error;
      
      // Don't retry on validation or auth errors
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        break;
      }

      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  const supabaseError = handleSupabaseError(lastError);
  
  if (onError) {
    onError(supabaseError);
  }

  return { 
    data: fallbackValue, 
    error: supabaseError,
  };
}

/**
 * Toast notification helper for errors
 */
export function getErrorMessage(error) {
  if (error instanceof SupabaseError) {
    return error.message;
  }
  
  const supabaseError = handleSupabaseError(error);
  return supabaseError.message;
}

export default {
  handleSupabaseError,
  safeQuery,
  getErrorMessage,
  createErrorBoundaryHandler,
  SupabaseError,
  AuthenticationError,
  DatabaseError,
  NetworkError,
  ValidationError,
};