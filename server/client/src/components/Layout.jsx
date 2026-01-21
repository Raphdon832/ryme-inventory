import React, { useState, useCallback, useEffect } from 'react';
import { FiMenu, FiSearch, FiBell, FiMail } from 'react-icons/fi';
import Sidebar from './Sidebar';
import Splash from './Splash';
import OfflineIndicator from './OfflineIndicator';
import PullToRefresh from './PullToRefresh';
import GlobalSearch from './GlobalSearch';
import QuickNavBar from './QuickNavBar';
import { useSettings } from '../contexts/SettingsContext';

const Layout = ({ children }) => {
  const { settings } = useSettings();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const hasQuickNav = settings.quickNav?.enabled && settings.quickNav?.items?.length > 0;

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen || isSearchOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [isSidebarOpen, isSearchOpen]);

  // Track window resize for mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Pull to refresh handler - reloads the page
  const handleRefresh = useCallback(async () => {
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.reload();
  }, []);

  return (
    <div className={`dashboard-layout ${hasQuickNav && isMobile ? 'has-quick-nav' : ''}`}>
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="main-content">
        {showSplash && <Splash duration={900} onDone={() => setShowSplash(false)} />}
        <header className="top-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle menu"
            >
              <FiMenu />
            </button>
            {/* Desktop Search Bar */}
            <div 
              className="search-bar search-bar--compact"
              onClick={() => setIsSearchOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              <FiSearch color="var(--text-tertiary)" size={18} />
              <input 
                type="text" 
                placeholder="Search anything..." 
                readOnly 
                style={{ cursor: 'pointer' }}
              />
              <span className="search-shortcut">⌘ F</span>
            </div>
            {/* Mobile Search Button */}
            <button
              className="mobile-search-btn"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
            >
              <FiSearch size={20} />
            </button>
          </div>

          <div className="header-right">
            <button className="icon-button" aria-label="Messages">
              <FiMail size={18} />
            </button>
            <button className="icon-button" aria-label="Notifications">
              <FiBell size={18} />
            </button>
            <div className="header-profile">
              <div className="avatar">RI</div>
              <div className="profile-info">
                <span className="profile-name">Ryme Interiors</span>
                <span className="profile-email">rymeinteriors@gmail.com</span>
              </div>
            </div>
          </div>
        </header>
        <PullToRefresh onRefresh={handleRefresh} disabled={isSidebarOpen || isSearchOpen}>
          <div className="content-wrapper">{children}</div>
        </PullToRefresh>
        <OfflineIndicator />
      </main>
      
      {/* Quick Navigation Bar - Mobile Only */}
      {isMobile && (
        <QuickNavBar 
          onSearchClick={() => setIsSearchOpen(true)} 
          isHidden={isSidebarOpen}
        />
      )}
      
      {/* Global Search Modal */}
      <GlobalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)}
        isMobile={isMobile}
      />
    </div>
  );
};

export default Layout;
