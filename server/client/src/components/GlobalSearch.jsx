import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  SearchIcon, 
  CloseIcon, 
  BoxIcon, 
  CartIcon, 
  UsersIcon, 
  ShippingIcon, 
  DashboardIcon, 
  SettingsIcon, 
  TasksIcon, 
  CalendarIcon, 
  AnalyticsIcon, 
  ClockIcon, 
  HelpIcon, 
  ProfileIcon, 
  ArrowRightIcon 
} from './CustomIcons';
import api from '../api';
import './GlobalSearch.css';

// Navigation pages for quick access
const navigationPages = [
  { name: 'Dashboard', path: '/', icon: DashboardIcon, type: 'page' },
  { name: 'Inventory', path: '/inventory', icon: BoxIcon, type: 'page' },
  { name: 'Add Product', path: '/inventory/add', icon: BoxIcon, type: 'page' },
  { name: 'Orders', path: '/orders', icon: CartIcon, type: 'page' },
  { name: 'Create Order', path: '/orders/new', icon: CartIcon, type: 'page' },
  { name: 'Customers', path: '/customers', icon: UsersIcon, type: 'page' },
  { name: 'Vendors', path: '/vendors', icon: ShippingIcon, type: 'page' },
  { name: 'Tasks', path: '/tasks', icon: TasksIcon, type: 'page' },
  { name: 'Calendar', path: '/calendar', icon: CalendarIcon, type: 'page' },
  { name: 'Analytics', path: '/analytics', icon: AnalyticsIcon, type: 'page' },
  { name: 'Activity Log', path: '/activity-log', icon: ClockIcon, type: 'page' },
  { name: 'Settings', path: '/settings', icon: SettingsIcon, type: 'page' },
  { name: 'Profile', path: '/profile', icon: ProfileIcon, type: 'page' },
  { name: 'Help', path: '/help', icon: HelpIcon, type: 'page' },
];

const GlobalSearch = ({ isOpen, onClose, isMobile = false }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({
    products: [],
    orders: [],
    customers: [],
    vendors: [],
    pages: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isVisible, setIsVisible] = useState(isOpen); 
  const inputRef = useRef(null);
  const resultsRef = useRef(null);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);

  // Handle visibility and animation
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // All data for searching
  const [allData, setAllData] = useState({
    products: [],
    orders: [],
    customers: [],
    vendors: []
  });

  // Load all data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [productsRes, ordersRes, customersRes, vendorsRes] = await Promise.all([
          api.get('/products'),
          api.get('/orders'),
          api.get('/customers'),
          api.get('/vendors')
        ]);
        
        setAllData({
          products: productsRes.data?.data || [],
          orders: ordersRes.data?.data || [],
          customers: customersRes.data?.data || [],
          vendors: vendorsRes.data?.data || []
        });
      } catch (error) {
        console.error('Error loading search data:', error);
      }
    };

    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when closed fully
  useEffect(() => {
    if (!isVisible) {
      setQuery('');
      setResults({ products: [], orders: [], customers: [], vendors: [], pages: [] });
      setSelectedIndex(0);
      setSwipeOffset(0);
    }
  }, [isVisible]);

  // Search function
  const performSearch = useCallback((searchQuery) => {
    if (!searchQuery.trim()) {
      setResults({ products: [], orders: [], customers: [], vendors: [], pages: [] });
      return;
    }

    setIsLoading(true);
    const q = searchQuery.toLowerCase().trim();

    // Search products
    const matchedProducts = allData.products.filter(p => 
      (p.name || '').toLowerCase().includes(q) ||
      (p.product_name || '').toLowerCase().includes(q) ||
      (p.brand_name || '').toLowerCase().includes(q) ||
      (p.sorting_code || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ).slice(0, 5);

    // Search orders
    const matchedOrders = allData.orders.filter(o => 
      (o.id || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q) ||
      (o.items || []).some(item => 
        (item.product_name || '').toLowerCase().includes(q)
      )
    ).slice(0, 5);

    // Search customers
    const matchedCustomers = allData.customers.filter(c => 
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    ).slice(0, 5);

    // Search vendors
    const matchedVendors = allData.vendors.filter(v => 
      (v.name || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q) ||
      (v.company || '').toLowerCase().includes(q)
    ).slice(0, 5);

    // Search navigation pages
    const matchedPages = navigationPages.filter(p => 
      p.name.toLowerCase().includes(q)
    ).slice(0, 5);

    setResults({
      products: matchedProducts,
      orders: matchedOrders,
      customers: matchedCustomers,
      vendors: matchedVendors,
      pages: matchedPages
    });

    setIsLoading(false);
    setSelectedIndex(0);
  }, [allData]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query);
    }, 150);

    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Get all results as flat array for keyboard navigation
  const getAllResults = useCallback(() => {
    const all = [];
    
    results.pages.forEach(p => all.push({ ...p, type: 'page' }));
    results.products.forEach(p => all.push({ ...p, type: 'product' }));
    results.orders.forEach(o => all.push({ ...o, type: 'order' }));
    results.customers.forEach(c => all.push({ ...c, type: 'customer' }));
    results.vendors.forEach(v => all.push({ ...v, type: 'vendor' }));
    
    return all;
  }, [results]);

  // Handle result selection
  const handleSelect = useCallback((item, type) => {
    switch (type) {
      case 'page':
        navigate(item.path);
        break;
      case 'product':
        navigate(`/inventory/edit/${item.id}`);
        break;
      case 'order':
        navigate(`/orders/${item.id}`);
        break;
      case 'customer':
        navigate('/customers');
        break;
      case 'vendor':
        navigate('/vendors');
        break;
      default:
        break;
    }
    onClose();
  }, [navigate, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    const allResults = getAllResults();
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      e.preventDefault();
      const item = allResults[selectedIndex];
      handleSelect(item, item.type);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [getAllResults, selectedIndex, handleSelect, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selected = resultsRef.current.querySelector('.search-result-item.selected');
      if (selected) {
        selected.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  // Touch handlers for mobile drag-to-close
  const handleTouchStart = (e) => {
    if (!isMobile) return;
    
    // Don't trigger drag if scrolling internally in the results
    const resultsElement = resultsRef.current;
    if (resultsElement && resultsElement.contains(e.target) && resultsElement.scrollTop > 0) {
      return; 
    }

    touchStartY.current = e.touches[0].clientY;
    isDragging.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isMobile || !isDragging.current) return;
    
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStartY.current;
    
    // Only drag when pulling down
    if (diff > 0) {
      // Prevent default to stop scrolling background body if needed, 
      // but might interfere with expected browser behavior.
      // e.preventDefault(); 
      setSwipeOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging.current) return;
    
    isDragging.current = false;
    
    // Threshold to close
    if (swipeOffset > 120) {
      onClose();
    } else {
      setSwipeOffset(0); // Snap back
    }
  };


  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        if (!isOpen) {
          // This will be handled by parent component
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen]);

  const hasResults = results.products.length > 0 || 
                     results.orders.length > 0 || 
                     results.customers.length > 0 || 
                     results.vendors.length > 0 || 
                     results.pages.length > 0;

  let currentIndex = 0;

  if (!isVisible) return null;

  return (
    <div 
      className={`global-search-overlay ${isMobile ? 'mobile' : ''} ${!isOpen ? 'closing' : ''}`} 
      onClick={onClose}
    >
      <div 
        className={`global-search-container ${isMobile ? 'mobile' : ''} ${!isOpen ? 'closing' : ''}`} 
        onClick={e => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={isMobile && swipeOffset > 0 ? { 
          transform: `translateY(${swipeOffset}px)`,
          transition: isDragging.current ? 'none' : 'transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)' 
        } : {}}
      >
        {/* Search Input */}
        <div className="global-search-input-wrapper">
          <SearchIcon className="global-search-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search products, orders, customers, pages..."
            className="global-search-input"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
          />
          {query && (
            <button className="global-search-clear" onClick={() => setQuery('')}>
              <CloseIcon size={18} />
            </button>
          )}
          <button className="global-search-close" onClick={onClose}>
            <span>ESC</span>
          </button>
        </div>

        {/* Results */}
        <div className="global-search-results" ref={resultsRef}>
          {isLoading && (
            <div className="global-search-loading">Searching...</div>
          )}

          {!isLoading && query && !hasResults && (
            <div className="global-search-empty">
              <p>No results found for "{query}"</p>
              <span>Try searching for products, orders, customers, or page names</span>
            </div>
          )}

          {!query && (
            <div className="global-search-hint">
              <p>Quick Navigation</p>
              <div className="global-search-quick-links">
                {navigationPages.slice(0, 6).map((page) => (
                  <button
                    key={page.path}
                    className="quick-link-btn"
                    onClick={() => handleSelect(page, 'page')}
                  >
                    <page.icon size={16} />
                    <span>{page.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pages */}
          {results.pages.length > 0 && (
            <div className="search-result-group">
              <div className="search-result-group-header">
                <DashboardIcon size={14} />
                <span>Pages</span>
              </div>
              {results.pages.map((page) => {
                const idx = currentIndex++;
                return (
                  <div
                    key={page.path}
                    className={`search-result-item ${selectedIndex === idx ? 'selected' : ''}`}
                    onClick={() => handleSelect(page, 'page')}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="search-result-icon page">
                      <page.icon size={16} />
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-title">{page.name}</span>
                      <span className="search-result-subtitle">{page.path}</span>
                    </div>
                    <ArrowRightIcon className="search-result-arrow" size={16} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Products */}
          {results.products.length > 0 && (
            <div className="search-result-group">
              <div className="search-result-group-header">
                <BoxIcon size={14} />
                <span>Products</span>
              </div>
              {results.products.map((product) => {
                const idx = currentIndex++;
                return (
                  <div
                    key={product.id}
                    className={`search-result-item ${selectedIndex === idx ? 'selected' : ''}`}
                    onClick={() => handleSelect(product, 'product')}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="search-result-icon product">
                      <BoxIcon size={16} />
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-title">{product.name || product.product_name}</span>
                      <span className="search-result-subtitle">
                        {product.brand_name && `${product.brand_name} · `}
                        {product.sorting_code && `Code: ${product.sorting_code} · `}
                        Stock: {product.stock_quantity || 0}
                      </span>
                    </div>
                    <ArrowRightIcon className="search-result-arrow" size={16} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Orders */}
          {results.orders.length > 0 && (
            <div className="search-result-group">
              <div className="search-result-group-header">
                <CartIcon size={14} />
                <span>Orders</span>
              </div>
              {results.orders.map((order) => {
                const idx = currentIndex++;
                return (
                  <div
                    key={order.id}
                    className={`search-result-item ${selectedIndex === idx ? 'selected' : ''}`}
                    onClick={() => handleSelect(order, 'order')}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="search-result-icon order">
                      <CartIcon size={16} />
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-title">
                        Order #{order.id?.slice(-6)?.toUpperCase()}
                      </span>
                      <span className="search-result-subtitle">
                        {order.customer_name && `${order.customer_name} · `}
                        {order.status || 'Pending'}
                      </span>
                    </div>
                    <span className={`search-result-badge ${order.status?.toLowerCase() || 'pending'}`}>
                      {order.status || 'Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Customers */}
          {results.customers.length > 0 && (
            <div className="search-result-group">
              <div className="search-result-group-header">
                <UsersIcon size={14} />
                <span>Customers</span>
              </div>
              {results.customers.map((customer) => {
                const idx = currentIndex++;
                return (
                  <div
                    key={customer.id}
                    className={`search-result-item ${selectedIndex === idx ? 'selected' : ''}`}
                    onClick={() => handleSelect(customer, 'customer')}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="search-result-icon customer">
                      <UsersIcon size={16} />
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-title">{customer.name}</span>
                      <span className="search-result-subtitle">
                        {customer.email || customer.phone || 'No contact info'}
                      </span>
                    </div>
                    <ArrowRightIcon className="search-result-arrow" size={16} />
                  </div>
                );
              })}
            </div>
          )}

          {/* Vendors */}
          {results.vendors.length > 0 && (
            <div className="search-result-group">
              <div className="search-result-group-header">
                <ShippingIcon size={14} />
                <span>Vendors</span>
              </div>
              {results.vendors.map((vendor) => {
                const idx = currentIndex++;
                return (
                  <div
                    key={vendor.id}
                    className={`search-result-item ${selectedIndex === idx ? 'selected' : ''}`}
                    onClick={() => handleSelect(vendor, 'vendor')}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="search-result-icon vendor">
                      <ShippingIcon size={16} />
                    </div>
                    <div className="search-result-info">
                      <span className="search-result-title">{vendor.name}</span>
                      <span className="search-result-subtitle">
                        {vendor.company || vendor.email || 'No details'}
                      </span>
                    </div>
                    <ArrowRightIcon className="search-result-arrow" size={16} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasResults && (
          <div className="global-search-footer">
            <div className="search-footer-hint">
              <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
              <span><kbd>↵</kbd> to select</span>
              <span><kbd>esc</kbd> to close</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
