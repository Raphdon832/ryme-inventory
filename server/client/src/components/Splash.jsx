import React, { useEffect, useState } from 'react';

const Splash = ({ duration = 800, onDone }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setVisible(false);
      onDone && onDone();
    }, duration);
    return () => clearTimeout(t);
  }, [duration, onDone]);

  if (!visible) return null;

  return (
    <div className="splash-overlay" role="status" aria-live="polite">
      <div className="splash-card">
        <img src="/Ryme Icon.png" alt="Ryme Interiors" className="splash-logo" />
        <div className="splash-title">Ryme Interiors</div>
        <div className="splash-spinner" />
      </div>
    </div>
  );
};

export default Splash;
