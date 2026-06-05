import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function VideoPlayer({ 
  videoId, 
  onReady, 
  onProgress, 
  startTime = 0,
  autoplay = true,
  className = '' 
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(autoplay);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);

  // Build YouTube embed URL with parameters
  const embedUrl = `https://www.youtube.com/embed/${videoId}?${new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    modestbranding: '1',
    rel: '0',
    showinfo: '0',
    controls: '1',
    fs: '1',
    iv_load_policy: '3',
    cc_load_policy: '1',
    start: Math.floor(startTime),
    enablejsapi: '1',
    origin: window.location.origin,
    widgetid: '1',
  }).toString()}`;

  useEffect(() => {
    // Reset state when video changes
    setIsLoading(true);
    setError(null);
  }, [videoId]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onReady?.();
  }, [onReady]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError('Failed to load video. Please try again.');
  }, []);

  return (
    <div className={`relative w-full h-full bg-black ${className}`}>
      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-surface-base z-10"
          >
            <div className="text-center">
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="w-16 h-16 border-4 border-surface-hover rounded-full" />
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-accent-blue rounded-full border-t-transparent animate-spin" />
              </div>
              <p className="text-body-base text-text-secondary">Loading video...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex items-center justify-center bg-surface-base z-10"
          >
            <div className="text-center max-w-md p-8">
              <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-heading-sm font-semibold text-text-primary mb-2">
                Video Unavailable
              </h3>
              <p className="text-body-base text-text-secondary mb-4">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  setIsLoading(true);
                  // Force iframe reload
                  if (iframeRef.current) {
                    iframeRef.current.src = iframeRef.current.src;
                  }
                }}
                className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YouTube Iframe */}
      <iframe
        ref={iframeRef}
        src={embedUrl}
        title="YouTube video player"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={handleLoad}
        onError={handleError}
      />

      {/* Focus Mode Controls Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-white hover:bg-white/10 rounded-full transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}