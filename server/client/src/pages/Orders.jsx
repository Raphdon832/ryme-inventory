import React, { useState, useEffect } from 'react';
import api from '../api';
import { SkeletonTable, SkeletonOrderCardList } from '../components/Skeleton.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiShoppingCart, FiTag, FiTrendingUp, FiX, FiTrash2, FiEye, FiAlertCircle, FiEdit2, FiWifiOff, FiRefreshCw, FiCheck } from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import useScrollLock from '../hooks/useScrollLock';
import offlineManager from '../utils/offlineManager';
import './Orders.css';

const Orders = () => {
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [offlineOrders, setOfflineOrders] = useState([]);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [statModal, setStatModal] = useState({ open: false, label: '', value: '', footnote: '' });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  // Lock scroll when any modal is open
  useScrollLock(showDeleteConfirm || statModal.open);

  // Subscribe to offline status
  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((status) => {
      setIsOnline(status.isOnline);
      setSyncing(status.syncInProgress);
      // Reload offline orders when status changes
      loadOfflineOrders();
    });
    
    return () => unsubscribe();
  }, []);

  // Load offline orders
  const loadOfflineOrders = async () => {
    try {
      const offline = await offlineManager.getOfflineOrders();
      setOfflineOrders(offline);
    } catch (err) {
      console.error('Error loading offline orders:', err);
    }
  };

  useEffect(() => {
    loadOfflineOrders();
  }, []);

  useEffect(() => {
    const unsubscribeOrders = api.subscribe('/orders', (response) => {
      setOrders(response.data);
      setLoadingOrders(false);
    });

    return () => {
      unsubscribeOrders();
    };
  }, []);

  // Combine server orders with offline orders
  const allOrders = [
    ...offlineOrders.map(o => ({
      id: o.tempId,
      customer_name: o.customer_name,
      customer_address: o.customer_address,
      order_date: o.createdAt,
      payment_status: 'Pending',
      total_sales_price: o.items?.reduce((acc, item) => {
        const discount = item.discount_percentage || 0;
        const effectivePrice = (item.sales_price || 0) * (1 - discount / 100);
        return acc + (effectivePrice * item.quantity);
      }, 0) || 0,
      total_profit: 0,
      items: o.items || [],
      _offline: true,
      _syncStatus: o.status
    })),
    ...orders
  ];

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.length === 0) return;
    setDeleting(true);
    
    try {
      // Separate offline and server orders
      const offlineIds = selectedOrders.filter(id => id.toString().startsWith('offline_'));
      const serverIds = selectedOrders.filter(id => !id.toString().startsWith('offline_'));
      
      // Delete offline orders
      for (const id of offlineIds) {
        await offlineManager.deleteOfflineOrder(id);
      }
      
      // Delete server orders
      if (serverIds.length > 0) {
        await api.deleteMultipleOrders(serverIds);
      }
      
      setSelectedOrders([]);
      setDeleteMode(false);
      setShowDeleteConfirm(false);
      loadOfflineOrders();
    } catch (error) {
      console.error('Error deleting orders:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      await offlineManager.syncPendingOperations();
      loadOfflineOrders();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedOrders([]);
  };

  // Stats (only count paid orders for revenue and profit)
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.payment_status !== 'Pending');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.total_sales_price, 0);
  const totalProfit = paidOrders.reduce((acc, o) => acc + o.total_profit, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  return (
    <div className="orders-container">
      <div className="orders-header">
        <div className="orders-title">
          <h1>Orders</h1>
          <p>Create and manage customer orders</p>
        </div>
        <div className="orders-header-actions">
          <Link to="/orders/new" className="btn-primary">
            <FiPlus size={16} /> New Order
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div 
          className="stat-widget clickable border-blue"
          onClick={() => setStatModal({ open: true, label: 'Total Orders', value: totalOrders, footnote: 'Total number of orders placed by customers' })}
        >
          <div className="stat-header">
            <div className="stat-icon blue">
              <FiShoppingCart />
            </div>
          </div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{totalOrders}</div>
        </div>

        <div 
          className="stat-widget clickable border-purple"
          onClick={() => setStatModal({ open: true, label: 'Total Revenue', value: formatCurrency(totalRevenue), footnote: 'Total revenue from paid orders' })}
        >
          <div className="stat-header">
            <div className="stat-icon purple">
              <FiTag />
            </div>
          </div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
        </div>

        <div 
          className="stat-widget clickable border-green"
          onClick={() => setStatModal({ open: true, label: 'Total Profit', value: formatCurrency(totalProfit), footnote: 'Net profit from all paid orders' })}
        >
          <div className="stat-header">
            <div className="stat-icon green">
              <FiTrendingUp />
            </div>
          </div>
          <div className="stat-label">Total Profit</div>
          <div className="stat-value">{formatCurrency(totalProfit)}</div>
        </div>

        <div 
          className="stat-widget clickable border-orange"
          onClick={() => setStatModal({ open: true, label: 'Avg. Order Value', value: formatCurrency(avgOrderValue), footnote: 'Average value per order' })}
        >
          <div className="stat-header">
            <div className="stat-icon orange">
              <FiTag />
            </div>
          </div>
          <div className="stat-label">Avg. Order Value</div>
          <div className="stat-value">{formatCurrency(avgOrderValue)}</div>
        </div>
      </div>

      {/* Stat Detail Modal */}
      {statModal.open && (
        <div className="stat-modal-overlay" onClick={() => setStatModal({ ...statModal, open: false })}>
          <div className="stat-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stat-modal-header">
              <h3>{statModal.label}</h3>
              <button className="stat-modal-close" onClick={() => setStatModal({ ...statModal, open: false })}>×</button>
            </div>
            <div className="stat-modal-body">
              <div className="stat-modal-value">{statModal.value}</div>
              <div className="stat-modal-footnote">{statModal.footnote}</div>
            </div>
          </div>
        </div>
      )}

      {/* Orders List */}
      <div className="card">
        <div className="flex justify-between" style={{ marginBottom: '20px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Order History</h3>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {allOrders.length} orders
              {offlineOrders.length > 0 && (
                <span className="offline-count-badge">
                  <FiWifiOff size={10} /> {offlineOrders.length} offline
                </span>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {offlineOrders.length > 0 && isOnline && (
              <button 
                className="icon-btn-circle sync-btn"
                onClick={handleSyncNow}
                disabled={syncing}
                title="Sync offline orders"
              >
                <FiRefreshCw size={18} className={syncing ? 'spinning' : ''} />
              </button>
            )}
            {deleteMode ? (
              <>
                <button 
                  className="icon-btn-circle"
                  onClick={cancelDeleteMode}
                  title="Cancel"
                >
                  <FiX size={18} />
                </button>
                <button 
                  className="icon-btn-circle danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedOrders.length === 0}
                  title={`Delete ${selectedOrders.length} selected`}
                >
                  <FiTrash2 size={18} />
                  {selectedOrders.length > 0 && (
                    <span className="delete-count">{selectedOrders.length}</span>
                  )}
                </button>
              </>
            ) : (
              <button 
                className="icon-btn-circle"
                onClick={() => setDeleteMode(true)}
                title="Delete orders"
              >
                <FiTrash2 size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="table-container desktop-only">
          {loadingOrders ? (
            <SkeletonTable rows={8} cols={7} />
          ) : (
          <table>
            <thead>
              <tr>
                {deleteMode && <th style={{ width: '40px' }}></th>}
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total Sales</th>
                <th>Total Profit</th>
                <th>Status</th>
                {!deleteMode && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {allOrders.map(order => {
                const isSelected = selectedOrders.includes(order.id);
                const isOffline = order._offline;
                return (
                <tr 
                  key={order.id} 
                  className={`${deleteMode && isSelected ? 'row-selected' : ''} ${isOffline ? 'offline-row' : ''}`}
                  onClick={deleteMode ? () => toggleOrderSelection(order.id) : undefined}
                  style={deleteMode ? { cursor: 'pointer' } : undefined}
                >
                  {deleteMode && (
                    <td>
                      <div className={`table-checkbox ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <FiCheck size={12} />}
                      </div>
                    </td>
                  )}
                  <td>
                    <span className={`badge ${isOffline ? 'badge-offline' : 'badge-info'}`}>
                      {isOffline ? (
                        <><FiWifiOff size={10} /> Offline</>
                      ) : (
                        <>#{String(order.id).slice(0, 8)}...</>
                      )}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{order.customer_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(order.order_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(order.total_sales_price)}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: order.total_profit >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                      {formatCurrency(order.total_profit, { showSign: true })}
                    </span>
                  </td>
                  <td>
                    {isOffline ? (
                      <span className="badge badge-offline-status">
                        <FiWifiOff size={10} /> Pending Sync
                      </span>
                    ) : (
                    (() => {
                        const status = order.payment_status || 'Paid';
                        const isPaid = status === 'Paid';
                        return (
                            <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`} 
                                  style={{ 
                                    backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: isPaid ? '#10B981' : '#F59E0B',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    fontSize: '12px'
                                  }}>
                              {status}
                            </span>
                        );
                    })()
                    )}
                  </td>
                  {!deleteMode && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link 
                          to={`/orders/${order.id}`} 
                          className="table-action-btn"
                          title="View Details"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <FiEye size={18} />
                        </Link>
                        {order.payment_status !== 'Paid' && (
                          <Link
                            to={`/orders/edit/${order.id}`}
                            className="table-action-btn edit-btn"
                            title="Edit Order"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}
                          >
                            <FiEdit2 size={16} />
                          </Link>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )})}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={deleteMode ? 7 : 7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    <FiShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No orders yet</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Create your first order to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>

        {/* Mobile Card View */}
        {loadingOrders ? (
          <SkeletonOrderCardList count={3} />
        ) : (
        <div className="orders-list-mobile mobile-only">
          {allOrders.length === 0 ? (
            <div className="empty-orders-mobile">
              <FiShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No orders yet</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Create your first order to get started</p>
            </div>
          ) : (
            <>
              {[...allOrders]
                .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
                .slice(0, showAllOrders ? allOrders.length : 3)
                .map(order => {
                  const status = order._offline ? 'Pending Sync' : (order.payment_status || 'Paid');
                  const isPaid = status === 'Paid';
                  const isOffline = order._offline;
                  const isSelected = selectedOrders.includes(order.id);
                  
                  if (deleteMode) {
                    return (
                      <div 
                        key={order.id} 
                        className={`order-card-mobile selectable ${isSelected ? 'selected' : ''} ${isOffline ? 'offline' : ''}`}
                        onClick={() => toggleOrderSelection(order.id)}
                      >
                        <div className="order-card-checkbox">
                          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                            {isSelected && <FiCheck size={14} />}
                          </div>
                        </div>
                        <div className="order-card-content">
                          <div className="order-card-header">
                            <span className="order-card-customer">{order.customer_name}</span>
                            <span className={`order-card-status ${isOffline ? 'offline' : (isPaid ? 'paid' : 'pending')}`}>
                              {isOffline && <FiWifiOff size={10} />} {status}
                            </span>
                          </div>
                          <div className="order-card-id">
                            {isOffline ? (
                              <><FiWifiOff size={10} /> Offline Order</>
                            ) : (
                              <>#{String(order.id).slice(0, 8)}</>
                            )}
                          </div>
                          <div className="order-card-date">
                            {new Date(order.order_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="order-card-footer">
                            <div className="order-card-amount">
                              <span className="order-card-amount-label">Total</span>
                              <span className="order-card-amount-value">{formatCurrency(order.total_sales_price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="order-card-profit">
                              <span className="order-card-amount-label">Profit</span>
                              <span className={`order-card-profit-value ${order.total_profit >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(order.total_profit, { showSign: true, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Non-delete mode - use Link for server orders, div for offline
                  if (isOffline) {
                    return (
                      <div key={order.id} className="order-card-mobile offline" onClick={() => navigate(`/orders/edit/${order.id}`)}>
                        <div className="order-card-header">
                          <span className="order-card-customer">{order.customer_name}</span>
                          <span className="order-card-status offline">
                            <FiWifiOff size={10} /> Pending Sync
                          </span>
                        </div>
                        <div className="order-card-id">
                          <FiWifiOff size={10} /> Offline Order
                        </div>
                        <div className="order-card-date">
                          {new Date(order.order_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="order-card-footer">
                          <div className="order-card-amount">
                            <span className="order-card-amount-label">Total</span>
                            <span className="order-card-amount-value">{formatCurrency(order.total_sales_price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="order-card-profit">
                            <span className="order-card-amount-label">Items</span>
                            <span className="order-card-profit-value">{order.items?.length || 0}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                            <FiEdit2 size={16} style={{ color: 'var(--primary-color)' }} />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <Link to={`/orders/${order.id}`} key={order.id} className="order-card-mobile">
                      <div className="order-card-header">
                        <span className="order-card-customer">{order.customer_name}</span>
                        <span className={`order-card-status ${isPaid ? 'paid' : 'pending'}`}>
                          {status}
                        </span>
                      </div>
                      <div className="order-card-id">
                        #{String(order.id).slice(0, 8)}
                      </div>
                      <div className="order-card-date">
                        {new Date(order.order_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="order-card-footer">
                        <div className="order-card-amount">
                          <span className="order-card-amount-label">Total</span>
                          <span className="order-card-amount-value">{formatCurrency(order.total_sales_price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="order-card-profit">
                          <span className="order-card-amount-label">Profit</span>
                          <span className={`order-card-profit-value ${order.total_profit >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(order.total_profit, { showSign: true, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                          {order.payment_status !== 'Paid' && (
                            <button
                              type="button"
                              className="order-card-edit-btn"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/orders/edit/${order.id}`); }}
                              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', padding: '4px', display: 'flex' }}
                            >
                              <FiEdit2 size={16} />
                            </button>
                          )}
                          <FiEye className="order-card-arrow" style={{ margin: 0 }} />
                        </div>
                      </div>
                    </Link>
                  );
                })
              }
              {allOrders.length > 3 && (
                <button 
                  className="view-all-orders-btn"
                  onClick={() => setShowAllOrders(!showAllOrders)}
                >
                  {showAllOrders 
                    ? 'Show Less' 
                    : `View All ${allOrders.length} Orders`
                  }
                </button>
              )}
              <div className="view-all-orders">
                <span className="view-all-text">
                  {showAllOrders 
                    ? `Showing all ${allOrders.length} orders`
                    : allOrders.length > 3 
                      ? `Showing 3 of ${allOrders.length} orders` 
                      : `${allOrders.length} order${allOrders.length === 1 ? '' : 's'} total`
                  }
                </span>
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--danger-text)' }}>
                <FiAlertCircle style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Delete Orders
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '15px' }}>
                Are you sure you want to delete {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''}?
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Deleted orders will be moved to the recycle bin and permanently deleted after 50 days.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeleteSelected} disabled={deleting}>
                {deleting ? (
                  <><span className="btn-spinner"></span> Deleting...</>
                ) : (
                  <><FiTrash2 size={16} /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
