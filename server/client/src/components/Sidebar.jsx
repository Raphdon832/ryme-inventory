import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  DashboardIcon,
  BoxIcon,
  CartIcon,
  ProfileIcon,
  ShippingIcon,
  TasksIcon,
  CalendarIcon,
  ClockIcon,
  AnalyticsIcon,
  IncomeIcon,
  TaxesIcon,
  VoucherIcon,
  UsersIcon,
  SettingsIcon,
  HelpIcon,
  CalculatorIcon,
  UnitConverterIcon,
  BarcodeIcon,
  PricingIcon,
  NotepadIcon,
  LogoutIcon
} from './CustomIcons';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, onOpenCalculator, onOpenConverter, onOpenBarcode, onOpenCurrency, onOpenPricing, onOpenScratchpad }) => {
  const { currencySymbol } = useSettings();
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingNav, setIsSwipingNav] = useState(false);
  
  const sidebarRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    if (!db) {
      console.error('Firestore db instance is not initialized');
      return;
    }

    let unsub;
    try {
      const q = query(collection(db, 'tasks'), where('status', '==', 'pending'));
      unsub = onSnapshot(
        q,
        (snapshot) => {
          setPendingTasksCount(snapshot.size);
        },
        (error) => {
          console.error('Sidebar: Error subscribing to tasks:', error);
          // If permission is denied, fallback to 0 instead of crashing if possible
          if (error.code === 'permission-denied') {
            setPendingTasksCount(0);
          }
        }
      );
    } catch (err) {
      console.error('Sidebar: Error setting up task listener:', err);
    }

    return () => unsub && unsub();
  }, []);

  // Swipe to close handlers
  const handleTouchStart = useCallback((e) => {
    if (!isOpen) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setIsSwipingNav(false);
  }, [isOpen]);

  const handleTouchMove = useCallback((e) => {
    if (!isOpen) return;
    
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = touchStartX.current - currentX;
    const diffY = Math.abs(touchStartY.current - currentY);
    
    // Only start swiping if horizontal movement is greater than vertical
    if (!isSwiping.current && diffX > 10 && diffX > diffY) {
      isSwiping.current = true;
      setIsSwipingNav(true);
    }
    
    if (isSwiping.current && diffX > 0) {
      // Swiping left to close
      const offset = Math.min(diffX, 300); // Max offset
      setSwipeOffset(-offset);
    }
  }, [isOpen]);

  const handleTouchEnd = useCallback(() => {
    if (!isOpen || !isSwiping.current) {
      setSwipeOffset(0);
      setIsSwipingNav(false);
      return;
    }
    
    // If swiped more than 80px, close the sidebar
    if (Math.abs(swipeOffset) > 80) {
      onClose && onClose();
    }
    
    setSwipeOffset(0);
    setIsSwipingNav(false);
    isSwiping.current = false;
  }, [isOpen, swipeOffset, onClose]);

  // Reset swipe offset when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setSwipeOffset(0);
      setIsSwipingNav(false);
    }
  }, [isOpen]);

  const sidebarStyle = isSwipingNav ? {
    transform: `translateX(${swipeOffset}px)`,
    transition: 'none'
  } : {};

  return (
    <aside 
      ref={sidebarRef}
      className={`sidebar ${isOpen ? 'open' : ''}`}
      style={sidebarStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Swipe indicator line */}
      {isOpen && (
        <div className="swipe-indicator">
          <div className="swipe-line"></div>
        </div>
      )}
      
      <div className="sidebar-header">
        <div className="logo-container">
          <img src="/Ryme Icon.png" alt="Ryme" className="logo-img" />
          <span className="logo-text">Ryme Interiors</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Menu</div>

        <NavLink
          to="/"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
          end
        >
          <span className="nav-icon"><DashboardIcon size={20} /></span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><BoxIcon size={20} /></span>
          <span>Inventory</span>
        </NavLink>

        <NavLink
          to="/orders"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><CartIcon size={20} /></span>
          <span>Orders</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><ProfileIcon size={20} /></span>
          <span>Customers</span>
        </NavLink>

        <NavLink
          to="/vendors"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><ShippingIcon size={20} /></span>
          <span>Vendors</span>
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><TasksIcon size={20} /></span>
          <span>Tasks</span>
          {pendingTasksCount > 0 && (
            <span className="nav-badge">{pendingTasksCount > 99 ? '99+' : pendingTasksCount}</span>
          )}
        </NavLink>

        <NavLink
          to="/calendar"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><CalendarIcon size={20} /></span>
          <span>Calendar</span>
        </NavLink>

        <NavLink
          to="/activity-log"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><ClockIcon size={20} /></span>
          <span>Activity Log</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><AnalyticsIcon size={20} /></span>
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/expenses"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><span className="currency-symbol-icon">{currencySymbol}</span></span>
          <span>Expenses</span>
        </NavLink>

        <NavLink
          to="/income"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><IncomeIcon size={20} /></span>
          <span>Income</span>
        </NavLink>

        <NavLink
          to="/taxes"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><TaxesIcon size={20} /></span>
          <span>Taxes</span>
        </NavLink>

        <NavLink
          to="/vouchers"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><VoucherIcon size={20} /></span>
          <span>Vouchers</span>
        </NavLink>

        <NavLink
          to="/team"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><UsersIcon size={20} /></span>
          <span>Team</span>
        </NavLink>

        <div className="nav-section-label" style={{ marginTop: '2rem' }}>General</div>

        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><SettingsIcon size={20} /></span>
          <span>Settings</span>
        </NavLink>

        <NavLink
          to="/help"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><HelpIcon size={20} /></span>
          <span>Help</span>
        </NavLink>

        <div className="nav-item">
          <span className="nav-icon"><LogoutIcon size={20} /></span>
          <span>Logout</span>
        </div>

        <div className="nav-section-label" style={{ marginTop: '2rem' }}>Tools</div>
        
        <div 
          className="nav-item" 
          onClick={() => {
            onOpenCalculator && onOpenCalculator();
            onClose && onClose();
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-icon"><CalculatorIcon size={20} /></span>
          <span>Calculator</span>
        </div>

        <div 
          className="nav-item" 
          onClick={() => {
            onOpenConverter && onOpenConverter();
            onClose && onClose();
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-icon"><UnitConverterIcon size={20} /></span>
          <span>Unit Converter</span>
        </div>

        <div 
          className="nav-item" 
          onClick={() => {
            onOpenBarcode && onOpenBarcode();
            onClose && onClose();
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-icon"><BarcodeIcon size={20} /></span>
          <span>Asset Tag Tool</span>
        </div>

        <div 
          className="nav-item" 
          onClick={() => {
            onOpenCurrency && onOpenCurrency();
            onClose && onClose();
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-icon"><span className="currency-symbol-icon">{currencySymbol}</span></span>
          <span>Currency Converter</span>
        </div>

        <div 
          className="nav-item" 
          onClick={() => {
            onOpenPricing && onOpenPricing();
            onClose && onClose();
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-icon"><PricingIcon size={20} /></span>
          <span>Pricing Simulator</span>
        </div>

        <div 
          className="nav-item" 
          onClick={() => {
            onOpenScratchpad && onOpenScratchpad();
            onClose && onClose();
          }}
          style={{ cursor: 'pointer' }}
        >
          <span className="nav-icon"><NotepadIcon size={20} /></span>
          <span>Scratchpad</span>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
