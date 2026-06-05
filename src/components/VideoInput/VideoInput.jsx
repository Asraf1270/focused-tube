import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { validateYouTubeUrl } from '@/lib/youtube/urlParser';

export default function VideoInput({ 
  value, 
  onChange, 
  onSubmit, 
  error, 
  isLoading, 
  disabled,
  className = '' 
}) {
  const inputRef = useRef(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handlePaste = async (e) => {
    const pastedText = e.clipboardData?.getData('text');
    
    if (pastedText) {
      const validation = validateYouTubeUrl(pastedText.trim());
      
      if (validation.isValid) {
        e.preventDefault();
        onChange(pastedText.trim());
        // Auto-submit on valid paste
        setTimeout(() => onSubmit(pastedText.trim()), 100);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) {
        onSubmit(value);
      }
    }
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className={className}>
      <div className="relative">
        {/* Input Container */}
        <div className={`
          relative flex items-center bg-surface-raised 
          border rounded-xl transition-all duration-200
          ${error 
            ? 'border-error focus-within:border-error focus-within:ring-1 focus-within:ring-error' 
            : 'border-border-subtle focus-within:border-accent-blue focus-within:ring-1 focus-within:ring-accent-blue'
          }
          ${disabled ? 'opacity-50' : ''}
        `}>
          {/* Left Icon */}
          <div className="absolute left-4">
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 text-text-tertiary" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
              </svg>
            )}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube URL or video ID..."
            disabled={disabled || isLoading}
            className="w-full pl-12 pr-32 py-4 bg-transparent text-body-base text-text-primary
                     placeholder:text-text-tertiary outline-none"
            autoComplete="off"
            spellCheck={false}
            aria-label="YouTube video URL"
            aria-invalid={!!error}
            aria-describedby={error ? 'video-input-error' : undefined}
          />

          {/* Right Actions */}
          <div className="absolute right-3 flex items-center gap-2">
            {/* Clear Button */}
            <AnimatePresence>
              {value && !isLoading && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleClear}
                  disabled={disabled}
                  className="p-2 text-text-tertiary hover:text-text-secondary 
                           hover:bg-surface-hover rounded-lg transition-colors"
                  aria-label="Clear input"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              onClick={() => value.trim() && onSubmit(value)}
              disabled={!value.trim() || isLoading || disabled}
              className="px-5 py-2.5 bg-accent-blue text-white rounded-lg font-medium
                       hover:bg-accent-blue-hover 
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200
                       flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Video</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              id="video-input-error"
              className="mt-3 flex items-start gap-2"
            >
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-error/10 flex items-center justify-center mt-0.5">
                <svg className="w-3 h-3 text-error" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-body-sm text-error">{error}</p>
                <p className="text-body-xs text-text-tertiary mt-1">
                  Try pasting a full YouTube URL like:
                  <br />
                  <code className="text-accent-blue">https://www.youtube.com/watch?v=dQw4w9WgXcQ</code>
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}