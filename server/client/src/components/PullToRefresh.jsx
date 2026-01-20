import React from 'react';
import { FiRefreshCw } from 'react-icons/fi';
import usePullToRefresh from '../hooks/usePullToRefresh';
import './PullToRefresh.css';

/**
 * Pull-to-Refresh wrapper component for iOS devices
 */
const PullToRefresh = ({ children, onRefresh, disabled = false }) => {
  const {
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh,
  } = usePullToRefresh(onRefresh, { disabled });

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
          <FiRefreshCw size={22} />
        </div>
        <span className="pull-text">
          {isRefreshing 
            ? 'Refreshing...' 
            : shouldRefresh 
              ? 'Release to refresh' 
              : 'Pull to refresh'}
        </span>
      </div>
      
      {/* Content with pull transform */}
      <div 
        className="pull-content"
        style={{ 
          transform: isPulling || isRefreshing ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: !isPulling ? 'transform 0.3s ease' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
