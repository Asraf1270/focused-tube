import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

export default function TopBar({ onMenuClick, onSearchClick }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-surface-raised/95 backdrop-blur-xl 
                   border-b border-border-subtle z-40 flex items-center px-4 gap-3">
      {/* Menu Button */}
      <button
        onClick={onMenuClick}
        className="p-2 -ml-2 text-text-secondary hover:text-text-primary rounded-lg
                 hover:bg-surface-hover transition-colors active:scale-95"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Logo */}
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-2 flex-shrink-0"
      >
        <div className="w-8 h-8 bg-accent-blue rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <span className="text-heading-sm font-bold text-text-primary hidden sm:block">
          FocusedTube
        </span>
      </button>

      {/* Search Bar (Compact) */}
      <button
        onClick={() => navigate('/search')}
        className="flex-1 max-w-md h-9 bg-surface-overlay border border-border-subtle rounded-lg
                 flex items-center gap-2 px-3 text-text-tertiary hover:border-border-default
                 transition-colors active:scale-[0.98]"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-body-sm truncate">Search videos...</span>
      </button>

      {/* User Avatar */}
      {user && (
        <button
          onClick={() => navigate('/settings')}
          className="w-8 h-8 rounded-full bg-accent-blue/10 flex items-center justify-center
                   flex-shrink-0 active:scale-95 transition-transform"
        >
          <span className="text-caption font-medium text-accent-blue">
            {user.email?.charAt(0)?.toUpperCase() || '?'}
          </span>
        </button>
      )}
    </header>
  );
}