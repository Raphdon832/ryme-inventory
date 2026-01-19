import React, { useState, useEffect, useMemo } from 'react';
import api from '../api';
import { FiClock, FiTrash2, FiRefreshCw, FiAlertCircle, FiShoppingCart, FiBox, FiEdit, FiPlus, FiCheck, FiX, FiChevronRight, FiChevronDown, FiMinus } from 'react-icons/fi';
import useScrollLock from '../hooks/useScrollLock';
import { useSettings } from '../contexts/SettingsContext';
import './ActivityLog.css';

const INITIAL_VISIBLE_COUNT = 10;

const ActivityLog = () => {
  const { formatCurrency } = useSettings();
  const [activeTab, setActiveTab] = useState('activity');
  const [activityLog, setActivityLog] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [expandedDates, setExpandedDates] = useState({});
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Lock scroll when any confirmation modal is open
  useScrollLock(showDeleteConfirm !== null || showRestoreConfirm !== null || selectedActivity !== null);


  useEffect(() => {
    fetchData();
    // Cleanup expired items on page load
    api.cleanupExpiredRecycleBin();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activities, recycled] = await Promise.all([
        api.getActivityLog(),
        api.getRecycleBin()
      ]);
      setActivityLog(activities);
      setRecycleBin(recycled);
      
      // Auto-expand today and yesterday by default
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      setExpandedDates({ [today]: true, [yesterday]: true });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  // Group activities by date
  const groupedActivities = useMemo(() => {
    const groups = {};
    activityLog.forEach(activity => {
      const date = new Date(activity.timestamp).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    
    // Sort dates in descending order (most recent first)
    const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
    
    return sortedDates.map(date => ({
      date,
      activities: groups[date]
    }));
  }, [activityLog]);

  // Visible groups based on visibleCount
  const visibleGroups = useMemo(() => {
    let count = 0;
    const result = [];
    
    for (const group of groupedActivities) {
      if (count >= visibleCount) break;
      
      const remainingSlots = visibleCount - count;
      const activitiesToShow = group.activities.slice(0, remainingSlots);
      
      result.push({
        date: group.date,
        activities: activitiesToShow,
        hasMore: activitiesToShow.length < group.activities.length
      });
      
      count += activitiesToShow.length;
    }
    
    return result;
  }, [groupedActivities, visibleCount]);

  const totalActivities = activityLog.length;
  const hasMoreActivities = visibleCount < totalActivities;

  const handleRestore = async (id) => {
    setRestoring(true);
    try {
      await api.restoreFromRecycleBin(id);
      setShowRestoreConfirm(null);
      fetchData();
    } catch (error) {
      console.error('Error restoring item:', error);
    } finally {
      setRestoring(false);
    }
  };

  const handlePermanentDelete = async (id) => {
    setDeleting(true);
    try {
      await api.delete(`/recycle-bin/${id}`);
      setShowDeleteConfirm(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleDateExpanded = (date) => {
    setExpandedDates(prev => ({
      ...prev,
      [date]: !prev[date]
    }));
  };

  const handleSeeMore = () => {
    setVisibleCount(prev => prev + 10);
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'delete':
        return <FiTrash2 className="action-icon delete" />;
      case 'restore':
        return <FiRefreshCw className="action-icon restore" />;
      case 'create':
        return <FiPlus className="action-icon create" />;
      case 'update':
        return <FiEdit className="action-icon update" />;
      case 'permanent_delete':
        return <FiX className="action-icon permanent-delete" />;
      case 'auto_cleanup':
        return <FiClock className="action-icon cleanup" />;
      default:
        return <FiClock className="action-icon" />;
    }
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'order':
        return <FiShoppingCart />;
      case 'product':
        return <FiBox />;
      default:
        return <FiClock />;
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString);
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    
    if (dateString === today) return 'Today';
    if (dateString === yesterday) return 'Yesterday';
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  const getDaysUntilExpiry = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diffInDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return diffInDays;
  };

  return (
    <div className="activity-log-container">
      <div className="activity-log-header">
        <div>
          <h1>Activity Log</h1>
          <p>Track all activities and manage deleted items</p>
        </div>
        <button className="btn-secondary" onClick={fetchData}>
          <FiRefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="activity-tabs">
        <button 
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <FiClock size={16} />
          Activity Log
          <span className="tab-count">{activityLog.length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'recycle' ? 'active' : ''}`}
          onClick={() => setActiveTab('recycle')}
        >
          <FiTrash2 size={16} />
          Recycle Bin
          <span className="tab-count">{recycleBin.length}</span>
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {/* Activity Log Tab */}
          {activeTab === 'activity' && (
            <div className="activity-groups">
              {activityLog.length === 0 ? (
                <div className="empty-state">
                  <FiClock size={48} style={{ opacity: 0.3 }} />
                  <h3>No activity yet</h3>
                  <p>Activities will appear here as you use the app</p>
                </div>
              ) : (
                <>
                  {visibleGroups.map(group => (
                    <div key={group.date} className="activity-date-group">
                      <button 
                        className="date-group-header"
                        onClick={() => toggleDateExpanded(group.date)}
                      >
                        <div className="date-group-title">
                          {expandedDates[group.date] ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                          <span>{formatDateHeader(group.date)}</span>
                          <span className="date-group-count">{group.activities.length}{group.hasMore ? '+' : ''}</span>
                        </div>
                      </button>
                      
                      {expandedDates[group.date] && (
                        <div className="activity-list">
                          {group.activities.map(activity => (
                            <div 
                              key={activity.id} 
                              className="activity-item clickable"
                              onClick={() => setSelectedActivity(activity)}
                            >
                              <div className="activity-icon">
                                {getActionIcon(activity.action)}
                              </div>
                              <div className="activity-content">
                                <div className="activity-description">
                                  <span className="activity-entity-icon">{getEntityIcon(activity.entity_type)}</span>
                                  {activity.description}
                                </div>
                                <div className="activity-meta">
                                  <span className={`activity-action ${activity.action}`}>{activity.action.replace('_', ' ')}</span>
                                  <span className="activity-time">
                                    {new Date(activity.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <div className="activity-arrow">
                                <FiChevronRight size={18} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {hasMoreActivities && (
                    <button className="see-more-btn" onClick={handleSeeMore}>
                      <FiChevronDown size={16} />
                      See More ({totalActivities - visibleCount} remaining)
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Recycle Bin Tab */}
          {activeTab === 'recycle' && (
            <div className="recycle-bin-list">
              {recycleBin.length === 0 ? (
                <div className="empty-state">
                  <FiTrash2 size={48} style={{ opacity: 0.3 }} />
                  <h3>Recycle bin is empty</h3>
                  <p>Deleted items will appear here for 50 days</p>
                </div>
              ) : (
                recycleBin.map(item => {
                  const daysLeft = getDaysUntilExpiry(item.expires_at);
                  return (
                    <div key={item.id} className="recycle-item">
                      <div className="recycle-icon">
                        {getEntityIcon(item.type)}
                      </div>
                      <div className="recycle-content">
                        <div className="recycle-title">
                          {item.type === 'order' 
                            ? `Order #${item.original_id.slice(0, 8)} - ${item.customer_name}`
                            : item.name || `Item #${item.original_id.slice(0, 8)}`
                          }
                        </div>
                        <div className="recycle-meta">
                          <span className="recycle-type">{item.type}</span>
                          <span className="recycle-deleted">Deleted {formatTimeAgo(item.deleted_at)}</span>
                          <span className={`recycle-expires ${daysLeft <= 7 ? 'warning' : ''}`}>
                            <FiAlertCircle size={12} />
                            {daysLeft} days left
                          </span>
                        </div>
                      </div>
                      <div className="recycle-actions">
                        <button 
                          className="btn-icon restore"
                          onClick={() => setShowRestoreConfirm(item.id)}
                          title="Restore"
                        >
                          <FiRefreshCw size={18} />
                        </button>
                        <button 
                          className="btn-icon delete"
                          onClick={() => setShowDeleteConfirm(item.id)}
                          title="Delete Permanently"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreConfirm && (
        <div className="modal-overlay" onClick={() => setShowRestoreConfirm(null)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FiRefreshCw style={{ marginRight: '8px' }} /> Restore Item</h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to restore this item?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRestoreConfirm(null)}>Cancel</button>
              <button className="btn-primary" onClick={() => handleRestore(showRestoreConfirm)} disabled={restoring}>
                {restoring ? (
                  <><span className="btn-spinner"></span> Restoring...</>
                ) : (
                  <><FiCheck size={16} /> Restore</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--danger-text)' }}>
                <FiAlertCircle style={{ marginRight: '8px' }} /> Permanent Delete
              </h3>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete this item?</p>
              <p className="warning-text">This action cannot be undone!</p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn-danger" onClick={() => handlePermanentDelete(showDeleteConfirm)} disabled={deleting}>
                {deleting ? (
                  <><span className="btn-spinner"></span> Deleting...</>
                ) : (
                  <><FiTrash2 size={16} /> Delete Permanently</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="modal-overlay" onClick={() => setSelectedActivity(null)}>
          <div className="modal-content activity-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="activity-detail-header">
                <div className="activity-detail-icon">
                  {getActionIcon(selectedActivity.action)}
                </div>
                <div>
                  <h3>{selectedActivity.action.replace('_', ' ').toUpperCase()}</h3>
                  <span className="activity-detail-entity">
                    {getEntityIcon(selectedActivity.entity_type)} {selectedActivity.entity_type}
                  </span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedActivity(null)}>
                <FiX size={20} />
              </button>
            </div>
            <div className="modal-body activity-detail-body">
              <div className="activity-detail-section">
                <label>Description</label>
                <p>{selectedActivity.description}</p>
              </div>
              
              <div className="activity-detail-section">
                <label>Timestamp</label>
                <p>
                  {new Date(selectedActivity.timestamp).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })} at {new Date(selectedActivity.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                  })}
                </p>
              </div>

              {selectedActivity.data && (() => {
                try {
                  const data = typeof selectedActivity.data === 'string' 
                    ? JSON.parse(selectedActivity.data) 
                    : selectedActivity.data;
                  
                  return (
                    <div className="activity-detail-section">
                      <label>Related Data</label>
                      <div className="activity-detail-data">
                        {/* Order Data */}
                        {selectedActivity.entity_type === 'order' && (
                          <div className="detail-data-grid">
                            {data.id && (
                              <div className="detail-data-item">
                                <span className="detail-label">Order ID</span>
                                <span className="detail-value">#{data.id.slice(0, 8)}</span>
                              </div>
                            )}
                            {data.customer_name && (
                              <div className="detail-data-item">
                                <span className="detail-label">Customer</span>
                                <span className="detail-value">{data.customer_name}</span>
                              </div>
                            )}
                            {data.total_sales_price !== undefined && (
                              <div className="detail-data-item">
                                <span className="detail-label">Total</span>
                                <span className="detail-value">{formatCurrency(data.total_sales_price)}</span>
                              </div>
                            )}
                            {data.total_profit !== undefined && (
                              <div className="detail-data-item">
                                <span className="detail-label">Profit</span>
                                <span className="detail-value profit">{formatCurrency(data.total_profit)}</span>
                              </div>
                            )}
                            {data.payment_status && (
                              <div className="detail-data-item">
                                <span className="detail-label">Status</span>
                                <span className={`detail-value status-badge ${data.payment_status.toLowerCase()}`}>
                                  {data.payment_status}
                                </span>
                              </div>
                            )}
                            
                            {/* Order Edit Changes */}
                            {selectedActivity.action === 'update' && data.changes && (
                              <div className="detail-data-item full-width">
                                <span className="detail-label">Changes Made</span>
                                <div className="changes-list">
                                  {data.changes.added && data.changes.added.length > 0 && (
                                    <div className="change-group added">
                                      <span className="change-group-title">
                                        <FiPlus size={14} /> Added Items
                                      </span>
                                      {data.changes.added.map((item, idx) => (
                                        <div key={idx} className="change-item">
                                          <span>{item.product_name}</span>
                                          <span className="change-qty">×{item.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {data.changes.removed && data.changes.removed.length > 0 && (
                                    <div className="change-group removed">
                                      <span className="change-group-title">
                                        <FiMinus size={14} /> Removed Items
                                      </span>
                                      {data.changes.removed.map((item, idx) => (
                                        <div key={idx} className="change-item">
                                          <span>{item.product_name}</span>
                                          <span className="change-qty">×{item.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {data.changes.modified && data.changes.modified.length > 0 && (
                                    <div className="change-group modified">
                                      <span className="change-group-title">
                                        <FiEdit size={14} /> Modified Items
                                      </span>
                                      {data.changes.modified.map((item, idx) => (
                                        <div key={idx} className="change-item">
                                          <span>{item.product_name}</span>
                                          <span className="change-detail">
                                            {item.old_quantity !== item.new_quantity && (
                                              <span>Qty: {item.old_quantity} → {item.new_quantity}</span>
                                            )}
                                            {item.old_discount !== item.new_discount && (
                                              <span>Discount: {item.old_discount}% → {item.new_discount}%</span>
                                            )}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {(!data.changes.added || data.changes.added.length === 0) &&
                                   (!data.changes.removed || data.changes.removed.length === 0) &&
                                   (!data.changes.modified || data.changes.modified.length === 0) && (
                                    <p className="no-changes">No item changes detected</p>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {data.items && data.items.length > 0 && (
                              <div className="detail-data-item full-width">
                                <span className="detail-label">Current Items ({data.items.length})</span>
                                <div className="detail-items-list">
                                  {data.items.map((item, idx) => (
                                    <div key={idx} className="detail-item-row">
                                      <span>{item.product_name}</span>
                                      <span className="item-qty">×{item.quantity}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Product Data */}
                        {selectedActivity.entity_type === 'product' && (
                          <div className="detail-data-grid">
                            {data.id && (
                              <div className="detail-data-item">
                                <span className="detail-label">Product ID</span>
                                <span className="detail-value">#{data.id.slice(0, 8)}</span>
                              </div>
                            )}
                            {data.name && (
                              <div className="detail-data-item full-width">
                                <span className="detail-label">Product Name</span>
                                <span className="detail-value">{data.name}</span>
                              </div>
                            )}
                            {data.sorting_code && (
                              <div className="detail-data-item">
                                <span className="detail-label">Sort Code</span>
                                <span className="detail-value code">{data.sorting_code}</span>
                              </div>
                            )}
                            {data.stock_quantity !== undefined && (
                              <div className="detail-data-item">
                                <span className="detail-label">Stock</span>
                                <span className="detail-value">{data.stock_quantity}</span>
                              </div>
                            )}
                            {data.cost_of_production !== undefined && (
                              <div className="detail-data-item">
                                <span className="detail-label">Cost</span>
                                <span className="detail-value">{formatCurrency(data.cost_of_production)}</span>
                              </div>
                            )}
                            {data.sales_price !== undefined && (
                              <div className="detail-data-item">
                                <span className="detail-label">Sales Price</span>
                                <span className="detail-value">{formatCurrency(data.sales_price)}</span>
                              </div>
                            )}
                            {data.profit !== undefined && (
                              <div className="detail-data-item">
                                <span className="detail-label">Profit/Unit</span>
                                <span className="detail-value profit">{formatCurrency(data.profit)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Generic fallback for other entity types */}
                        {selectedActivity.entity_type !== 'order' && selectedActivity.entity_type !== 'product' && (
                          <pre className="detail-raw-json">{JSON.stringify(data, null, 2)}</pre>
                        )}
                      </div>
                    </div>
                  );
                } catch (e) {
                  return null;
                }
              })()}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedActivity(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
