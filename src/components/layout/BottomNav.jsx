import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const BOTTOM_NAV_ITEMS = [
  { to: '/', icon: HomeIcon, label: 'Home' },
  { to: '/continue-watching', icon: PlayIcon, label: 'Continue' },
  { to: '/add-video', icon: PlusCircleIcon, label: 'Add', isPrimary: true },
  { to: '/favorites', icon: HeartIcon, label: 'Favorites' },
  { to: '/settings', icon: GearIcon, label: 'Settings' },
];

export default function BottomNav() {
  const location = useLocation();
  
  // Hide on watch page (immersive experience)
  if (location.pathname.startsWith('/watch/')) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface-raised/95 backdrop-blur-xl 
                  border-t border-border-subtle z-40 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.to || 
            (item.to !== '/' && location.pathname.startsWith(item.to));
          
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive: active }) => `
                relative flex flex-col items-center justify-center gap-0.5 
                min-w-[48px] min-h-[48px] py-1 px-3
                transition-colors duration-200
                ${active ? 'text-accent-blue' : 'text-text-tertiary'}
                active:scale-95
              `}
            >
              {item.isPrimary ? (
                <div className="w-12 h-12 bg-accent-blue rounded-full flex items-center justify-center
                              -mt-6 shadow-lg shadow-accent-blue/20 active:scale-95 transition-transform">
                  <item.icon className="w-6 h-6 text-white" />
                </div>
              ) : (
                <>
                  <item.icon className="w-5 h-5" />
                  <span className="text-caption font-medium">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavIndicator"
                      className="absolute -top-0.5 w-8 h-0.5 bg-accent-blue rounded-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function HomeIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}
function PlayIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function PlusCircleIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
function HeartIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}
function GearIcon({ className }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}