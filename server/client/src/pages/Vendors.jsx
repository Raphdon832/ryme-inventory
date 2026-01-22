import React, { useEffect, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiGlobe, FiMail, FiPhone, FiBriefcase } from 'react-icons/fi';
import api from '../api';
import { useToast } from '../components/Toast';
import soundManager from '../utils/soundManager';

const Vendors = () => {
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    const unsubscribe = api.subscribe('/vendors', (response) => {
      setVendors(response.data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', contact_name: '', email: '', phone: '', website: '', address: '', notes: '' });
  };

  const openCreateModal = () => {
    setEditingVendor(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (vendor) => {
    setEditingVendor(vendor);
    setFormData({
      name: vendor.name || '',
      contact_name: vendor.contact_name || '',
      email: vendor.email || '',
      phone: vendor.phone || '',
      website: vendor.website || '',
      address: vendor.address || '',
      notes: vendor.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingVendor) {
        await api.put(`/vendors/${editingVendor.id}`, formData);
        toast.success(`Vendor "${formData.name}" updated successfully`);
      } else {
        await api.post('/vendors', formData);
        toast.success(`Vendor "${formData.name}" added successfully`);
      }
      soundManager.playSuccess();
      setShowModal(false);
      setEditingVendor(null);
      resetForm();
    } catch (error) {
      console.error('Error saving vendor:', error);
      toast.error('Failed to save vendor. Please try again.');
      soundManager.playError();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (vendor) => {
    if (!window.confirm(`Delete vendor ${vendor.name}?`)) return;
    setDeletingId(vendor.id);
    try {
      await api.delete(`/vendors/${vendor.id}`);
      toast.success(`Vendor "${vendor.name}" deleted successfully`);
      soundManager.playSuccess();
    } catch (error) {
      console.error('Error deleting vendor:', error);
      toast.error('Failed to delete vendor. Please try again.');
      soundManager.playError();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="page-title page-title--with-actions">
        <div>
          <h1>Vendors</h1>
          <p>Manage vendors, websites, and contact details</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <FiPlus /> Add Vendor
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-widget border-blue">
          <div className="stat-icon blue"><FiBriefcase /></div>
          <div className="stat-label">Total Vendors</div>
          <div className="stat-value">{new Intl.NumberFormat('en-US').format(vendors.length)}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading vendors...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Contact</th>
                  <th>Website</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{vendor.name}</div>
                      {vendor.contact_name && (
                        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{vendor.contact_name}</div>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {vendor.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiMail size={14} /> {vendor.email}
                          </span>
                        )}
                        {vendor.phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <FiPhone size={14} /> {vendor.phone}
                          </span>
                        )}
                        {!vendor.email && !vendor.phone && (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No contact details</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {vendor.website ? (
                        <a href={vendor.website} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <FiGlobe size={14} /> {vendor.website}
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="secondary"
                          style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%' }}
                          onClick={() => openEditModal(vendor)}
                          title="Edit vendor"
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          className="secondary"
                          style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%', color: 'var(--danger-text)' }}
                          onClick={() => handleDelete(vendor)}
                          disabled={deletingId === vendor.id}
                          title="Delete vendor"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {vendors.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                      No vendors yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box', transform: 'none' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', width: '95%', maxWidth: '560px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{editingVendor ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label className="form-label">Vendor Name *</label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Vendor name"
                  required
                />
              </div>
              <div>
                <label className="form-label">Contact Person</label>
                <input
                  className="form-input"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="Contact person"
                />
              </div>
              <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label className="form-label">Email</label>
                  <input
                    className="form-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </div>
              <div>
                <label className="form-label">Website</label>
                <input
                  className="form-input"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://vendor.com"
                />
              </div>
              <div>
                <label className="form-label">Address</label>
                <input
                  className="form-input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Address"
                />
              </div>
              <div>
                <label className="form-label">Notes</label>
                <textarea
                  className="form-input"
                  rows="3"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="button" className="secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendors;
