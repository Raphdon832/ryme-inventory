import React from 'react';
import { FiWifiOff, FiRefreshCw, FiCheck, FiX, FiCloud } from 'react-icons/fi';
import { useOffline } from '../contexts/OfflineContext';
import './OfflineIndicator.css';

const OfflineIndicator = () => {
  const { 
    isOnline, 
    pendingCount, 
    syncInProgress, 
    showBanner,
    manualSync, 
    dismissBanner 
  } = useOffline();

  // Don't show anything if online with no pending items
  if (isOnline && pendingCount === 0 && !showBanner) {
    return null;
  }

  return (
    <>
      {/* Floating status pill */}
      <div className={`offline-pill ${!isOnline ? 'offline' : syncInProgress ? 'syncing' : pendingCount > 0 ? 'pending' : 'online'}`}>
        {!isOnline ? (
          <>
            <FiWifiOff size={14} />
            <span>Offline</span>
          </>
        ) : syncInProgress ? (
          <>
            <FiRefreshCw size={14} className="spin" />
            <span>Syncing...</span>
          </>
        ) : pendingCount > 0 ? (
          <>
            <FiCloud size={14} />
            <span>{pendingCount} pending</span>
            <button onClick={manualSync} className="sync-btn" title="Sync now">
              <FiRefreshCw size={12} />
            </button>
          </>
        ) : (
          <>
            <FiCheck size={14} />
            <span>Synced</span>
          </>
        )}
      </div>

      {/* Banner notification */}
      {showBanner && !isOnline && (
        <div className="offline-banner">
          <div className="banner-content">
            <FiWifiOff size={18} />
            <div className="banner-text">
              <strong>You're offline</strong>
              <span>Changes will be saved and synced when you're back online</span>
            </div>
          </div>
          <button className="banner-dismiss" onClick={dismissBanner}>
            <FiX size={18} />
          </button>
        </div>
      )}

      {/* Success banner when back online */}
      {showBanner && isOnline && pendingCount === 0 && !syncInProgress && (
        <div className="offline-banner online">
          <div className="banner-content">
            <FiCheck size={18} />
            <div className="banner-text">
              <strong>Back online</strong>
              <span>All changes have been synced</span>
            </div>
          </div>
          <button className="banner-dismiss" onClick={dismissBanner}>
            <FiX size={18} />
          </button>
        </div>
      )}
    </>
  );
};

export default OfflineIndicator;
