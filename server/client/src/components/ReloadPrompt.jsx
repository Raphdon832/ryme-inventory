import React from 'react';
import './ReloadPrompt.css';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshIcon, CloseIcon } from './CustomIcons';

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="pwa-toast-container">
      <div className="pwa-toast">
        <div className="pwa-toast-content">
          <div className="pwa-toast-icon">
            <RefreshIcon className={needRefresh ? 'spin-icon' : ''} size={20} />
          </div>
          <div className="pwa-toast-message">
            {offlineReady ? (
              <span>App ready to work offline</span>
            ) : (
              <span>New update available! Click reload to update.</span>
            )}
          </div>
        </div>
        <div className="pwa-toast-buttons">
          {needRefresh && (
            <button className="pwa-reload-btn" onClick={() => updateServiceWorker(true)}>
              Reload
            </button>
          )}
          <button className="pwa-close-btn" onClick={() => close()}>
            <CloseIcon size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt;
