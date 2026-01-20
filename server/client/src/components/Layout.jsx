import React, { useState, useCallback, useEffect } from 'react';
import { FiMenu, FiSearch, FiBell, FiMail } from 'react-icons/fi';
import Sidebar from './Sidebar';
import Splash from './Splash';
import OfflineIndicator from './OfflineIndicator';
import PullToRefresh from './PullToRefresh';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
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
  }, [isSidebarOpen]);

  // Pull to refresh handler - reloads the page
  const handleRefresh = useCallback(async () => {
    // Small delay for animation
    await new Promise(resolve => setTimeout(resolve, 500));
    window.location.reload();
  }, []);

  return (
    <div className="dashboard-layout">
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
            <div className="search-bar search-bar--compact">
              <FiSearch color="var(--text-tertiary)" size={18} />
              <input type="text" placeholder="Search task" />
              <span className="search-shortcut">⌘ F</span>
            </div>
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
        <PullToRefresh onRefresh={handleRefresh} disabled={isSidebarOpen}>
          <div className="content-wrapper">{children}</div>
        </PullToRefresh>
        <OfflineIndicator />
      </main>
    </div>
  );
};

export default Layout;
