import React, { useState, useEffect } from 'react';
import api from '../api';
import { FiClock, FiTrash2, FiRefreshCw, FiAlertCircle, FiShoppingCart, FiBox, FiEdit, FiPlus, FiCheck, FiX } from 'react-icons/fi';
import './ActivityLog.css';

const ActivityLog = () => {
  const [activeTab, setActiveTab] = useState('activity');
  const [activityLog, setActivityLog] = useState([]);
  const [recycleBin, setRecycleBin] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(null);

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
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  const handleRestore = async (id) => {
    try {
      await api.restoreFromRecycleBin(id);
      setShowRestoreConfirm(null);
      fetchData();
    } catch (error) {
      console.error('Error restoring item:', error);
    }
  };

  const handlePermanentDelete = async (id) => {
    try {
      await api.delete(`/recycle-bin/${id}`);
      setShowDeleteConfirm(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
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
            <div className="activity-list">
              {activityLog.length === 0 ? (
                <div className="empty-state">
                  <FiClock size={48} style={{ opacity: 0.3 }} />
                  <h3>No activity yet</h3>
                  <p>Activities will appear here as you use the app</p>
                </div>
              ) : (
                activityLog.map(activity => (
                  <div key={activity.id} className="activity-item">
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
                        <span className="activity-time">{formatTimeAgo(activity.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))
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
              <button className="btn-primary" onClick={() => handleRestore(showRestoreConfirm)}>
                <FiCheck size={16} /> Restore
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
              <button className="btn-danger" onClick={() => handlePermanentDelete(showDeleteConfirm)}>
                <FiTrash2 size={16} /> Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
