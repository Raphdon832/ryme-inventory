import React, { useEffect, useState } from 'react';

const Splash = ({ duration = 900, onDone }) => {
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setHiding(true);
    }, duration);
    
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onDone && onDone();
    }, duration + 400); // 400ms for fade-out animation
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onDone]);

  if (!visible) return null;

  return (
    <div className={`splash-overlay ${hiding ? 'hiding' : ''}`} role="status" aria-live="polite">
      <div className="splash-card">
        <img src="/Ryme Icon.png" alt="Ryme Interiors" className="splash-logo" />
        <div className="splash-title">Ryme Interiors</div>
        <div className="splash-spinner" />
      </div>
    </div>
  );
};

export default Splash;
