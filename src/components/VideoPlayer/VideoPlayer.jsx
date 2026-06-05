import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Enhanced VideoPlayer with YouTube API integration
 * Exposes controls for seeking, play/pause, and time tracking
 */
const VideoPlayer = forwardRef(function VideoPlayer({ 
  videoId, 
  onReady, 
  onTimeUpdate, 
  onStateChange,
  startTime = 0,
  autoplay = true,
  className = '' 
}, ref) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerState, setPlayerState] = useState(-1); // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: cued
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(100);
  const [isMuted, setIsMuted] = useState(false);
  
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const timeUpdateIntervalRef = useRef(null);

  // YouTube Player States
  const PlayerState = {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5,
  };

  // Expose player controls to parent
  useImperativeHandle(ref, () => ({
    seekTo: (time) => {
      playerRef.current?.seekTo(time, true);
    },
    play: () => {
      playerRef.current?.playVideo();
    },
    pause: () => {
      playerRef.current?.pauseVideo();
    },
    togglePlay: () => {
      if (playerState === PlayerState.PLAYING) {
        playerRef.current?.pauseVideo();
      } else {
        playerRef.current?.playVideo();
      }
    },
    setVolume: (vol) => {
      playerRef.current?.setVolume(vol);
      setVolume(vol);
    },
    toggleMute: () => {
      if (isMuted) {
        playerRef.current?.unMute();
      } else {
        playerRef.current?.mute();
      }
      setIsMuted(!isMuted);
    },
    setPlaybackRate: (rate) => {
      playerRef.current?.setPlaybackRate(rate);
      setPlaybackRate(rate);
    },
    getCurrentTime: () => currentTime,
    getDuration: () => duration,
    getPlayerState: () => playerState,
  }));

  // Load YouTube API
  useEffect(() => {
    if (!videoId) return;

    // Load YouTube IFrame API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      cleanup();
    };
  }, [videoId]);

  // Update start time
  useEffect(() => {
    if (playerRef.current && startTime > 0) {
      playerRef.current.seekTo(startTime, true);
    }
  }, [startTime]);

  const initializePlayer = () => {
    cleanup();

    playerRef.current = new window.YT.Player(iframeRef.current, {
      videoId,
      playerVars: {
        autoplay: autoplay ? 1 : 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        controls: 1,
        fs: 1,
        iv_load_policy: 3,
        cc_load_policy: 1,
        start: Math.floor(startTime),
        enablejsapi: 1,
        origin: window.location.origin,
        widgetid: '1',
        playsinline: 1,
      },
      events: {
        onReady: handleReady,
        onStateChange: handleStateChange,
        onError: handleError,
      },
    });
  };

  const handleReady = (event) => {
    setIsLoading(false);
    setDuration(event.target.getDuration());
    
    // Start time tracking
    timeUpdateIntervalRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentTime(time);
        onTimeUpdate?.(time);
      }
    }, 250); // Update every 250ms for smooth UI

    onReady?.(event.target);
  };

  const handleStateChange = (event) => {
    setPlayerState(event.data);
    onStateChange?.(event.data);

    if (event.data === PlayerState.PLAYING) {
      setDuration(event.target.getDuration());
    }
  };

  const handleError = (event) => {
    setIsLoading(false);
    setError(getErrorMessage(event.data));
  };

  const getErrorMessage = (errorCode) => {
    const errors = {
      2: 'Invalid video ID. Please check the URL.',
      5: 'HTML5 player error. Try refreshing the page.',
      100: 'Video not found. It may have been removed.',
      101: 'Video embedding disabled by owner.',
      150: 'Video embedding disabled by owner.',
    };
    return errors[errorCode] || 'An error occurred while loading the video.';
  };

  const cleanup = () => {
    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }
    if (playerRef.current?.destroy) {
      playerRef.current.destroy();
    }
    playerRef.current = null;
  };

  // Build embed URL for fallback
  const embedUrl = `https://www.youtube.com/embed/${videoId}?${new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    modestbranding: '1',
    rel: '0',
    showinfo: '0',
    controls: '1',
    fs: '1',
    enablejsapi: '1',
    origin: window.location.origin,
    start: Math.floor(startTime),
  }).toString()}`;

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
              <p className="text-body-base text-text-secondary">Loading player...</p>
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
                onClick={() => { setError(null); setIsLoading(true); initializePlayer(); }}
                className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* YouTube Iframe (hidden, used by API) */}
      <div className="absolute inset-0 opacity-0 pointer-events-none">
        <div ref={iframeRef} />
      </div>

      {/* Fallback Iframe (shown if API fails) */}
      <iframe
        src={embedUrl}
        title="YouTube video player"
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => !playerRef.current && setIsLoading(false)}
      />
    </div>
  );
});

export default VideoPlayer;