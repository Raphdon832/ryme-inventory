import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import offlineManager from '../utils/offlineManager';

const OfflineContext = createContext();

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Initial status
    offlineManager.getStatus().then((status) => {
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setSyncInProgress(status.syncInProgress);
    });

    // Subscribe to changes
    const unsubscribe = offlineManager.subscribe((status) => {
      setIsOnline(status.isOnline);
      setPendingCount(status.pendingCount);
      setSyncInProgress(status.syncInProgress);
      
      // Show banner when offline
      if (!status.isOnline) {
        setShowBanner(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // Hide banner after coming back online and synced
  useEffect(() => {
    if (isOnline && pendingCount === 0 && !syncInProgress) {
      const timeout = setTimeout(() => setShowBanner(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, pendingCount, syncInProgress]);

  const manualSync = useCallback(() => {
    if (isOnline) {
      offlineManager.syncPendingOperations();
    }
  }, [isOnline]);

  const dismissBanner = useCallback(() => {
    setShowBanner(false);
  }, []);

  const value = {
    isOnline,
    pendingCount,
    syncInProgress,
    showBanner,
    manualSync,
    dismissBanner,
    queueOperation: offlineManager.addToQueue.bind(offlineManager)
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineProvider;
