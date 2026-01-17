import React, { useEffect, useState } from 'react';
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
  FiHelpCircle,
  FiClock
} from 'react-icons/fi';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../api';
import './Sidebar.css';

const Sidebar = ({ isOpen, onClose }) => {
  const [pendingTasksCount, setPendingTasksCount] = useState(0);

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

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
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
      </nav>
    </aside>
  );
};

export default Sidebar;
