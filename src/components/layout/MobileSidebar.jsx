import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const NAV_ITEMS = [
  { to: '/', icon: '🏠', label: 'Home' },
  { to: '/continue-watching', icon: '▶️', label: 'Continue Watching' },
  { to: '/favorites', icon: '❤️', label: 'Favorites' },
  { to: '/library', icon: '📚', label: 'Library' },
  { to: '/categories', icon: '📁', label: 'Categories' },
  { to: '/history', icon: '🕐', label: 'History' },
  { to: '/search', icon: '🔍', label: 'Search' },
  { to: '/add-video', icon: '➕', label: 'Add Video' },
  { to: '/settings', icon: '⚙️', label: 'Settings' },
];

export default function MobileSidebar({ isOpen, onClose }) {
  const { user, signOut } = useAuth();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-surface-raised z-50 lg:hidden
                     flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-accent-blue rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="text-heading-sm font-bold text-text-primary">FocusedTube</span>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-text-tertiary hover:text-text-primary rounded-lg 
                         hover:bg-surface-hover transition-colors"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User Info */}
            {user && (
              <div className="p-4 border-b border-border-subtle">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent-blue/10 flex items-center justify-center">
                    <span className="text-body-sm font-medium text-accent-blue">
                      {user.email?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-body-sm font-medium text-text-primary truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-3">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-3 rounded-xl mb-1 transition-colors
                    ${isActive 
                      ? 'bg-accent-blue/10 text-accent-blue' 
                      : 'text-text-secondary hover:bg-surface-hover active:scale-[0.98]'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-body-base font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>

            {/* Footer */}
            <div className="p-3 border-t border-border-subtle">
              <button
                onClick={() => { signOut(); onClose(); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-body-base text-error
                         hover:bg-error/5 rounded-xl transition-colors active:scale-[0.98]"
              >
                <span className="text-xl">🚪</span>
                <span>Sign Out</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}