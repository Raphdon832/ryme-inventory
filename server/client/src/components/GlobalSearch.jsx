import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiX, FiPackage, FiShoppingCart, FiUsers, FiTruck, FiFileText, FiCalendar, FiCheckSquare, FiArrowRight } from 'react-icons/fi';
import api from '../api';
import { useSettings } from '../contexts/SettingsContext';
import './GlobalSearch.css';

const GlobalSearch = ({ isMobile = false, onClose }) => {
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Subscribe to data
  useEffect(() => {
    const unsubscribes = [];

    unsubscribes.push(api.subscribe('/products', (response) => {
      setProducts(response.data || []);
    }));

    unsubscribes.push(api.subscribe('/orders', (response) => {
      setOrders(response.data || []);
    }));

    unsubscribes.push(api.subscribe('/customers', (response) => {
      setCustomers(response.data || []);
    }));

    unsubscribes.push(api.subscribe('/vendors', (response) => {
      setVendors(response.data || []);
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, []);

  // Keyboard shortcut (Cmd+F or Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auto-focus when opened on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isMobile, isOpen]);

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];

    const q = query.toLowerCase().trim();
    const results = [];

    // Search products
    const matchedProducts = products.filter(p => 
      (p.name || p.product_name || '').toLowerCase().includes(q) ||
      (p.brand_name || '').toLowerCase().includes(q) ||
      (p.sorting_code || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ).slice(0, 5);

    matchedProducts.forEach(p => {
      results.push({
        id: p.id,
        type: 'product',
        icon: FiPackage,
        title: p.name || p.product_name,
        subtitle: `${p.brand_name || 'No brand'} · ${formatCurrency(p.sales_price)} · ${p.stock_quantity} units`,
        path: `/inventory/edit/${p.id}`,
        color: 'var(--primary-color)'
      });
    });

    // Search orders
    const matchedOrders = orders.filter(o =>
      (o.id || '').toLowerCase().includes(q) ||
      (o.customer_name || '').toLowerCase().includes(q) ||
      (o.status || '').toLowerCase().includes(q) ||
      (o.items || []).some(item => (item.name || '').toLowerCase().includes(q))
    ).slice(0, 5);

    matchedOrders.forEach(o => {
      results.push({
        id: o.id,
        type: 'order',
        icon: FiShoppingCart,
        title: `Order #${o.id.slice(-6).toUpperCase()}`,
        subtitle: `${o.customer_name || 'Walk-in'} · ${o.status} · ${formatCurrency(o.total)}`,
        path: `/orders/${o.id}`,
        color: '#10B981'
      });
    });

    // Search customers
    const matchedCustomers = customers.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q) ||
      (c.company || '').toLowerCase().includes(q)
    ).slice(0, 5);

    matchedCustomers.forEach(c => {
      results.push({
        id: c.id,
        type: 'customer',
        icon: FiUsers,
        title: c.name,
        subtitle: `${c.email || c.phone || 'No contact'} ${c.company ? `· ${c.company}` : ''}`,
        path: '/customers',
        color: '#8B5CF6'
      });
    });

    // Search vendors
    const matchedVendors = vendors.filter(v =>
      (v.name || '').toLowerCase().includes(q) ||
      (v.email || '').toLowerCase().includes(q) ||
      (v.phone || '').toLowerCase().includes(q) ||
      (v.company || '').toLowerCase().includes(q)
    ).slice(0, 5);

    matchedVendors.forEach(v => {
      results.push({
        id: v.id,
        type: 'vendor',
        icon: FiTruck,
        title: v.name || v.company,
        subtitle: `${v.email || v.phone || 'No contact'}`,
        path: '/vendors',
        color: '#F59E0B'
      });
    });

    // Quick navigation options
    const pages = [
      { name: 'Dashboard', path: '/', icon: FiFileText, keywords: ['home', 'dashboard', 'main'] },
      { name: 'Inventory', path: '/inventory', icon: FiPackage, keywords: ['products', 'stock', 'inventory'] },
      { name: 'Add Product', path: '/inventory/add', icon: FiPackage, keywords: ['new product', 'add product', 'create product'] },
      { name: 'Orders', path: '/orders', icon: FiShoppingCart, keywords: ['orders', 'sales'] },
      { name: 'New Order', path: '/orders/new', icon: FiShoppingCart, keywords: ['new order', 'create order', 'add order'] },
      { name: 'Customers', path: '/customers', icon: FiUsers, keywords: ['customers', 'clients'] },
      { name: 'Vendors', path: '/vendors', icon: FiTruck, keywords: ['vendors', 'suppliers'] },
      { name: 'Analytics', path: '/analytics', icon: FiFileText, keywords: ['analytics', 'reports', 'stats'] },
      { name: 'Calendar', path: '/calendar', icon: FiCalendar, keywords: ['calendar', 'schedule', 'events'] },
      { name: 'Tasks', path: '/tasks', icon: FiCheckSquare, keywords: ['tasks', 'todo', 'checklist'] },
      { name: 'Activity Log', path: '/activity-log', icon: FiFileText, keywords: ['activity', 'log', 'history'] },
      { name: 'Settings', path: '/settings', icon: FiFileText, keywords: ['settings', 'preferences', 'config'] },
    ];

    const matchedPages = pages.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.keywords.some(k => k.includes(q))
    );

    matchedPages.forEach(p => {
      results.push({
        id: `page-${p.path}`,
        type: 'page',
        icon: p.icon,
        title: `Go to ${p.name}`,
        subtitle: 'Quick navigation',
        path: p.path,
        color: 'var(--text-secondary)'
      });
    });

    return results;
  }, [query, products, orders, customers, vendors, formatCurrency]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [searchResults.length]);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && searchResults[activeIndex]) {
      e.preventDefault();
      handleSelect(searchResults[activeIndex]);
    }
  };

  // Handle selection
  const handleSelect = (result) => {
    navigate(result.path);
    handleClose();
  };

  const handleClose = () => {
    setIsOpen(false);
    setQuery('');
    setActiveIndex(0);
    if (onClose) onClose();
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Mobile search view
  if (isMobile) {
    return (
      <div className="global-search-mobile">
        <div className="global-search-mobile-header">
          <div className="global-search-mobile-input-wrapper">
            <FiSearch size={20} color="var(--text-tertiary)" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products, orders, customers..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            {query && (
              <button className="search-clear-btn" onClick={() => setQuery('')}>
                <FiX size={18} />
              </button>
            )}
          </div>
          <button className="search-cancel-btn" onClick={handleClose}>
            Cancel
          </button>
        </div>
        
        <div className="global-search-mobile-results">
          {query.trim() === '' ? (
            <div className="search-empty-state">
              <FiSearch size={40} style={{ opacity: 0.3 }} />
              <p>Search for products, orders, customers, and more</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="search-empty-state">
              <p>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="search-results-list">
              {searchResults.map((result, index) => (
                <button
                  key={result.id}
                  className={`search-result-item ${index === activeIndex ? 'active' : ''}`}
                  onClick={() => handleSelect(result)}
                >
                  <div className="search-result-icon" style={{ color: result.color }}>
                    <result.icon size={20} />
                  </div>
                  <div className="search-result-content">
                    <div className="search-result-title">{result.title}</div>
                    <div className="search-result-subtitle">{result.subtitle}</div>
                  </div>
                  <FiArrowRight size={16} className="search-result-arrow" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop search
  return (
    <>
      <div className="search-bar search-bar--compact" onClick={handleOpen}>
        <FiSearch color="var(--text-tertiary)" size={18} />
        <input 
          type="text" 
          placeholder="Search..." 
          readOnly 
          style={{ cursor: 'pointer' }}
        />
        <span className="search-shortcut">⌘ F</span>
      </div>

      {/* Search Modal */}
      {isOpen && (
        <>
          <div className="global-search-overlay" onClick={handleClose} />
          <div className="global-search-modal">
            <div className="global-search-input-wrapper">
              <FiSearch size={20} color="var(--text-tertiary)" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search products, orders, customers, pages..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              {query && (
                <button className="search-clear-btn" onClick={() => setQuery('')}>
                  <FiX size={18} />
                </button>
              )}
              <span className="search-shortcut">ESC</span>
            </div>

            <div className="global-search-results" ref={resultsRef}>
              {query.trim() === '' ? (
                <div className="search-empty-state">
                  <p>Start typing to search...</p>
                  <div className="search-hints">
                    <span><FiPackage size={14} /> Products</span>
                    <span><FiShoppingCart size={14} /> Orders</span>
                    <span><FiUsers size={14} /> Customers</span>
                    <span><FiTruck size={14} /> Vendors</span>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="search-empty-state">
                  <p>No results found for "{query}"</p>
                </div>
              ) : (
                <div className="search-results-list">
                  {searchResults.map((result, index) => (
                    <button
                      key={result.id}
                      className={`search-result-item ${index === activeIndex ? 'active' : ''}`}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIndex(index)}
                    >
                      <div className="search-result-icon" style={{ color: result.color }}>
                        <result.icon size={18} />
                      </div>
                      <div className="search-result-content">
                        <div className="search-result-title">{result.title}</div>
                        <div className="search-result-subtitle">{result.subtitle}</div>
                      </div>
                      <div className="search-result-type">{result.type}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="global-search-footer">
              <span><kbd>↑</kbd> <kbd>↓</kbd> to navigate</span>
              <span><kbd>↵</kbd> to select</span>
              <span><kbd>esc</kbd> to close</span>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default GlobalSearch;
