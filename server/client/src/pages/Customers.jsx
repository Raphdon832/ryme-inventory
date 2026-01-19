import React, { useEffect, useMemo, useState } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiUser, FiMail, FiPhone } from 'react-icons/fi';
import api from '../api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    const unsubscribe = api.subscribe('/customers', (response) => {
      setCustomers(response.data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = api.subscribe('/orders', (response) => {
      setOrders(response.data);
    });
    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', email: '', phone: '', address: '', notes: '' });
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSubmitting(true);
    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formData);
      } else {
        await api.post('/customers', formData);
      }
      setShowModal(false);
      setEditingCustomer(null);
      resetForm();
    } catch (error) {
      console.error('Error saving customer:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete customer ${customer.name}?`)) return;
    setDeletingId(customer.id);
    try {
      await api.delete(`/customers/${customer.id}`);
    } catch (error) {
      console.error('Error deleting customer:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const ordersByCustomer = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      const key = order.customer_id || `name:${(order.customer_name || '').toLowerCase()}`;
      const list = map.get(key) || [];
      list.push(order);
      map.set(key, list);
    });
    return map;
  }, [orders]);

  const getCustomerOrders = (customer) => {
    const keyById = customer.id ? ordersByCustomer.get(customer.id) : null;
    if (keyById && keyById.length) return keyById;
    return ordersByCustomer.get(`name:${(customer.name || '').toLowerCase()}`) || [];
  };

  const totalCustomers = customers.length;
  const totalOrders = orders.length;

  return (
    <div>
      <div className="page-title page-title--with-actions">
        <div>
          <h1>Customers</h1>
          <p>Manage customer profiles and track their orders</p>
        </div>
        <button className="btn-primary" onClick={openCreateModal}>
          <FiPlus /> Add Customer
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-widget border-blue">
          <div className="stat-icon blue"><FiUser /></div>
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{totalCustomers}</div>
        </div>
        <div className="stat-widget border-green">
          <div className="stat-icon green"><FiUser /></div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{totalOrders}</div>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '24px', color: 'var(--text-secondary)' }}>Loading customers...</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Orders</th>
                  <th>Last Order</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => {
                  const customerOrders = getCustomerOrders(customer);
                  const lastOrder = customerOrders
                    .filter((o) => o.order_date)
                    .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))[0];

                  return (
                    <tr key={customer.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{customer.name}</div>
                        {customer.address && (
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{customer.address}</div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {customer.email && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiMail size={14} /> {customer.email}
                            </span>
                          )}
                          {customer.phone && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <FiPhone size={14} /> {customer.phone}
                            </span>
                          )}
                          {!customer.email && !customer.phone && (
                            <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>No contact details</span>
                          )}
                        </div>
                      </td>
                      <td style={{ fontWeight: 600 }}>{customerOrders.length}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {lastOrder?.order_date ? new Date(lastOrder.order_date).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="secondary"
                            style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%' }}
                            onClick={() => openEditModal(customer)}
                            title="Edit customer"
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <button
                            className="secondary"
                            style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%', color: 'var(--danger-text)' }}
                            onClick={() => handleDelete(customer)}
                            disabled={deletingId === customer.id}
                            title="Delete customer"
                          >
                            <FiTrash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                      No customers yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', width: '95%', maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label className="form-label">Full Name *</label>
                <input
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Customer name"
                  required
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
                  {submitting ? 'Saving...' : 'Save Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
