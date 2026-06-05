import { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import BottomNav from './BottomNav';
import TopBar from './TopBar';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const location = useLocation();
  
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    'b': () => setSidebarOpen(prev => !prev),
    'm': () => setMobileSidebarOpen(prev => !prev),
  });

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Top Bar (Mobile/Tablet) */}
      {(isMobile || isTablet) && (
        <TopBar
          onMenuClick={() => setMobileSidebarOpen(true)}
          onSearchClick={() => {}}
        />
      )}

      {/* Desktop Sidebar */}
      {isDesktop && (
        <Sidebar
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
        />
      )}

      {/* Mobile Sidebar (Slide-over) */}
      {isMobile && (
        <MobileSidebar
          isOpen={mobileSidebarOpen}
          onClose={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={`
          transition-all duration-300 ease-out
          ${isDesktop && sidebarOpen ? 'ml-60' : isDesktop ? 'ml-16' : 'ml-0'}
          ${isMobile ? 'pb-16 pt-14' : isTablet ? 'pt-14' : ''}
        `}
      >
        <div className="max-w-[1920px] mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      {isMobile && <BottomNav />}
    </div>
  );
}