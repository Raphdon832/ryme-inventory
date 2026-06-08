import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import api, { db } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import {
  AlertCircleIcon,
  CartIcon,
  ClockIcon,
  NotificationsIcon,
  PackageIcon
} from './CustomIcons';
import './NotificationCenter.css';

const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : value;
  if (typeof value.toDate === 'function') return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const isOverdue = (value) => {
  const date = toDate(value);
  if (!date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(date);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
};

const NotificationCenter = () => {
  const navigate = useNavigate();
  const { settings, formatCurrency } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const unsubscribeProducts = api.subscribe('/products', (response) => {
      setProducts(response.data || []);
    });
    const unsubscribeOrders = api.subscribe('/orders', (response) => {
      setOrders(response.data || []);
    });
    const unsubscribeTasks = onSnapshot(
      query(collection(db, 'tasks'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      },
      (error) => {
        console.error('NotificationCenter: failed to load tasks:', error);
      }
    );

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
      unsubscribeTasks();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const notifications = useMemo(() => {
    const items = [];
    const threshold = Number(settings.inventory?.lowStockThreshold || 5);

    if (settings.notifications?.lowStockAlerts) {
      products
        .filter(product => Number(product.stock_quantity || 0) < threshold)
        .sort((a, b) => Number(a.stock_quantity || 0) - Number(b.stock_quantity || 0))
        .slice(0, 5)
        .forEach(product => {
          const stock = Number(product.stock_quantity || 0);
          items.push({
            id: `stock-${product.id}`,
            type: 'stock',
            severity: stock <= 0 ? 'critical' : 'warning',
            title: stock <= 0 ? `${product.name} is out of stock` : `${product.name} is low stock`,
            detail: `${new Intl.NumberFormat('en-US').format(stock)} left · threshold ${threshold}`,
            meta: product.sorting_code || 'Inventory',
            path: '/inventory'
          });
        });
    }

    const overdueTasks = tasks
      .filter(task => task.status !== 'completed' && isOverdue(task.dueDate))
      .slice(0, 4);

    overdueTasks.forEach(task => {
      items.push({
        id: `task-${task.id}`,
        type: 'task',
        severity: task.priority === 'high' ? 'critical' : 'warning',
        title: task.title || 'Task is overdue',
        detail: task.dueDate ? `Due ${toDate(task.dueDate).toLocaleDateString()}` : 'Due date passed',
        meta: `${task.priority || 'medium'} priority`,
        path: '/tasks'
      });
    });

    if (settings.notifications?.orderAlerts) {
      const unpaidOrders = orders.filter(order => order.payment_status !== 'Paid');
      const pendingFulfillment = orders.filter(order => (
        order.payment_status === 'Paid' && order.fulfillment_status && order.fulfillment_status !== 'Fulfilled'
      ));

      if (unpaidOrders.length > 0) {
        const totalUnpaid = unpaidOrders.reduce((sum, order) => sum + Number(order.total_sales_price || 0), 0);
        items.push({
          id: 'orders-unpaid',
          type: 'order',
          severity: 'info',
          title: `${unpaidOrders.length} unpaid order${unpaidOrders.length === 1 ? '' : 's'}`,
          detail: `${formatCurrency(totalUnpaid, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} awaiting payment`,
          meta: 'Orders',
          path: '/orders'
        });
      }

      if (pendingFulfillment.length > 0) {
        items.push({
          id: 'orders-fulfillment',
          type: 'order',
          severity: 'warning',
          title: `${pendingFulfillment.length} order${pendingFulfillment.length === 1 ? '' : 's'} need fulfillment`,
          detail: 'Paid orders still pending item fulfillment',
          meta: 'Orders',
          path: '/orders'
        });
      }
    }

    return items
      .sort((a, b) => {
        const score = { critical: 0, warning: 1, info: 2 };
        return score[a.severity] - score[b.severity];
      })
      .slice(0, 12);
  }, [formatCurrency, orders, products, settings.inventory?.lowStockThreshold, settings.notifications?.lowStockAlerts, settings.notifications?.orderAlerts, tasks]);

  const renderIcon = (type) => {
    if (type === 'stock') return <PackageIcon size={16} />;
    if (type === 'task') return <ClockIcon size={16} />;
    if (type === 'order') return <CartIcon size={16} />;
    return <AlertCircleIcon size={16} />;
  };

  const handleSelect = (notification) => {
    setIsOpen(false);
    navigate(notification.path);
  };

  return (
    <div className="notification-center" ref={containerRef}>
      <button
        className="icon-button notification-trigger"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        <NotificationsIcon size={18} />
        {notifications.length > 0 && (
          <span className="notification-badge">{notifications.length > 9 ? '9+' : notifications.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-popover">
          <div className="notification-header">
            <div>
              <h3>Notifications</h3>
              <p>{notifications.length} active alert{notifications.length === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div className="notification-list">
            {notifications.length === 0 ? (
              <div className="notification-empty">
                <NotificationsIcon size={28} />
                <span>No alerts right now</span>
              </div>
            ) : (
              notifications.map(notification => (
                <button
                  key={notification.id}
                  className={`notification-item ${notification.severity}`}
                  onClick={() => handleSelect(notification)}
                >
                  <span className="notification-item-icon">{renderIcon(notification.type)}</span>
                  <span className="notification-item-content">
                    <strong>{notification.title}</strong>
                    <span>{notification.detail}</span>
                    <small>{notification.meta}</small>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
