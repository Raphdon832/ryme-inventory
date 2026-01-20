import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiCheck, FiTrash2, FiSearch, FiShoppingCart, FiUser, FiMapPin, FiAlertCircle, FiEdit2, FiMinus, FiPackage, FiClock, FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import api from '../api';
import { useSettings } from '../contexts/SettingsContext';
import offlineManager from '../utils/offlineManager';
import soundManager from '../utils/soundManager';
import './CreateOrder.css';

const CreateOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useSettings();
  const isEditing = Boolean(id);
  const isOfflineOrder = id?.startsWith('offline_');
  
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineStatus, setOfflineStatus] = useState({ pendingCount: 0, offlineOrdersCount: 0 });
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [originalOrder, setOriginalOrder] = useState(null);
  const productSearchRef = useRef(null);
  const customerSearchRef = useRef(null);

  const [orderData, setOrderData] = useState({
    customer_id: '',
    customer_name: '',
    customer_address: '',
    items: [],
    discount: { type: 'none', value: 0 },
    status: 'pending',
    order_number: ''
  });

  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    discount: 0
  });

  // Subscribe to offline status
  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((status) => {
      setIsOnline(status.isOnline);
      setOfflineStatus(status);
    });
    
    // Get initial status
    offlineManager.getStatus().then(setOfflineStatus);
    
    return () => unsubscribe();
  }, []);

  // Load products
  useEffect(() => {
    const unsubscribe = api.subscribe('/products', (response) => {
      setProducts(response.data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Load customers
  useEffect(() => {
    const unsubscribe = api.subscribe('/customers', (response) => {
      setCustomers(response.data);
    });
    return () => unsubscribe();
  }, []);

  // Load order if editing
  useEffect(() => {
    if (isEditing && products.length > 0) {
      const fetchOrder = async () => {
        setOrderLoading(true);
        setError(null);
        try {
          let order;
          
          // Check if this is an offline order
          if (isOfflineOrder) {
            order = await offlineManager.getOfflineOrder(id);
            if (!order) {
              setError('Offline order not found');
              setTimeout(() => navigate('/orders'), 2000);
              return;
            }
          } else {
            const response = await api.get(`/orders/${id}`);
            order = response.data?.data || response.data;
            if (!order) {
              setError('Order not found');
              setTimeout(() => navigate('/orders'), 2000);
              return;
            }
          }
          
          const orderItems = order.items || [];
          const loadedOrderData = {
            customer_id: order.customer_id || '',
            customer_name: order.customer_name || '',
            customer_address: order.customer_address || '',
            items: orderItems.map(item => {
              const product = products.find(p => p.id === item.product_id);
              return {
                ...item,
                product_name: item.product_name || (product ? product.name : 'Unknown Product'),
                sales_price: item.sales_price_at_time || item.sales_price || (product ? product.sales_price : 0),
                cost: item.profit_at_time === undefined 
                  ? (item.cost || (product ? product.cost_of_production : 0))
                  : (item.sales_price_at_time - item.profit_at_time),
                stock: product ? product.stock_quantity : 0,
                original_quantity: item.quantity,
                discount_percentage: item.discount_percentage || 0
              };
            }),
            discount: order.discount || { type: 'none', value: 0 },
            status: order.status || 'pending',
            order_number: order.order_number || '',
            _offline: order._offline || false
          };
          setOrderData(loadedOrderData);
          setOriginalOrder(loadedOrderData);
          setCustomerSearch(order.customer_name || '');
        } catch (error) {
          console.error('Error fetching order:', error);
          setError('Failed to load order. Redirecting...');
          setTimeout(() => navigate('/orders'), 2000);
        } finally {
          setOrderLoading(false);
        }
      };
      fetchOrder();
    }
  }, [id, isEditing, isOfflineOrder, products, navigate]);

  // Track unsaved changes
  useEffect(() => {
    if (isEditing && originalOrder) {
      const hasChanges = JSON.stringify(orderData) !== JSON.stringify(originalOrder);
      setHasUnsavedChanges(hasChanges);
    } else if (!isEditing && (orderData.customer_name || orderData.items.length > 0)) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [orderData, originalOrder, isEditing]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productSearchRef.current && !productSearchRef.current.contains(e.target)) {
        setShowProductDropdown(false);
      }
      if (customerSearchRef.current && !customerSearchRef.current.contains(e.target)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const filteredCustomers = customers.filter((c) => {
    if (!customerSearch) return true;
    const search = customerSearch.toLowerCase();
    const matchesName = c.name?.toLowerCase().includes(search);
    const matchesEmail = c.email?.toLowerCase().includes(search);
    const matchesPhone = c.phone?.toLowerCase().includes(search);
    return matchesName || matchesEmail || matchesPhone;
  });

  const handleSelectProduct = (product) => {
    setCurrentItem({ ...currentItem, product_id: product.id });
    setProductSearch(product.sorting_code ? `[${product.sorting_code}] ${product.name}` : product.name);
    setShowProductDropdown(false);
  };

  const handleSelectCustomer = (customer) => {
    setOrderData({
      ...orderData,
      customer_id: customer.id,
      customer_name: customer.name || '',
      customer_address: customer.address || orderData.customer_address
    });
    setCustomerSearch(customer.name || '');
    setShowCustomerDropdown(false);
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || currentItem.quantity <= 0) return;
    
    const product = products.find(p => p.id === currentItem.product_id);
    if (!product) return;

    // Validate stock
    const existingItem = orderData.items.find(i => i.product_id === currentItem.product_id);
    const currentQtyInOrder = existingItem ? existingItem.quantity : 0;
    const availableStock = product.stock_quantity + (existingItem?.original_quantity || 0);
    
    if (currentQtyInOrder + Number(currentItem.quantity) > availableStock) {
      setError(`Cannot add more than ${availableStock} units of ${product.name} (${availableStock - currentQtyInOrder} available)`);
      setTimeout(() => setError(null), 3000);
      return;
    }

    const existingIndex = orderData.items.findIndex(i => i.product_id === currentItem.product_id);
    const discount = Number(currentItem.discount) || 0;
    
    if (existingIndex > -1) {
      const updatedItems = [...orderData.items];
      updatedItems[existingIndex].quantity += Number(currentItem.quantity);
      updatedItems[existingIndex].discount_percentage = discount;
      setOrderData({ ...orderData, items: updatedItems });
    } else {
      setOrderData({
        ...orderData,
        items: [...orderData.items, { 
          product_id: currentItem.product_id, 
          quantity: Number(currentItem.quantity), 
          product_name: product.name, 
          sales_price: product.sales_price, 
          discount_percentage: discount,
          profit: product.profit,
          cost: product.cost_of_production,
          stock: product.stock_quantity,
          sorting_code: product.sorting_code,
          original_quantity: 0
        }]
      });
    }
    setCurrentItem({ product_id: '', quantity: 1, discount: 0 });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleUpdateItemQuantity = (index, newQuantity) => {
    const item = orderData.items[index];
    const product = products.find(p => p.id === item.product_id);
    const availableStock = (product?.stock_quantity || 0) + (item.original_quantity || 0);
    
    if (newQuantity > availableStock) {
      setError(`Maximum available: ${availableStock} units`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    
    if (newQuantity < 1) {
      handleRemoveItem(index);
      return;
    }
    
    const updatedItems = [...orderData.items];
    updatedItems[index].quantity = newQuantity;
    setOrderData({ ...orderData, items: updatedItems });
    setEditingItemIndex(null);
  };

  const handleUpdateItemDiscount = (index, newDiscount) => {
    const updatedItems = [...orderData.items];
    updatedItems[index].discount_percentage = Math.min(100, Math.max(0, newDiscount));
    setOrderData({ ...orderData, items: updatedItems });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = orderData.items.filter((_, i) => i !== index);
    setOrderData({ ...orderData, items: updatedItems });
  };

  const handleSubmit = async () => {
    if (!orderData.customer_name || orderData.items.length === 0) return;
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Prepare order payload with full item details for offline storage
      const orderPayload = {
        customer_id: orderData.customer_id || '',
        customer_name: orderData.customer_name,
        customer_address: orderData.customer_address,
        items: orderData.items.map(item => ({ 
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          discount_percentage: item.discount_percentage || 0,
          sales_price: item.sales_price,
          cost: item.cost
        })),
        discount: orderData.discount
      };

      // Check if we're online
      if (!isOnline) {
        // Save offline
        if (isEditing) {
          if (isOfflineOrder) {
            // Update existing offline order
            await offlineManager.updateOfflineOrder(id, orderPayload);
            setSuccessMessage('Order updated offline. Will sync when online.');
          } else {
            // Create offline update for existing server order
            await offlineManager.saveOfflineOrder({
              ...orderPayload,
              isEdit: true,
              originalId: id
            });
            setSuccessMessage('Order update saved offline. Will sync when online.');
          }
        } else {
          // Create new offline order
          await offlineManager.saveOfflineOrder(orderPayload);
          setSuccessMessage('Order saved offline. Will sync when online.');
        }
        
        soundManager.playSuccess();
        setHasUnsavedChanges(false);
        setTimeout(() => navigate('/orders'), 1500);
        return;
      }

      // Online mode - normal save
      if (isEditing) {
        if (isOfflineOrder) {
          // Sync the offline order to server first
          const { _offline, status: offlineStatus, createdAt, updatedAt, tempId, ...cleanPayload } = orderPayload;
          await api.post('/orders', cleanPayload);
          await offlineManager.deleteOfflineOrder(id);
        } else {
          await api.put(`/orders/${id}`, orderPayload);
        }
      } else {
        await api.post('/orders', orderPayload);
      }

      soundManager.playSuccess();
      setHasUnsavedChanges(false);
      navigate('/orders');
    } catch (error) {
      console.error('Error saving order:', error);
      soundManager.playError();
      
      // If online save failed, offer to save offline
      if (isOnline) {
        setError(`${error.message || 'Failed to save order.'} Would you like to save offline?`);
      } else {
        setError(error.message || 'Failed to save order. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveOffline = async () => {
    setSubmitting(true);
    setError(null);
    
    try {
      const orderPayload = {
        customer_id: orderData.customer_id || '',
        customer_name: orderData.customer_name,
        customer_address: orderData.customer_address,
        items: orderData.items.map(item => ({ 
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          discount_percentage: item.discount_percentage || 0,
          sales_price: item.sales_price,
          cost: item.cost
        })),
        discount: orderData.discount
      };

      if (isEditing && !isOfflineOrder) {
        await offlineManager.saveOfflineOrder({
          ...orderPayload,
          isEdit: true,
          originalId: id
        });
      } else {
        await offlineManager.saveOfflineOrder(orderPayload);
      }
      
      soundManager.playSuccess();
      setSuccessMessage('Order saved offline successfully!');
      setHasUnsavedChanges(false);
      setTimeout(() => navigate('/orders'), 1500);
    } catch (err) {
      soundManager.playError();
      setError('Failed to save offline. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/orders');
      }
    } else {
      navigate('/orders');
    }
  };

  const getTotalItems = () => {
    return orderData.items.reduce((acc, item) => acc + item.quantity, 0);
  };

  const calculateSubtotal = () => {
    return orderData.items.reduce((acc, item) => {
      const discount = Number(item.discount_percentage) || 0;
      const effectivePrice = item.sales_price * (1 - discount / 100);
      return acc + (effectivePrice * item.quantity);
    }, 0);
  };

  const calculateCost = () => {
    return orderData.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    if (orderData.discount && orderData.discount.value > 0) {
      if (orderData.discount.type === 'percentage') {
        return subtotal * (orderData.discount.value / 100);
      } else if (orderData.discount.type === 'fixed') {
        return Number(orderData.discount.value);
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
    return (totalSales - totalCost) - calculateDiscountAmount();
  };

  if (loading || orderLoading) {
    return (
      <div className="create-order-page">
        <div className="create-order-loading">
          <div className="loading-spinner"></div>
          <p>{orderLoading ? 'Loading order data...' : 'Loading products...'}</p>
        </div>
      </div>
    );
  }

  if (error && !orderData.customer_name && isEditing) {
    return (
      <div className="create-order-page">
        <div className="create-order-loading">
          <FiAlertCircle size={48} className="error-icon" />
          <p className="error-message">{error}</p>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      pending: 'status-pending',
      processing: 'status-processing',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return statusMap[status] || 'status-pending';
  };

  return (
    <div className="create-order-page">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="offline-banner">
          <FiWifiOff size={16} />
          <span>You're offline. Orders will be saved locally and synced when you're back online.</span>
        </div>
      )}

      {/* Success Toast */}
      {successMessage && (
        <div className="success-toast">
          <FiCheck size={18} />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)}>&times;</button>
        </div>
      )}

      {/* Error Toast */}
      {error && (
        <div className="error-toast">
          <FiAlertCircle size={18} />
          <span>{error}</span>
          {error.includes('save offline') && (
            <button className="save-offline-btn" onClick={handleSaveOffline}>
              Save Offline
            </button>
          )}
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Header */}
      <div className="create-order-header">
        <div className="header-left">
          <h1 className="create-order-title">
            {isEditing ? 'Edit Order' : 'Create Order'}
            {isEditing && orderData.order_number && (
              <span className="order-number-badge">#{orderData.order_number}</span>
            )}
            {isOfflineOrder && (
              <span className="offline-order-badge">
                <FiWifiOff size={12} /> Offline
              </span>
            )}
          </h1>
          <Link to="/orders" className="back-link" onClick={(e) => { if (hasUnsavedChanges && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) e.preventDefault(); }}>
            <FiArrowLeft />
            <span>Back to Orders</span>
          </Link>
        </div>
        {isEditing && (
          <div className="order-meta-info">
            <span className={`status-badge ${getStatusBadgeClass(orderData.status)}`}>
              {orderData.status?.charAt(0).toUpperCase() + orderData.status?.slice(1)}
            </span>
            {hasUnsavedChanges && (
              <span className="unsaved-badge">
                <FiEdit2 size={12} /> Unsaved changes
              </span>
            )}
          </div>
        )}
        <div className="header-actions">
          {!isOnline && (
            <span className="offline-indicator">
              <FiWifiOff size={14} />
            </span>
          )}
          <button 
            className="btn-secondary"
            onClick={handleCancel}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
            onClick={handleSubmit}
            disabled={!orderData.customer_name || orderData.items.length === 0 || submitting}
          >
            {submitting ? (
              <><span className="btn-spinner"></span> {isOnline ? (isEditing ? 'Updating...' : 'Creating...') : 'Saving...'}</>
            ) : (
              <><FiCheck size={16} /> {isOnline ? (isEditing ? 'Update Order' : 'Create Order') : 'Save Offline'}</>
            )}
          </button>
        </div>
      </div>

      <div className="create-order-content">
        {/* Left Column - Order Form */}
        <div className="order-form-section">
          {/* Customer Info Card */}
          <div className="form-card">
            <h3 className="card-title">
              <FiUser /> Customer Information
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Customer Name <span className="required">*</span></label>
                <div className="product-search-wrapper" ref={customerSearchRef}>
                  <div className="search-input-wrapper">
                    <FiSearch className="search-icon" />
                    <input 
                      className="form-input"
                      type="text" 
                      placeholder="Search or enter customer name" 
                      value={customerSearch}
                      onChange={(e) => {
                        const value = e.target.value;
                        setCustomerSearch(value);
                        setOrderData({ ...orderData, customer_name: value, customer_id: '' });
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                    />
                  </div>
                  {showCustomerDropdown && (
                    <div className="product-dropdown">
                      {filteredCustomers.length === 0 ? (
                        <div className="dropdown-empty">No customers found</div>
                      ) : (
                        filteredCustomers.slice(0, 6).map((customer) => (
                          <div
                            key={customer.id}
                            className={`dropdown-item ${orderData.customer_id === customer.id ? 'selected' : ''}`}
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <div className="dropdown-item-info">
                              <span className="product-name">{customer.name}</span>
                            </div>
                            <div className="dropdown-item-meta">
                              {customer.email && (
                                <span className="product-price" style={{ fontWeight: 500 }}>{customer.email}</span>
                              )}
                              {customer.phone && (
                                <span className="product-stock">{customer.phone}</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Customer Address</label>
                <input 
                  className="form-input"
                  type="text" 
                  placeholder="Enter address (optional)" 
                  value={orderData.customer_address} 
                  onChange={(e) => setOrderData({...orderData, customer_address: e.target.value})} 
                />
              </div>
            </div>
          </div>

          {/* Add Products Card */}
          <div className="form-card">
            <h3 className="card-title">
              <FiShoppingCart /> Order Items
            </h3>
            
            {/* Add Product Row */}
            <div className="add-product-row">
              <div className="product-search-wrapper" ref={productSearchRef}>
                <label className="form-label">Select Product</label>
                <div className="search-input-wrapper">
                  <FiSearch className="search-icon" />
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
                  />
                </div>
                {showProductDropdown && (
                  <div className="product-dropdown">
                    {filteredProducts.length === 0 ? (
                      <div className="dropdown-empty">No products found</div>
                    ) : (
                      filteredProducts.slice(0, 8).map(p => (
                        <div 
                          key={p.id} 
                          className={`dropdown-item ${currentItem.product_id === p.id ? 'selected' : ''}`}
                          onClick={() => handleSelectProduct(p)}
                        >
                          <div className="dropdown-item-info">
                            {p.sorting_code && (
                              <span className="product-code">{p.sorting_code}</span>
                            )}
                            <span className="product-name">{p.name}</span>
                          </div>
                          <div className="dropdown-item-meta">
                            <span className="product-price">{formatCurrency(p.sales_price)}</span>
                            <span className="product-stock">Stock: {p.stock_quantity}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div className="quantity-input">
                <label className="form-label">Qty</label>
                <input 
                  className="form-input"
                  type="number" 
                  min="1" 
                  value={currentItem.quantity || ''} 
                  onChange={(e) => setCurrentItem({...currentItem, quantity: e.target.value === '' ? '' : Number(e.target.value)})} 
                />
              </div>
              <div className="discount-input">
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
              <div className="add-btn-wrapper">
                <label className="form-label">&nbsp;</label>
                <button className="btn-primary add-item-btn" onClick={handleAddItem} type="button">
                  <FiPlus size={16} /> Add
                </button>
              </div>
            </div>

            {/* Items Table */}
            {orderData.items.length > 0 && (
              <div className="items-table-wrapper">
                <div className="items-count">
                  <FiPackage size={14} />
                  <span>{orderData.items.length} product{orderData.items.length !== 1 ? 's' : ''} ({getTotalItems()} items total)</span>
                </div>
                <div className="table-container">
                  <table className="items-table">
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
                      {orderData.items.map((item, index) => {
                        const discount = item.discount_percentage || 0;
                        const effectivePrice = item.sales_price * (1 - discount / 100);
                        const subtotal = effectivePrice * item.quantity;
                        const profit = (effectivePrice - item.cost) * item.quantity;
                        const product = products.find(p => p.id === item.product_id);
                        const availableStock = (product?.stock_quantity || 0) + (item.original_quantity || 0);
                        
                        return (
                          <tr key={index} className={editingItemIndex === index ? 'editing' : ''}>
                            <td className="product-cell">
                              <div className="product-cell-content">
                                <span className="product-name-text">{item.product_name}</span>
                                {item.sorting_code && <span className="product-code-small">{item.sorting_code}</span>}
                              </div>
                            </td>
                            <td className="quantity-cell">
                              <div className="quantity-controls">
                                <button 
                                  className="qty-btn"
                                  onClick={() => handleUpdateItemQuantity(index, item.quantity - 1)}
                                  disabled={item.quantity <= 1}
                                >
                                  <FiMinus size={12} />
                                </button>
                                <input
                                  type="number"
                                  className="qty-input"
                                  value={item.quantity}
                                  min="1"
                                  max={availableStock}
                                  onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                                />
                                <button 
                                  className="qty-btn"
                                  onClick={() => handleUpdateItemQuantity(index, item.quantity + 1)}
                                  disabled={item.quantity >= availableStock}
                                >
                                  <FiPlus size={12} />
                                </button>
                              </div>
                              {availableStock < 10 && (
                                <span className="stock-warning">{availableStock} left</span>
                              )}
                            </td>
                            <td>{formatCurrency(item.sales_price)}</td>
                            <td>
                              {editingItemIndex === index ? (
                                <input
                                  type="number"
                                  className="discount-edit-input"
                                  value={discount}
                                  min="0"
                                  max="100"
                                  onChange={(e) => handleUpdateItemDiscount(index, parseInt(e.target.value) || 0)}
                                  onBlur={() => setEditingItemIndex(null)}
                                  autoFocus
                                />
                              ) : (
                                <span 
                                  className={`discount-display ${discount > 0 ? 'has-discount' : ''}`}
                                  onClick={() => setEditingItemIndex(index)}
                                  title="Click to edit discount"
                                >
                                  {discount > 0 ? <span className="badge badge-warning">{discount}%</span> : '-'}
                                </span>
                              )}
                            </td>
                            <td className="subtotal-cell">{formatCurrency(subtotal)}</td>
                            <td className={`profit-cell ${profit >= 0 ? 'positive' : 'negative'}`}>
                              {formatCurrency(profit, { showSign: true })}
                            </td>
                            <td>
                              <button 
                                className="remove-item-btn"
                                onClick={() => handleRemoveItem(index)}
                                title="Remove item"
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

            {orderData.items.length === 0 && (
              <div className="empty-items">
                <FiShoppingCart size={32} />
                <p>No items added yet</p>
                <span>Search and add products above</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order Summary */}
        <div className="order-summary-section">
          <div className="summary-card">
            <h3 className="card-title">Order Summary</h3>
            
            <div className="summary-rows">
              <div className="summary-row">
                <span>Subtotal</span>
                <span className="value">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="summary-row">
                <span>Cost of Goods</span>
                <span className="value muted">{formatCurrency(calculateCost())}</span>
              </div>
            </div>

            {/* Discount Section */}
            <div className="discount-section">
              <label className="form-label">Discount</label>
              <div className="discount-controls">
                <select 
                  className="form-select" 
                  value={orderData.discount.type}
                  onChange={(e) => setOrderData({...orderData, discount: { ...orderData.discount, type: e.target.value, value: 0 }})}
                >
                  <option value="none">No Discount</option>
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed ({currencySymbol})</option>
                </select>
                
                {orderData.discount.type !== 'none' && (
                  <input 
                    type="number" 
                    className="form-input discount-value"
                    placeholder={orderData.discount.type === 'percentage' ? '%' : currencySymbol}
                    value={orderData.discount.value === 0 ? '' : orderData.discount.value}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Number(e.target.value);
                      setOrderData({...orderData, discount: { ...orderData.discount, value: val }});
                    }}
                  />
                )}
              </div>
            </div>

            {orderData.discount.type !== 'none' && calculateDiscountAmount() > 0 && (
              <div className="summary-row discount-row">
                <span>Discount</span>
                <span className="value success">-{formatCurrency(calculateDiscountAmount())}</span>
              </div>
            )}

            <div className="summary-divider"></div>

            <div className="summary-row total-row">
              <span>Total</span>
              <span className="value total">{formatCurrency(calculateTotal())}</span>
            </div>

            <div className="summary-row profit-row">
              <span>Estimated Profit</span>
              <span className={`value ${calculateProfit() >= 0 ? 'success' : 'danger'}`}>
                {formatCurrency(calculateProfit(), { showSign: true })}
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <button 
              className="btn-primary full-width"
              onClick={handleSubmit}
              disabled={!orderData.customer_name || orderData.items.length === 0 || submitting}
            >
              {submitting ? (
                <><span className="btn-spinner"></span> {isEditing ? 'Updating...' : 'Creating...'}</>
              ) : (
                <><FiCheck size={16} /> {isEditing ? 'Update Order' : 'Create Order'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateOrder;
