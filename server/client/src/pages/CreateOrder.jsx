import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiPlus, FiCheck, FiTrash2, FiSearch, FiShoppingCart, FiUser, FiMapPin } from 'react-icons/fi';
import api from '../api';
import { useSettings } from '../contexts/SettingsContext';
import './CreateOrder.css';

const CreateOrder = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useSettings();
  const isEditing = Boolean(id);
  
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const productSearchRef = useRef(null);
  const customerSearchRef = useRef(null);

  const [orderData, setOrderData] = useState({
    customer_id: '',
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
        try {
          const response = await api.get(`/orders/${id}`);
          const order = response.data;
          setOrderData({
            customer_id: order.customer_id || '',
            customer_name: order.customer_name,
            customer_address: order.customer_address || '',
            items: order.items.map(item => {
              const product = products.find(p => p.id === item.product_id);
              return {
                ...item,
                product_name: item.product_name || (product ? product.name : 'Unknown Product'),
                sales_price: item.sales_price_at_time || (product ? product.sales_price : 0),
                cost: item.profit_at_time === undefined 
                  ? (product ? product.cost_of_production : 0) 
                  : (item.sales_price_at_time - item.profit_at_time),
                stock: product ? product.stock_quantity : 0
              };
            }),
            discount: order.discount || { type: 'none', value: 0 }
          });
          setCustomerSearch(order.customer_name || '');
        } catch (error) {
          console.error('Error fetching order:', error);
          navigate('/orders');
        }
      };
      fetchOrder();
    }
  }, [id, isEditing, products, navigate]);

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
          sorting_code: product.sorting_code
        }]
      });
    }
    setCurrentItem({ product_id: '', quantity: 1, discount: 0 });
    setProductSearch('');
    setShowProductDropdown(false);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = orderData.items.filter((_, i) => i !== index);
    setOrderData({ ...orderData, items: updatedItems });
  };

  const handleSubmit = async () => {
    if (!orderData.customer_name || orderData.items.length === 0) return;
    setSubmitting(true);

    try {
      const orderPayload = {
        customer_id: orderData.customer_id || '',
        customer_name: orderData.customer_name,
        customer_address: orderData.customer_address,
        items: orderData.items.map(item => ({ 
          product_id: item.product_id, 
          quantity: item.quantity,
          discount_percentage: item.discount_percentage
        })),
        discount: orderData.discount
      };

      if (isEditing) {
        await api.put(`/orders/${id}`, orderPayload);
      } else {
        await api.post('/orders', orderPayload);
      }

      navigate('/orders');
    } catch (error) {
      console.error('Error saving order:', error);
    } finally {
      setSubmitting(false);
    }
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

  if (loading) {
    return (
      <div className="create-order-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="create-order-page">
      {/* Header */}
      <div className="create-order-header">
        <div className="header-left">
          <h1 className="create-order-title">{isEditing ? 'Edit Order' : 'Create Order'}</h1>
          <Link to="/orders" className="back-link">
            <FiArrowLeft />
            <span>Back to Orders</span>
          </Link>
        </div>
        <div className="header-actions">
          <button 
            className="btn-secondary"
            onClick={() => navigate('/orders')}
          >
            Cancel
          </button>
          <button 
            className="btn-primary"
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
                  <span>{orderData.items.length} item{orderData.items.length !== 1 ? 's' : ''} in order</span>
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
                        
                        return (
                          <tr key={index}>
                            <td className="product-cell">{item.product_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.sales_price)}</td>
                            <td>{discount > 0 ? <span className="badge badge-warning">{discount}%</span> : '-'}</td>
                            <td className="subtotal-cell">{formatCurrency(subtotal)}</td>
                            <td className={`profit-cell ${profit >= 0 ? 'positive' : 'negative'}`}>
                              {formatCurrency(profit, { showSign: true })}
                            </td>
                            <td>
                              <button 
                                className="remove-item-btn"
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
