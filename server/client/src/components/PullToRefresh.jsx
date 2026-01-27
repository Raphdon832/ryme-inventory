import React, { useState, useEffect } from 'react';
import { RefreshIcon } from './CustomIcons';
import usePullToRefresh from '../hooks/usePullToRefresh';
import './PullToRefresh.css';

/**
 * Check if any modal is currently open in the DOM
 */
const checkModalOpen = () => {
  return !!document.querySelector('.modal-overlay, .stat-modal-overlay, [class*="modal"][class*="overlay"]');
};

/**
 * Pull-to-Refresh wrapper component for iOS devices
 */
const PullToRefresh = ({ children, onRefresh, disabled = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Monitor for modal changes in the DOM
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsModalOpen(checkModalOpen());
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
    
    // Initial check
    setIsModalOpen(checkModalOpen());
    
    return () => observer.disconnect();
  }, []);

  const {
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh,
  } = usePullToRefresh(onRefresh, { disabled: disabled || isModalOpen });

  // Don't apply transform when modal is open to prevent fixed positioning issues
  const shouldApplyTransform = (isPulling || isRefreshing) && !isModalOpen;

  return (
    <div className="pull-to-refresh-container">
      {/* Pull indicator */}
      <div 
        className={`pull-indicator ${isPulling || isRefreshing ? 'visible' : ''} ${isRefreshing ? 'refreshing' : ''}`}
        style={{ 
          top: `calc(var(--header-height, 60px) + ${Math.min(pullDistance - 40, 20)}px)`,
          opacity: Math.min(progress, 1)
        }}
      >
        <div 
          className={`pull-spinner ${shouldRefresh || isRefreshing ? 'ready' : ''}`}
          style={{ 
            transform: `rotate(${progress * 360}deg)`,
          }}
        >
          <RefreshIcon size={22} />
        </div>
        <span className="pull-text">
          {isRefreshing 
            ? 'Refreshing...' 
            : shouldRefresh 
              ? 'Release to refresh' 
              : 'Pull to refresh'}
        </span>
      </div>
      
      {/* Content - no transform when modal is open */}
      <div 
        className="pull-content"
        style={{ 
          transform: shouldApplyTransform ? `translateY(${pullDistance}px)` : 'none',
          transition: !isPulling ? 'transform 0.3s ease' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
