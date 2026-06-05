/**
 * Centralized Error Monitoring System
 */

// Error severity levels
export const ErrorSeverity = {
  FATAL: 'fatal',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Error context enrichment
class ErrorMonitor {
  constructor() {
    this.enabled = import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true';
    this.environment = import.meta.env.VITE_NODE_ENV || 'development';
    this.version = import.meta.env.VITE_APP_VERSION || '1.0.0';
    this.errors = [];
    this.maxStoredErrors = 100;
    this.listeners = new Set();
  }

  /**
   * Capture and report an error
   */
  captureError(error, context = {}) {
    const enrichedError = this.enrichError(error, context);
    
    // Always log in development
    if (this.environment === 'development') {
      console.error('[ErrorMonitor]', enrichedError);
    }

    // Store error
    this.errors.unshift(enrichedError);
    if (this.errors.length > this.maxStoredErrors) {
      this.errors.pop();
    }

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(enrichedError);
      } catch (e) {
        console.error('Error listener failed:', e);
      }
    });

    // Send to monitoring service in production
    if (this.enabled && this.environment === 'production') {
      this.sendToService(enrichedError);
    }

    return enrichedError;
  }

  /**
   * Enrich error with additional context
   */
  enrichError(error, context = {}) {
    return {
      id: crypto.randomUUID?.() || Date.now().toString(36),
      timestamp: new Date().toISOString(),
      environment: this.environment,
      version: this.version,
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
      name: error?.name || 'Error',
      code: error?.code || null,
      severity: context.severity || ErrorSeverity.ERROR,
      component: context.component || null,
      action: context.action || null,
      userId: context.userId || null,
      url: window.location.href,
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      additionalContext: {
        ...context,
        // Remove sensitive data
        password: undefined,
        token: undefined,
        key: undefined,
      },
    };
  }

  /**
   * Send error to monitoring service
   */
  async sendToService(error) {
    try {
      // Example: Send to custom endpoint or service like Sentry
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(error),
      // });

      // For now, log to console in a structured way
      console.error('[Production Error]', JSON.stringify(error, null, 2));
    } catch (e) {
      console.error('Failed to send error to service:', e);
    }
  }

  /**
   * Capture unhandled promise rejections
   */
  captureUnhandledRejections() {
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(event.reason, {
        severity: ErrorSeverity.ERROR,
        action: 'unhandled_promise_rejection',
      });
    });
  }

  /**
   * Capture global errors
   */
  captureGlobalErrors() {
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        severity: ErrorSeverity.FATAL,
        action: 'global_error',
        component: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
      });
    });
  }

  /**
   * Subscribe to error events
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get all stored errors
   */
  getErrors() {
    return [...this.errors];
  }

  /**
   * Clear stored errors
   */
  clearErrors() {
    this.errors = [];
  }
}

// Singleton instance
export const errorMonitor = new ErrorMonitor();

export default errorMonitor;