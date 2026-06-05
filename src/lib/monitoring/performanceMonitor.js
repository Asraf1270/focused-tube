/**
 * Performance monitoring utilities
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {};
    this.observers = [];
    this.enabled = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    if (!this.enabled) return;

    this.observeCoreWebVitals();
    this.observeLongTasks();
    this.observeResourceTiming();
  }

  /**
   * Track Core Web Vitals
   */
  observeCoreWebVitals() {
    // Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    this.observers.push(lcpObserver);

    // First Input Delay (FID)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        this.metrics.FID = entry.processingStart - entry.startTime;
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
    this.observers.push(fidObserver);

    // Cumulative Layout Shift (CLS)
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.metrics.CLS = clsValue;
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
    this.observers.push(clsObserver);

    // Interaction to Next Paint (INP)
    const inpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        this.metrics.INP = entry.duration;
      });
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
    this.observers.push(inpObserver);
  }

  /**
   * Track long tasks
   */
  observeLongTasks() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.duration > 50) { // Tasks longer than 50ms
          console.warn(`Long task detected: ${entry.duration.toFixed(2)}ms`, entry);
          this.metrics.longTasks = (this.metrics.longTasks || 0) + 1;
        }
      });
    });
    observer.observe({ type: 'longtask', buffered: true });
    this.observers.push(observer);
  }

  /**
   * Track resource loading performance
   */
  observeResourceTiming() {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.duration > 1000) { // Resources taking >1s to load
          console.warn(`Slow resource load: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
        }
      });
    });
    observer.observe({ type: 'resource', buffered: true });
    this.observers.push(observer);
  }

  /**
   * Measure component render time
   */
  measureRender(componentName) {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      if (duration > 16) { // Longer than 1 frame
        console.warn(`Slow render: ${componentName} took ${duration.toFixed(2)}ms`);
      }
      return duration;
    };
  }

  /**
   * Get all collected metrics
   */
  getMetrics() {
    return { ...this.metrics };
  }

  /**
   * Cleanup observers
   */
  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();
export default performanceMonitor;