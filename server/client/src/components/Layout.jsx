import React, { useState } from 'react';
import { FiMenu, FiSearch, FiBell, FiMail } from 'react-icons/fi';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="main-content">
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
              <div className="avatar">TM</div>
              <div className="profile-info">
                <span className="profile-name">Totok Michael</span>
                <span className="profile-email">tmichael20@mail.com</span>
              </div>
            </div>
          </div>
        </header>
        <div className="content-wrapper">{children}</div>
      </main>
    </div>
  );
};

export default Layout;
