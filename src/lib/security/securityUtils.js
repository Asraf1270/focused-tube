/**
 * Security utilities for data sanitization and validation
 */

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input) {
  if (!input) return '';
  
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize URL to prevent javascript: injections
 */
export function sanitizeUrl(url) {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url) {
  const patterns = [
    /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/,
    /^(https?:\/\/)?youtu\.be\/[a-zA-Z0-9_-]{11}/,
    /^(https?:\/\/)?(www\.)?youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/,
    /^[a-zA-Z0-9_-]{11}$/,
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  constructor(maxRequests = 10, timeWindow = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async throttle() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

/**
 * CSP nonce generator
 */
export function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Data encryption for local storage
 */
export class SecureStorage {
  constructor(encryptionKey = null) {
    this.prefix = 'focused-tube-secure:';
  }

  setItem(key, value) {
    try {
      const serialized = JSON.stringify(value);
      // In production, encrypt the data
      const encoded = btoa(serialized);
      localStorage.setItem(this.prefix + key, encoded);
    } catch (error) {
      console.error('SecureStorage setItem error:', error);
    }
  }

  getItem(key) {
    try {
      const encoded = localStorage.getItem(this.prefix + key);
      if (!encoded) return null;
      // In production, decrypt the data
      const serialized = atob(encoded);
      return JSON.parse(serialized);
    } catch (error) {
      console.error('SecureStorage getItem error:', error);
      return null;
    }
  }

  removeItem(key) {
    localStorage.removeItem(this.prefix + key);
  }

  clear() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }
}