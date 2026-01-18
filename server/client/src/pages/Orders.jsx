import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { SkeletonTable, SkeletonOrderCardList } from '../components/Skeleton.jsx';
import { Link } from 'react-router-dom';
import { FiPlus, FiShoppingCart, FiTag, FiTrendingUp, FiX, FiCheck, FiTrash2, FiEye, FiAlertCircle, FiSearch, FiEdit2 } from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import useScrollLock from '../hooks/useScrollLock';
import './Orders.css';

const Orders = () => {
  const { formatCurrency, currencySymbol } = useSettings();
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [statModal, setStatModal] = useState({ open: false, label: '', value: '', footnote: '' });
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const productSearchRef = useRef(null);

  // Lock scroll when any modal is open
  useScrollLock(showModal || showDeleteConfirm || statModal.open);

  const [newOrder, setNewOrder] = useState({
    customer_name: '',
    customer_address: '',
    items: [],
    discount: { type: 'none', value: 0 }
  });
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    discount: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const response = await api.get('/orders');
      setOrders(response.data.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoadingOrders(false);
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
    const discount = Number(currentItem.discount) || 0;
    
    if (existingIndex > -1) {
      // Update quantity and discount
      const updatedItems = [...newOrder.items];
      updatedItems[existingIndex].quantity += Number(currentItem.quantity);
      updatedItems[existingIndex].discount_percentage = discount;
      setNewOrder({ ...newOrder, items: updatedItems });
    } else {
      setNewOrder({
        ...newOrder,
        items: [...newOrder.items, { 
          product_id: currentItem.product_id, 
          quantity: Number(currentItem.quantity), 
          product_name: product.name, 
          sales_price: product.sales_price, 
          discount_percentage: discount,
          profit: product.profit,
          cost: product.cost_of_production,
          stock: product.stock_quantity,
          sorting_code: product.sorting_code
        }]
      });
    }
    setCurrentItem({ product_id: '', quantity: 1, discount: 0 });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleSelectProduct = (product) => {
    setCurrentItem({ ...currentItem, product_id: product.id });
    setProductSearch(product.sorting_code ? `[${product.sorting_code}] ${product.name}` : product.name);
    setShowProductDropdown(false);
  };

  // Filter products by sorting code or name
  const filteredProducts = products
    .filter(p => p.stock_quantity > 0)
    .filter(p => {
      if (!productSearch) return true;
      const search = productSearch.toLowerCase();
      const matchesCode = p.sorting_code && p.sorting_code.toLowerCase().includes(search);
      const matchesName = p.name.toLowerCase().includes(search);
      return matchesCode || matchesName;
    });

  const handleRemoveItem = (index) => {
    const updatedItems = newOrder.items.filter((_, i) => i !== index);
    setNewOrder({ ...newOrder, items: updatedItems });
  };

  const handleEditOrder = (order) => {
    setEditingOrderId(order.id);
    setNewOrder({
      customer_name: order.customer_name,
      customer_address: order.customer_address || '',
      items: order.items.map(item => {
        const product = products.find(p => p.id === item.product_id);
        return {
          ...item,
          product_name: item.product_name || (product ? product.name : 'Unknown Product'),
          sales_price: item.sales_price_at_time || (product ? product.sales_price : 0),
          cost: item.profit_at_time === undefined ? (product ? product.cost_of_production : 0) : (item.sales_price_at_time - item.profit_at_time),
          stock: product ? product.stock_quantity : 0
        };
      }),
      discount: order.discount || { type: 'none', value: 0 }
    });
    setShowModal(true);
  };

  const handleSubmitOrder = async () => {
    if (!newOrder.customer_name || newOrder.items.length === 0) return;

    try {
      const orderPayload = {
        customer_name: newOrder.customer_name,
        customer_address: newOrder.customer_address,
        items: newOrder.items.map(item => ({ 
          product_id: item.product_id, 
          quantity: item.quantity,
          discount_percentage: item.discount_percentage
        })),
        discount: newOrder.discount
      };

      if (editingOrderId) {
        await api.put(`/orders/${editingOrderId}`, orderPayload);
      } else {
        await api.post('/orders', orderPayload);
      }

      setNewOrder({ customer_name: '', customer_address: '', items: [], discount: { type: 'none', value: 0 } });
      setEditingOrderId(null);
      setProductSearch('');
      setShowProductDropdown(false);
      setShowModal(false);
      fetchOrders();
      fetchProducts(); // Refresh to update stock
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  const calculateSubtotal = () => {
    return newOrder.items.reduce((acc, item) => {
      const discount = Number(item.discount_percentage) || 0;
      const effectivePrice = item.sales_price * (1 - discount / 100);
      return acc + (effectivePrice * item.quantity);
    }, 0);
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
    const totalSales = calculateSubtotal();
    const totalCost = calculateCost();
    // Profit = (Sales - Cost) - Global Discount
    return (totalSales - totalCost) - calculateDiscountAmount();
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
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link 
                          to={`/orders/${order.id}`} 
                          className="table-action-btn"
                          title="View Details"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <FiEye size={18} />
                        </Link>
                        <button
                          className="table-action-btn edit-btn"
                          title="Edit Order"
                          onClick={() => handleEditOrder(order)}
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}
                        >
                          <FiEdit2 size={16} />
                        </button>
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
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                          <button
                            className="order-card-edit-btn"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEditOrder(order); }}
                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', padding: '4px', display: 'flex' }}
                          >
                            <FiEdit2 size={16} />
                          </button>
                          <FiEye className="order-card-arrow" style={{ margin: 0 }} />
                        </div>
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
              <button className="btn-danger" onClick={handleDeleteSelected}>
                <FiTrash2 size={16} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setEditingOrderId(null); setNewOrder({ customer_name: '', customer_address: '', items: [], discount: { type: 'none', value: 0 } }); setProductSearch(''); } }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>{editingOrderId ? 'Edit Order' : 'Create New Order'}</h3>
              <button 
                className="secondary" 
                style={{ padding: '8px', width: '36px', height: '36px' }}
                onClick={() => { setShowModal(false); setEditingOrderId(null); setNewOrder({ customer_name: '', customer_address: '', items: [], discount: { type: 'none', value: 0 } }); setProductSearch(''); setShowProductDropdown(false); }}
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
                <div style={{ position: 'relative' }} ref={productSearchRef}>
                  <label className="form-label">Select Product</label>
                  <div style={{ position: 'relative' }}>
                    <FiSearch size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                    <input 
                      className="form-input"
                      type="text"
                      placeholder="Search by code or name..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                        if (!e.target.value) setCurrentItem({ ...currentItem, product_id: '' });
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                  {showProductDropdown && (
                    <div className="product-search-dropdown">
                      {filteredProducts.length === 0 ? (
                        <div className="product-search-empty">No products found</div>
                      ) : (
                        filteredProducts.slice(0, 8).map(p => (
                          <div 
                            key={p.id} 
                            className={`product-search-item ${currentItem.product_id === p.id ? 'selected' : ''}`}
                            onClick={() => handleSelectProduct(p)}
                          >
                            <div className="product-search-info">
                              {p.sorting_code && (
                                <span className="product-search-code">{p.sorting_code}</span>
                              )}
                              <span className="product-search-name">{p.name}</span>
                            </div>
                            <div className="product-search-meta">
                              <span>{formatCurrency(p.sales_price)}</span>
                              <span className="product-search-stock">Stock: {p.stock_quantity}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="form-label">Qty</label>
                  <input 
                    className="form-input"
                    type="number" 
                    min="1" 
                    value={currentItem.quantity || ''} 
                    onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value === '' ? '' : Number(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="form-label">Discount %</label>
                  <input 
                    className="form-input"
                    type="number" 
                    min="0" 
                    max="100"
                    placeholder="0"
                    value={currentItem.discount || ''} 
                    onChange={(e) => setCurrentItem({...currentItem, discount: e.target.value === '' ? '' : Number(e.target.value)})} 
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
                          <th>Disc.</th>
                          <th>Subtotal</th>
                          <th>Profit</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {newOrder.items.map((item, index) => {
                          const discount = item.discount_percentage || 0;
                          const effectivePrice = item.sales_price * (1 - discount / 100);
                          const subtotal = effectivePrice * item.quantity;
                          const profit = (effectivePrice - item.cost) * item.quantity;
                          
                          return (
                          <tr key={index}>
                            <td style={{ fontWeight: 600 }}>{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.sales_price)}</td>
                            <td>{discount > 0 ? <span className="badge badge-warning">{discount}%</span> : '-'}</td>
                            <td style={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</td>
                            <td style={{ color: profit >= 0 ? 'var(--success-text)' : 'var(--danger-text)', fontWeight: 600 }}>
                              {formatCurrency(profit, { showSign: true })}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button 
                                className="table-action-btn"
                                onClick={() => handleRemoveItem(index)}
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </td>
                          </tr>
                          );
                        })}
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
                          value={newOrder.discount.value === 0 ? '' : newOrder.discount.value}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : Number(e.target.value);
                            setNewOrder({...newOrder, discount: { ...newOrder.discount, value: val }});
                          }}
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
                onClick={() => { setShowModal(false); setEditingOrderId(null); setNewOrder({ customer_name: '', customer_address: '', items: [], discount: { type: 'none', value: 0 } }); setProductSearch(''); setShowProductDropdown(false); }} 
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={handleSubmitOrder}
                disabled={!newOrder.customer_name || newOrder.items.length === 0}
              >
                <FiCheck size={16} /> {editingOrderId ? 'Update Order' : 'Complete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
