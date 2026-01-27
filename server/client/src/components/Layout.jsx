import React, { useState, useEffect, useCallback } from 'react';
import { MenuIcon, SearchIcon, NotificationsIcon, MailIcon } from './CustomIcons';
import Sidebar from './Sidebar';
import Splash from './Splash';
import OfflineIndicator from './OfflineIndicator';
import PullToRefresh from './PullToRefresh';
import GlobalSearch from './GlobalSearch';
import QuickNavBar from './QuickNavBar';
import Calculator from './Calculator';
import UnitConverter from './UnitConverter';
import BarcodeGenerator from './BarcodeGenerator';
import CurrencyConverter from './CurrencyConverter';
import PricingSimulator from './PricingSimulator';
import QuickScratchpad from './QuickScratchpad';
import { useSettings } from '../contexts/SettingsContext';
import { useUI } from '../contexts/UIContext';

const Layout = ({ children }) => {
  const { settings } = useSettings();
  const { activeTool, openTool, closeTool } = useUI();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  const hasQuickNav = settings.quickNav?.enabled && settings.quickNav?.items?.length > 0;

  // Lock body scroll
  useEffect(() => {
    if (isSidebarOpen || isSearchOpen || activeTool) {
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
  }, [isSidebarOpen, isSearchOpen, activeTool]);

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
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        onOpenCalculator={() => openTool('calculator')}
        onOpenConverter={() => openTool('converter')}
        onOpenBarcode={() => openTool('barcode')}
        onOpenCurrency={() => openTool('currency')}
        onOpenPricing={() => openTool('pricing')}
        onOpenScratchpad={() => openTool('scratchpad')}
      />
      <main className="main-content">
        {showSplash && <Splash duration={900} onDone={() => setShowSplash(false)} />}
        <header className="top-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle menu"
            >
              <MenuIcon size={20} />
            </button>
            {/* Desktop Search Bar */}
            <div 
              className="search-bar search-bar--compact"
              onClick={() => setIsSearchOpen(true)}
              style={{ cursor: 'pointer' }}
            >
              <SearchIcon color="var(--text-tertiary)" size={18} />
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
              <SearchIcon size={20} />
            </button>
          </div>

          <div className="header-right">
            <button className="icon-button" aria-label="Messages">
              <MailIcon size={18} />
            </button>
            <button className="icon-button" aria-label="Notifications">
              <NotificationsIcon size={18} />
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
          <div className="content-wrapper">
            {children}
          </div>
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

      {/* Calculator Modal */}
      <Calculator 
        isOpen={activeTool === 'calculator'} 
        onClose={closeTool}
      />

      {/* Unit Converter Modal */}
      <UnitConverter 
        isOpen={activeTool === 'converter'} 
        onClose={closeTool}
      />

      {/* Barcode Generator Modal */}
      <BarcodeGenerator 
        isOpen={activeTool === 'barcode'} 
        onClose={closeTool}
      />

      {/* Currency Converter Modal */}
      <CurrencyConverter 
        isOpen={activeTool === 'currency'} 
        onClose={closeTool}
      />

      {/* Pricing Simulator Modal */}
      <PricingSimulator 
        isOpen={activeTool === 'pricing'} 
        onClose={closeTool}
      />

      {/* Quick Scratchpad Modal */}
      <QuickScratchpad 
        isOpen={activeTool === 'scratchpad'} 
        onClose={closeTool}
      />
    </div>
  );
};

export default Layout;
