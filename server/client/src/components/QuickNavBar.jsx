import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  DashboardIcon,
  BoxIcon,
  CartIcon,
  UsersIcon,
  ShippingIcon,
  TasksIcon,
  CalendarIcon,
  AnalyticsIcon,
  ClockIcon,
  SettingsIcon,
  HelpIcon,
  ProfileIcon,
  AddIcon,
  OrdersIcon,
  PlusIcon,
  SearchIcon
} from './CustomIcons';
import { useSettings } from '../contexts/SettingsContext';
import './QuickNavBar.css';

// Custom icon wrapper to match react-icons API
const createCustomIconComponent = (IconComponent) => ({ size = 24 }) => <IconComponent size={size} />;

// Icon mapping for dynamic rendering
export const ICON_MAP = {
  FiHome: createCustomIconComponent(DashboardIcon),
  FiBox: createCustomIconComponent(BoxIcon),
  FiShoppingCart: createCustomIconComponent(CartIcon),
  FiUsers: createCustomIconComponent(UsersIcon),
  FiTruck: createCustomIconComponent(ShippingIcon),
  FiCheckSquare: createCustomIconComponent(TasksIcon),
  FiCalendar: createCustomIconComponent(CalendarIcon),
  FiBarChart2: createCustomIconComponent(AnalyticsIcon),
  FiClock: createCustomIconComponent(ClockIcon),
  FiSettings: createCustomIconComponent(SettingsIcon),
  FiHelpCircle: createCustomIconComponent(HelpIcon),
  FiUser: createCustomIconComponent(ProfileIcon),
  FiPlus: createCustomIconComponent(PlusIcon),
  FiSearch: createCustomIconComponent(SearchIcon),
  FiPlusSquare: createCustomIconComponent(AddIcon),
  FiFilePlus: createCustomIconComponent(OrdersIcon)
};

// Available navigation options for configuration
export const AVAILABLE_NAV_OPTIONS = [
  { id: 'dashboard', path: '/', icon: 'FiHome', label: 'Dashboard' },
  { id: 'inventory', path: '/inventory', icon: 'FiBox', label: 'Inventory' },
  { id: 'add-product', path: '/inventory/add', icon: 'FiPlusSquare', label: 'Add Product' },
  { id: 'orders', path: '/orders', icon: 'FiShoppingCart', label: 'Orders' },
  { id: 'new-order', path: '/orders/new', icon: 'FiFilePlus', label: 'New Order' },
  { id: 'customers', path: '/customers', icon: 'FiUsers', label: 'Customers' },
  { id: 'vendors', path: '/vendors', icon: 'FiTruck', label: 'Vendors' },
  { id: 'tasks', path: '/tasks', icon: 'FiCheckSquare', label: 'Tasks' },
  { id: 'calendar', path: '/calendar', icon: 'FiCalendar', label: 'Calendar' },
  { id: 'analytics', path: '/analytics', icon: 'FiBarChart2', label: 'Analytics' },
  { id: 'activity-log', path: '/activity-log', icon: 'FiClock', label: 'Activity' },
  { id: 'settings', path: '/settings', icon: 'FiSettings', label: 'Settings' },
  { id: 'profile', path: '/profile', icon: 'FiUser', label: 'Profile' },
  { id: 'help', path: '/help', icon: 'FiHelpCircle', label: 'Help' },
];

const QuickNavBar = ({ onSearchClick, isHidden }) => {
  const { settings } = useSettings();
  const navigate = useNavigate();

  // Don't render if not enabled or no items configured
  if (!settings.quickNav?.enabled || !settings.quickNav?.items?.length) {
    return null;
  }

  const navItems = settings.quickNav.items.slice(0, 5); // Max 5 items

  return (
    <nav className={`quick-nav-bar ${isHidden ? 'hidden' : ''}`}>
      {navItems.map((item) => {
        const IconComponent = ICON_MAP[item.icon] || ICON_MAP.FiHome;
        
        // Special handling for search action
        if (item.id === 'search' && onSearchClick) {
          return (
            <button
              key={item.id}
              className="quick-nav-item"
              onClick={onSearchClick}
            >
              <span className="quick-nav-icon">
                <IconComponent size={20} />
              </span>
              <span className="quick-nav-label">{item.label}</span>
            </button>
          );
        }

        return (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => `quick-nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="quick-nav-icon">
              <IconComponent size={20} />
            </span>
            <span className="quick-nav-label">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default QuickNavBar;
