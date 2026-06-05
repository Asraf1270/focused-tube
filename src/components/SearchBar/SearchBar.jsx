import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch } from '@/hooks/useSearch';
import { useDebounce } from '@/hooks/useDebounce';

export default function SearchBar({ 
  value: externalValue,
  onChange: externalOnChange,
  onSearch,
  placeholder = 'Search videos, channels, categories...',
  autoFocus = false,
  showSuggestions = true,
  size = 'md',
  className = '' 
}) {
  const [inputValue, setInputValue] = useState(externalValue || '');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const navigate = useNavigate();

  const debouncedValue = useDebounce(inputValue, 200);
  
  const {
    suggestions,
    suggestionsLoading,
    search,
  } = useSearch({ debounceMs: 200, minQueryLength: 2 });

  // Sync external value
  useEffect(() => {
    if (externalValue !== undefined) {
      setInputValue(externalValue);
    }
  }, [externalValue]);

  // Update search when debounced value changes
  useEffect(() => {
    search(debouncedValue);
  }, [debouncedValue, search]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isFocused) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
          handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
        } else {
          handleSubmit();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsFocused(false);
        inputRef.current?.blur();
        break;
      default:
        setSelectedSuggestionIndex(-1);
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    externalOnChange?.(value);
  };

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSearch?.(inputValue.trim());
      navigate(`/search?q=${encodeURIComponent(inputValue.trim())}`);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const handleSuggestionSelect = (suggestion) => {
    if (suggestion?.title) {
      setInputValue(suggestion.title);
      navigate(`/watch/${suggestion.youtube_id}`);
    } else if (suggestion?.suggestion) {
      setInputValue(suggestion.suggestion);
      onSearch?.(suggestion.suggestion);
    }
    setIsFocused(false);
  };

  const handleClear = () => {
    setInputValue('');
    externalOnChange?.('');
    inputRef.current?.focus();
  };

  const sizeClasses = {
    sm: 'py-1.5 text-body-sm',
    md: 'py-2.5 text-body-base',
    lg: 'py-3.5 text-body-lg',
  };

  return (
    <div className={`relative ${className}`}>
      {/* Search Input */}
      <div className={`
        relative flex items-center bg-surface-raised border rounded-xl
        transition-all duration-200
        ${isFocused 
          ? 'border-accent-blue ring-1 ring-accent-blue shadow-lg shadow-accent-blue/5' 
          : 'border-border-subtle hover:border-border-default'
        }
      `}>
        {/* Search Icon */}
        <div className="absolute left-4 text-text-tertiary">
          {suggestionsLoading && isFocused ? (
            <div className="w-5 h-5 border-2 border-accent-blue border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full pl-12 pr-20 bg-transparent text-text-primary 
                   placeholder:text-text-tertiary outline-none ${sizeClasses[size]}`}
          autoComplete="off"
          spellCheck={false}
          aria-label="Search"
          aria-expanded={isFocused && suggestions.length > 0}
          aria-autocomplete="list"
          aria-controls="search-suggestions"
          role="combobox"
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

          {/* Search Button */}
          <button
            onClick={handleSubmit}
            className="p-1.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue-hover 
                     transition-colors"
            aria-label="Search"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      <AnimatePresence>
        {isFocused && showSuggestions && suggestions.length > 0 && (
          <motion.div
            ref={suggestionsRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            id="search-suggestions"
            role="listbox"
            className="absolute top-full mt-2 w-full bg-surface-raised border border-border-subtle 
                     rounded-xl shadow-modal overflow-hidden z-50"
          >
            {suggestions.map((item, index) => (
              <button
                key={item.video_id || item.suggestion}
                onClick={() => handleSuggestionSelect(item)}
                onMouseEnter={() => setSelectedSuggestionIndex(index)}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left
                  transition-colors duration-100
                  ${index === selectedSuggestionIndex 
                    ? 'bg-surface-hover' 
                    : 'hover:bg-surface-hover/50'
                  }
                `}
                role="option"
                aria-selected={index === selectedSuggestionIndex}
              >
                {/* Video Thumbnail (for video results) */}
                {item.thumbnail_url && (
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="w-12 h-8 object-cover rounded flex-shrink-0"
                    loading="lazy"
                  />
                )}

                {/* Icon for non-video results */}
                {!item.thumbnail_url && (
                  <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                    {item.type === 'channel' ? (
                      <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h-1a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-1" />
                      </svg>
                    )}
                  </div>
                )}

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-body-sm text-text-primary truncate">
                      {item.title || item.suggestion}
                    </p>
                    {item.relevance && (
                      <span className="px-1.5 py-0.5 bg-surface-hover text-caption text-text-tertiary rounded">
                        {item.relevance === 'exact_title' ? 'Title match' : 
                         item.relevance === 'exact_channel' ? 'Channel' : 'Similar'}
                      </span>
                    )}
                  </div>
                  {item.channel_name && (
                    <p className="text-caption text-text-tertiary truncate">
                      {item.channel_name}
                    </p>
                  )}
                  {item.type && (
                    <p className="text-caption text-accent-blue">
                      {item.type === 'channel' ? 'Channel' : 
                       item.type === 'category' ? 'Category' : 'Suggestion'}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Results */}
      <AnimatePresence>
        {isFocused && inputValue.length >= 2 && suggestions.length === 0 && !suggestionsLoading && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-full mt-2 w-full bg-surface-raised border border-border-subtle 
                     rounded-xl p-4 text-center z-50"
          >
            <p className="text-body-sm text-text-tertiary">
              No results found for "{inputValue}"
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}