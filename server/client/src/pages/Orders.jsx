import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { FiPlus, FiShoppingCart, FiTag, FiTrendingUp, FiX, FiCheck, FiTrash2, FiEye, FiAlertCircle } from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import './Orders.css';

const Orders = () => {
  const { formatCurrency, currencySymbol } = useSettings();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [statModal, setStatModal] = useState({ open: false, label: '', value: '', footnote: '' });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    customer_address: '',
    items: [],
    discount: { type: 'none', value: 0 }
  });
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.length === 0) return;
    
    try {
      await api.deleteMultipleOrders(selectedOrders);
      setSelectedOrders([]);
      setDeleteMode(false);
      setShowDeleteConfirm(false);
      fetchOrders();
    } catch (error) {
      console.error('Error deleting orders:', error);
    }
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedOrders([]);
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || currentItem.quantity <= 0) return;
    
    const product = products.find(p => p.id === currentItem.product_id);
    if (!product) return;

    // Check if item already exists in order
    const existingIndex = newOrder.items.findIndex(i => i.product_id === currentItem.product_id);
    
    if (existingIndex > -1) {
      // Update quantity
      const updatedItems = [...newOrder.items];
      updatedItems[existingIndex].quantity += Number(currentItem.quantity);
      setNewOrder({ ...newOrder, items: updatedItems });
    } else {
      setNewOrder({
        ...newOrder,
        items: [...newOrder.items, { 
          product_id: currentItem.product_id, 
          quantity: Number(currentItem.quantity), 
          product_name: product.name, 
          sales_price: product.sales_price, 
          profit: product.profit,
          cost: product.cost_of_production,
          stock: product.stock_quantity
        }]
      });
    }
    setCurrentItem({ product_id: '', quantity: 1 });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({ ...newOrder, items: updatedItems });
  };

  const handleSubmitOrder = async () => {
    if (!newOrder.customer_name || newOrder.items.length === 0) return;

    try {
      await api.post('/orders', {
        customer_name: newOrder.customer_name,
        customer_address: newOrder.customer_address,
        items: newOrder.items.map(item => ({ product_id: item.product_id, quantity: item.quantity })),
        discount: newOrder.discount
      });
      setNewOrder({ customer_name: '', customer_address: '', items: [], discount: { type: 'none', value: 0 } });
      setShowModal(false);
      fetchOrders();
      fetchProducts(); // Refresh to update stock
    } catch (error) {
      console.error('Error creating order:', error);
    }
  };

  const calculateSubtotal = () => {
    return newOrder.items.reduce((acc, item) => acc + (item.sales_price * item.quantity), 0);
  };

  const calculateCost = () => {
    return newOrder.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (newOrder.discount && newOrder.discount.value > 0) {
      if (newOrder.discount.type === 'percentage') {
        return subtotal * (newOrder.discount.value / 100);
      } else if (newOrder.discount.type === 'fixed') {
        return Number(newOrder.discount.value);
      }
    }
    return 0;
  };

  const calculateTotal = () => {
    return Math.max(0, calculateSubtotal() - calculateDiscountAmount());
  };

  const calculateProfit = () => {
    const baseProfit = newOrder.items.reduce((acc, item) => acc + (item.profit * item.quantity), 0);
    return baseProfit - calculateDiscountAmount();
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
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <FiPlus size={16} /> New Order
          </button>
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
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{orders.length} orders</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
              {orders.map(order => {
                const isSelected = selectedOrders.includes(order.id);
                return (
                <tr 
                  key={order.id} 
                  className={deleteMode && isSelected ? 'row-selected' : ''}
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
                    <span className="badge badge-info">
                      #{String(order.id).slice(0, 8)}...
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
                    {(() => {
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
                    })()}
                  </td>
                  {!deleteMode && (
                    <td>
                      <Link 
                        to={`/orders/${order.id}`} 
                        className="table-action-btn"
                        title="View Details"
                        style={{ display: 'inline-block' }}
                      >
                        <FiEye size={18} />
                      </Link>
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
        </div>

        {/* Mobile Card View */}
        <div className="orders-list-mobile mobile-only">
          {orders.length === 0 ? (
            <div className="empty-orders-mobile">
              <FiShoppingCart size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No orders yet</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Create your first order to get started</p>
            </div>
          ) : (
            <>
              {[...orders]
                .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
                .slice(0, showAllOrders ? orders.length : 3)
                .map(order => {
                  const status = order.payment_status || 'Paid';
                  const isPaid = status === 'Paid';
                  const isSelected = selectedOrders.includes(order.id);
                  
                  if (deleteMode) {
                    return (
                      <div 
                        key={order.id} 
                        className={`order-card-mobile selectable ${isSelected ? 'selected' : ''}`}
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
                        <FiEye className="order-card-arrow" />
                      </div>
                    </Link>
                  );
                })
              }
              {orders.length > 3 && (
                <button 
                  className="view-all-orders-btn"
                  onClick={() => setShowAllOrders(!showAllOrders)}
                >
                  {showAllOrders 
                    ? 'Show Less' 
                    : `View All ${orders.length} Orders`
                  }
                </button>
              )}
              <div className="view-all-orders">
                <span className="view-all-text">
                  {showAllOrders 
                    ? `Showing all ${orders.length} orders`
                    : orders.length > 3 
                      ? `Showing 3 of ${orders.length} orders` 
                      : `${orders.length} order${orders.length === 1 ? '' : 's'} total`
                  }
                </span>
              </div>
            </>
          )}
        </div>
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
              <button className="btn-danger" onClick={handleDeleteSelected}>
                <FiTrash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Create New Order</h3>
              <button 
                className="secondary" 
                style={{ padding: '8px', width: '36px', height: '36px' }}
                onClick={() => { setShowModal(false); setNewOrder({ customer_name: '', customer_address: '', items: [], discount: { type: 'none', value: 0 } }); }}
              >
                <FiX size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Customer Name */}
              <div className="form-group grid-col-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label className="form-label">Customer Name</label>
                  <input 
                    className="form-input"
                    type="text" 
                    placeholder="Enter customer name" 
                    value={newOrder.customer_name} 
                    onChange={(e) => setNewOrder({...newOrder, customer_name: e.target.value})} 
                  />
                </div>
                <div>
                  <label className="form-label">Customer Address</label>
                  <input 
                    className="form-input"
                    type="text" 
                    placeholder="Enter address" 
                    value={newOrder.customer_address} 
                    onChange={(e) => setNewOrder({...newOrder, customer_address: e.target.value})} 
                  />
                </div>
              </div>

              {/* Add Product */}
              <div className="item-row">
                <div>
                  <label className="form-label">Select Product</label>
                  <select 
                    className="form-select"
                    value={currentItem.product_id} 
                    onChange={(e) => setCurrentItem({...currentItem, product_id: e.target.value})}
                  >
                    <option value="">-- Choose a product --</option>
                    {products.filter(p => p.stock_quantity > 0).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.sorting_code ? `[${p.sorting_code}] ` : ''}{p.name} • {formatCurrency(p.sales_price)} • Stock: {p.stock_quantity}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Qty</label>
                  <input 
                    className="form-input"
                    type="number" 
                    min="1" 
                    value={currentItem.quantity} 
                    onChange={(e) => setCurrentItem({...currentItem, quantity: Number(e.target.value) || 1})} 
                  />
                </div>
                <div>
                  <div style={{ height: '24px' }}></div> {/* Spacer */}
                  <button className="btn-primary" onClick={handleAddItem} type="button" style={{ width: '100%', justifyContent: 'center' }}>
                    <FiPlus size={16} /> Add Item
                  </button>
                </div>
              </div>

              {/* Order Items */}
              {newOrder.items.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <label className="form-label">Order Items ({newOrder.items.length})</label>
                  <div className="table-container">
                    <table className="order-items-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Subtotal</th>
                          <th>Profit</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newOrder.items.map((item, index) => (
                          <tr key={index}>
                            <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.sales_price)}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(item.sales_price * item.quantity)}</td>
                            <td style={{ color: 'var(--success-text)', fontWeight: 600 }}>{formatCurrency(item.profit * item.quantity, { showSign: true })}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                className="table-action-btn"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Order Summary & Discount */}
              {newOrder.items.length > 0 && (
                <div className="summary-section">
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
                    Order Summary
                  </div>
                  
                  <div className="summary-row">
                    <span>Subtotal:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(calculateSubtotal())}</span>
                  </div>

                  <div className="summary-row">
                    <span>Cost of Goods:</span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(calculateCost())}</span>
                  </div>

                  {/* Discount Controls */}
                  <div style={{ marginTop: '12px', marginBottom: '12px', padding: '12px', background: 'var(--bg-surface)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
                    <label className="form-label" style={{ marginBottom: '8px' }}>Discount</label>
                    <div className="discount-controls">
                      <select 
                        className="form-select" 
                        style={{ width: '140px' }}
                        value={newOrder.discount.type}
                        onChange={(e) => setNewOrder({...newOrder, discount: { ...newOrder.discount, type: e.target.value, value: 0 }})}
                      >
                        <option value="none">No Discount</option>
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount ({currencySymbol})</option>
                      </select>
                      
                      {newOrder.discount.type !== 'none' && (
                        <input 
                          type="number" 
                          className="form-input"
                          style={{ width: '120px' }}
                          placeholder={newOrder.discount.type === 'percentage' ? 'Percent' : 'Amount'}
                          value={newOrder.discount.value}
                          onChange={(e) => setNewOrder({...newOrder, discount: { ...newOrder.discount, value: Number(e.target.value) }})}
                        />
                      )}
                    </div>
                  </div>
                  
                  {newOrder.discount.type !== 'none' && calculateDiscountAmount() > 0 && (
                     <div className="summary-row" style={{ color: 'var(--success-text)' }}>
                       <span>Discount:</span>
                       <span>-{formatCurrency(calculateDiscountAmount())}</span>
                     </div>
                  )}

                  <div className="summary-row total">
                    <span>Total Sales Price:</span>
                    <span style={{ color: 'var(--primary-color)' }}>{formatCurrency(calculateTotal())}</span>
                  </div>
                  <div className="summary-row" style={{ marginTop: '4px' }}>
                    <span>Estimated Profit:</span>
                    <span style={{ color: calculateProfit() >= 0 ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>
                      {formatCurrency(calculateProfit(), { showSign: true })}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="secondary" 
                onClick={() => { setShowModal(false); setNewOrder({ customer_name: '', customer_address: '', items: [], discount: { type: 'none', value: 0 } }); }} 
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSubmitOrder}
                disabled={!newOrder.customer_name || newOrder.items.length === 0}
              >
                <FiCheck size={16} /> Complete Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
