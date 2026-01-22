import React, { useEffect, useState, useRef, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FiHome,
  FiBox,
  FiShoppingCart,
  FiSettings,
  FiLogOut,
  FiCheckSquare,
  FiCalendar,
  FiBarChart2,
  FiUsers,
  FiUser,
  FiTruck,
  FiHelpCircle,
  FiClock,
  FiHash,
  FiRefreshCw,
  FiCpu,
  FiDollarSign,
  FiPieChart,
  FiEdit3
} from 'react-icons/fi';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../api';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose, onOpenCalculator, onOpenConverter, onOpenBarcode, onOpenCurrency, onOpenPricing, onOpenScratchpad }) => {
  const [pendingTasksCount, setPendingTasksCount] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwipingNav, setIsSwipingNav] = useState(false);
  
  const sidebarRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), where('status', '==', 'pending'));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setPendingTasksCount(snapshot.size);
      },
      (error) => {
        console.error('Error subscribing to tasks:', error);
      }
    );

    return () => unsub();
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
          <span className="nav-icon"><FiHome /></span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/inventory"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiBox /></span>
          <span>Inventory</span>
        </NavLink>

        <NavLink
          to="/orders"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiShoppingCart /></span>
          <span>Orders</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiUser /></span>
          <span>Customers</span>
        </NavLink>

        <NavLink
          to="/vendors"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiTruck /></span>
          <span>Vendors</span>
        </NavLink>

        <NavLink
          to="/tasks"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiCheckSquare /></span>
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
          <span className="nav-icon"><FiCalendar /></span>
          <span>Calendar</span>
        </NavLink>

        <NavLink
          to="/activity-log"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiClock /></span>
          <span>Activity Log</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiBarChart2 /></span>
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/team"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiUsers /></span>
          <span>Team</span>
        </NavLink>

        <div className="nav-section-label" style={{ marginTop: '2rem' }}>General</div>

        <NavLink
          to="/settings"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiSettings /></span>
          <span>Settings</span>
        </NavLink>

        <NavLink
          to="/help"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose && onClose()}
        >
          <span className="nav-icon"><FiHelpCircle /></span>
          <span>Help</span>
        </NavLink>

        <div className="nav-item">
          <span className="nav-icon"><FiLogOut /></span>
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
          <span className="nav-icon"><FiHash /></span>
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
          <span className="nav-icon"><FiRefreshCw /></span>
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
          <span className="nav-icon"><FiCpu /></span>
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
          <span className="nav-icon"><FiDollarSign /></span>
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
          <span className="nav-icon"><FiPieChart /></span>
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
          <span className="nav-icon"><FiEdit3 /></span>
          <span>Scratchpad</span>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
