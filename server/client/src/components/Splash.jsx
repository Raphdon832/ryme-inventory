import React, { useEffect, useState } from 'react';
import { 
  BoxIcon, 
  CartIcon, 
  ShippingIcon, 
  AnalyticsIcon, 
  ProfileIcon,
  TargetIcon
} from './CustomIcons';
import './Splash.css';

const Splash = ({ duration = 2500, onDone }) => {
  const [visible, setVisible] = useState(true);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    // Keep splash visible for duration
    const fadeTimer = setTimeout(() => {
      setHiding(true);
    }, duration);
    
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onDone && onDone();
    }, duration + 800);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onDone]);

  if (!visible) return null;

  return (
    <div className={`splash-overlay ${hiding ? 'hiding' : ''}`}>
      <div className="splash-content">
        {/* Central Logo */}
        <div className="splash-center-logo">
          <img src="/Ryme Icon.png" alt="Ryme Interiors" />
        </div>
        
        {/* Orbiting Icons Container */}
        <div className="splash-orbit">
          {/* Icons positioned in a circle */}
          {/* Top */}
          <div className="orbit-icon icon-1">
            <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2z"></path>
              <path d="M7 7h10"></path>
              <path d="M7 11h10"></path>
              <path d="M7 15h10"></path>
            </svg>
            {/* Using SVG for barcode-like look since we want to stick to fi or simple SVGs to avoid missing icon errors if possible, or just FiBarChart rotated? */}
          </div>
          
          {/* Top Right */}
          <div className="orbit-icon icon-2"><AnalyticsIcon size={24} /></div>
          
          {/* Bottom Right */}
          <div className="orbit-icon icon-3"><CartIcon size={24} /></div>
          
          {/* Bottom */}
          <div className="orbit-icon icon-4"><ProfileIcon size={24} /></div>
          
          {/* Bottom Left */}
          <div className="orbit-icon icon-5"><BoxIcon size={24} /></div>
          
          {/* Top Left */}
          <div className="orbit-icon icon-6"><TargetIcon size={24} /></div>
        </div>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: '40px',
        fontFamily: 'var(--font-sans)',
        fontWeight: '600',
        color: 'var(--text-secondary)',
        fontSize: '14px',
        letterSpacing: '0.05em'
      }}>
        LOADING...
      </div>
    </div>
  );
};

export default Splash;
