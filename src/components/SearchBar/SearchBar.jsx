import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchBar({ 
  value = '', 
  onChange, 
  placeholder = 'Search videos...',
  className = '' 
}) {
  const [inputValue, setInputValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef(null);
  
  const debouncedValue = useDebounce(inputValue, 300);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Trigger search on debounced value change
  useEffect(() => {
    if (debouncedValue !== value) {
      onChange?.(debouncedValue);
    }
  }, [debouncedValue]);

  const handleChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleClear = () => {
    setInputValue('');
    onChange?.('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
  };

  // Keyboard shortcut to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className={`
        relative flex items-center bg-surface-raised 
        border rounded-xl transition-all duration-200
        ${isFocused 
          ? 'border-accent-blue ring-1 ring-accent-blue shadow-lg shadow-accent-blue/5' 
          : 'border-border-subtle hover:border-border-default'
        }
      `}>
        {/* Search Icon */}
        <div className="absolute left-4 text-text-tertiary">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-20 py-2.5 bg-transparent text-body-base text-text-primary
                   placeholder:text-text-tertiary outline-none"
          autoComplete="off"
          spellCheck={false}
          aria-label="Search videos"
        />

        {/* Right Actions */}
        <div className="absolute right-2 flex items-center gap-1">
          {/* Clear Button */}
          <AnimatePresence>
            {inputValue && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={handleClear}
                className="p-1.5 text-text-tertiary hover:text-text-secondary 
                         hover:bg-surface-hover rounded-lg transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>

          {/* Keyboard Shortcut Hint */}
          {!isFocused && !inputValue && (
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-surface-hover rounded-md">
              <kbd className="text-caption text-text-tertiary">⌘</kbd>
              <kbd className="text-caption text-text-tertiary">K</kbd>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}