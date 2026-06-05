/**
 * Progress Sync Manager
 * Handles synchronization between local and remote progress
 */
class ProgressSyncManager {
  constructor() {
    this.syncQueue = new Map();
    this.syncInterval = null;
    this.isSyncing = false;
    this.listeners = new Set();
    this.localStorageKey = 'focused-tube-progress-queue';
  }

  /**
   * Start the sync manager
   */
  start(options = {}) {
    const { syncIntervalMs = 5000, maxRetries = 3 } = options;

    // Load queued items from localStorage
    this.loadQueue();

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      this.processQueue(maxRetries);
    }, syncIntervalMs);

    // Sync on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.processQueue(maxRetries);
      }
    });

    // Sync before page unload
    window.addEventListener('beforeunload', () => {
      this.processQueue(maxRetries);
    });

    console.log('🔁 Progress sync manager started');
  }

  /**
   * Stop the sync manager
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Queue a progress update
   */
  queueUpdate(videoId, progress, options = {}) {
    const queueItem = {
      videoId,
      progress: {
        positionSeconds: Math.floor(progress.positionSeconds || 0),
        durationSeconds: progress.durationSeconds || null,
        status: progress.status || 'in_progress',
      },
      options,
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.set(videoId, queueItem);
    this.saveQueue();
    this.notifyListeners('queued', queueItem);
  }

  /**
   * Queue playback state
   */
  queuePlaybackState(videoId, state) {
    const queueItem = {
      videoId,
      playbackState: {
        currentTime: Math.floor(state.currentTime || 0),
        playbackRate: state.playbackRate || 1.0,
        volume: state.volume ?? 100,
        isMuted: state.isMuted || false,
        quality: state.quality || null,
        captionsEnabled: state.captionsEnabled || false,
        captionLanguage: state.captionLanguage || 'en',
      },
      type: 'playback_state',
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.syncQueue.set(`playback_${videoId}`, queueItem);
    this.saveQueue();
  }

  /**
   * Process the sync queue
   */
  async processQueue(maxRetries = 3) {
    if (this.isSyncing || this.syncQueue.size === 0) return;

    this.isSyncing = true;
    const { progressService } = await import('@/lib/supabase/services/progressService');

    try {
      const promises = [];

      for (const [key, item] of this.syncQueue.entries()) {
        if (item.retryCount >= maxRetries) {
          // Remove items that exceeded max retries
          this.syncQueue.delete(key);
          this.notifyListeners('failed', item);
          continue;
        }

        const promise = this.syncItem(item, progressService)
          .then(() => {
            this.syncQueue.delete(key);
            this.notifyListeners('synced', item);
          })
          .catch((error) => {
            item.retryCount++;
            this.syncQueue.set(key, item);
            this.notifyListeners('error', { item, error });
            console.error(`Failed to sync ${key}:`, error);
          });

        promises.push(promise);
      }

      await Promise.allSettled(promises);
      this.saveQueue();
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single item
   */
  async syncItem(item, progressService) {
    if (item.type === 'playback_state') {
      return progressService.savePlaybackState(item.videoId, item.playbackState);
    }

    return progressService.updateProgress(
      item.videoId,
      item.progress.positionSeconds,
      {
        durationSeconds: item.progress.durationSeconds,
        status: item.progress.status,
        createSnapshot: true,
      }
    );
  }

  /**
   * Subscribe to sync events
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners
   */
  notifyListeners(event, data) {
    this.listeners.forEach(listener => {
      try {
        listener(event, data);
      } catch (error) {
        console.error('Sync listener error:', error);
      }
    });
  }

  /**
   * Save queue to localStorage
   */
  saveQueue() {
    try {
      const serialized = JSON.stringify(Array.from(this.syncQueue.entries()));
      localStorage.setItem(this.localStorageKey, serialized);
    } catch (error) {
      console.warn('Failed to save sync queue:', error);
    }
  }

  /**
   * Load queue from localStorage
   */
  loadQueue() {
    try {
      const stored = localStorage.getItem(this.localStorageKey);
      if (stored) {
        const entries = JSON.parse(stored);
        this.syncQueue = new Map(entries);
        console.log(`📦 Loaded ${this.syncQueue.size} items from sync queue`);
      }
    } catch (error) {
      console.warn('Failed to load sync queue:', error);
      this.syncQueue = new Map();
    }
  }

  /**
   * Get queue size
   */
  getQueueSize() {
    return this.syncQueue.size;
  }

  /**
   * Clear the queue
   */
  clearQueue() {
    this.syncQueue.clear();
    localStorage.removeItem(this.localStorageKey);
    this.notifyListeners('cleared', null);
  }
}

// Singleton instance
export const progressSyncManager = new ProgressSyncManager();

export default progressSyncManager;