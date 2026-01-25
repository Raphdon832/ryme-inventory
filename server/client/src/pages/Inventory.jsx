import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { SkeletonTable } from '../components/Skeleton.jsx';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiTag, FiTrendingUp, FiX, FiCheck, FiPercent, FiDollarSign, FiFilter, FiChevronDown, FiChevronUp, FiChevronRight, FiDownload, FiFileText } from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';
import useScrollLock from '../hooks/useScrollLock';
import soundManager from '../utils/soundManager';
import { useToast } from '../components/Toast';
import { exportInventory } from '../utils/exportUtils';

const Inventory = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { formatCurrency, settings, currencySymbol } = useSettings();
  const [products, setProducts] = useState([]);
  const [categoriesList, setCategoriesList] = useState([]); // Real category list from DB
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddingNewBulkCategory, setIsAddingNewBulkCategory] = useState(false);
  const [newBulkCategoryName, setNewBulkCategoryName] = useState('');
  const [bulkUpdateForm, setBulkUpdateForm] = useState({
    markupType: 'percentage', // percentage, amount, or set_price
    markupValue: '',
    costType: 'percentage', // percentage or fixed
    costAdjustment: '',
    category: '', // '' means unchanged
    stockValue: '',
    stockMode: 'add' // add, subtract, set
  });

  // Filter/Sort state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [sortBy, setSortBy] = useState('name_asc'); // default sort
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedBrands, setExpandedBrands] = useState({}); // for grouped view
  const filterDropdownRef = useRef(null);

  // Get unique categories for filtering
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    return ['all', ...cats];
  }, [products]);

  // Sort options
  const sortOptions = [
    { value: 'grouped', label: 'Grouped by Brand' },
    { value: 'name_asc', label: 'Product Name (A-Z)' },
    { value: 'name_desc', label: 'Product Name (Z-A)' },
    { value: 'category_asc', label: 'Category (A-Z)' },
    { value: 'category_desc', label: 'Category (Z-A)' },
    { value: 'brand_asc', label: 'Brand Name (A-Z)' },
    { value: 'brand_desc', label: 'Brand Name (Z-A)' },
    { value: 'price_asc', label: 'Price (Low to High)' },
    { value: 'price_desc', label: 'Price (High to Low)' },
    { value: 'stock_asc', label: 'Units Left (Low to High)' },
    { value: 'stock_desc', label: 'Units Left (High to Low)' },
    { value: 'cost_asc', label: 'Cost (Low to High)' },
    { value: 'cost_desc', label: 'Cost (High to Low)' },
    { value: 'date_asc', label: 'Date Added (Oldest First)' },
    { value: 'date_desc', label: 'Date Added (Newest First)' },
    { value: 'volume_asc', label: 'Volume (Low to High)' },
    { value: 'volume_desc', label: 'Volume (High to Low)' },
  ];

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock scroll when modals are open
  useScrollLock(showDeleteConfirm || showBulkUpdateModal);
  
  // Track previous low stock count for alerting
  const prevLowStockCount = useRef(null);
  const hasAlertedOnLoad = useRef(false);

  useEffect(() => {
    const unsubscribe = api.subscribe('/products', (response) => {
      setProducts(response.data);
      setLoadingProducts(false);
    });

    const unsubCats = api.subscribe('/categories', (response) => {
      setCategoriesList(response.data);
    });

    return () => {
      unsubscribe();
      unsubCats();
    };
  }, []);

  // Play low stock alert when new low stock items are detected
  useEffect(() => {
    if (loadingProducts || products.length === 0) return;
    
    const lowStockThreshold = Number(settings.inventory?.lowStockThreshold || 5);
    const currentLowStockCount = products.filter(p => p.stock_quantity < lowStockThreshold).length;
    
    // Alert on initial load if there are low stock items (only once)
    if (!hasAlertedOnLoad.current && currentLowStockCount > 0) {
      soundManager.playLowStockAlert();
      hasAlertedOnLoad.current = true;
    }
    // Alert when low stock count increases (new items fell below threshold)
    else if (prevLowStockCount.current !== null && currentLowStockCount > prevLowStockCount.current) {
      soundManager.playLowStockAlert();
    }
    
    prevLowStockCount.current = currentLowStockCount;
  }, [products, loadingProducts, settings.inventory?.lowStockThreshold]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(products.length / 10));
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
    if (products.length === 0 && currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [products.length, currentPage]);

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      const product = products.find(p => p.id === productId);
      setDeletingId(productId);
      try {
        await api.delete(`/products/${productId}`);
        toast.success(`Product deleted successfully`);
        soundManager.playSuccess();
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Failed to delete product. Please try again.');
        soundManager.playError();
      } finally {
        setDeletingId(null);
      }
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const count = selectedProducts.length;
    try {
      for (const productId of selectedProducts) {
        await api.delete(`/products/${productId}`);
      }
      toast.success(`${count} product${count > 1 ? 's' : ''} deleted successfully`);
      soundManager.playSuccess();
      setSelectedProducts([]);
      setSelectionMode(false);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting products:', error);
      toast.error('Failed to delete some products. Please try again.');
      soundManager.playError();
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleAddNewBulkCategory = async () => {
    const name = newBulkCategoryName.trim();
    if (!name) return;

    try {
      const response = await api.post('/categories', { name });
      const newCat = response.data.data;
      
      setBulkUpdateForm(prev => ({ ...prev, category: newCat.name }));
      setIsAddingNewBulkCategory(false);
      setNewBulkCategoryName('');
      toast.success(`Category "${name}" created`);
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    }
  };

  const handleBulkUpdate = async () => {
    setBulkUpdating(true);
    try {
      const updates = selectedProducts.map(async (productId) => {
        const product = products.find(p => p.id === productId);
        if (!product) return;

        // 1. Calculate new Cost
        let newCost = Number(product.cost_of_production);
        if (bulkUpdateForm.costAdjustment) {
          if (bulkUpdateForm.costType === 'percentage') {
            newCost = newCost * (1 + Number(bulkUpdateForm.costAdjustment) / 100);
          } else if (bulkUpdateForm.costType === 'fixed') {
            newCost = newCost + Number(bulkUpdateForm.costAdjustment);
          }
        }

        // 2. Calculate Markup/Pricing
        let newMarkupPercentage = product.markup_percentage;
        let newMarkupAmount = product.markup_amount;

        if (bulkUpdateForm.markupValue) {
          if (bulkUpdateForm.markupType === 'percentage') {
            newMarkupPercentage = Number(bulkUpdateForm.markupValue);
            newMarkupAmount = ''; // Clear amount to ensure percentage is used
          } else if (bulkUpdateForm.markupType === 'amount') {
            newMarkupAmount = Number(bulkUpdateForm.markupValue);
            newMarkupPercentage = ''; // Clear percentage
          } else if (bulkUpdateForm.markupType === 'set_price') {
            // Target sales price provided, calculate required markup amount
            newMarkupAmount = Number(bulkUpdateForm.markupValue) - newCost;
            newMarkupPercentage = ''; // Clear percentage
          }
        }

        // 3. New Stock Quantity
        let newStock = Number(product.stock_quantity || 0);
        if (bulkUpdateForm.stockValue) {
          const val = Number(bulkUpdateForm.stockValue);
          if (bulkUpdateForm.stockMode === 'add') newStock += val;
          else if (bulkUpdateForm.stockMode === 'subtract') newStock -= val;
          else if (bulkUpdateForm.stockMode === 'set') newStock = val;
        }

        const payload = {
          ...product,
          cost_of_production: newCost,
          markup_percentage: newMarkupPercentage,
          markup_amount: newMarkupAmount,
          category: bulkUpdateForm.category || product.category,
          stock_quantity: Math.max(0, newStock)
        };

        return api.put(`/products/${productId}`, payload);
      });

      await Promise.all(updates);
      
      toast.success(`${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''} updated successfully`);
      soundManager.playSuccess();
      setSelectedProducts([]);
      setSelectionMode(false);
      setShowBulkUpdateModal(false);
      setIsAddingNewBulkCategory(false);
      setNewBulkCategoryName('');
      // Reset form
      setBulkUpdateForm({
        markupType: 'percentage',
        markupValue: '',
        costType: 'percentage',
        costAdjustment: '',
        category: '',
        stockValue: '',
        stockMode: 'add'
      });
    } catch (error) {
      console.error('Error bulk updating products:', error);
      toast.error('Failed to update some products. Please try again.');
      soundManager.playError();
    } finally {
      setBulkUpdating(false);
    }
  };

  const cancelSelectionMode = () => {
    setSelectionMode(false);
    setSelectedProducts([]);
  };

  // Helper function to extract numeric volume from volume_size string
  const extractVolume = (volumeSize) => {
    if (!volumeSize) return 0;
    const match = volumeSize.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  // Sorted products
  const sortedProducts = useMemo(() => {
    let filtered = [...products];
    
    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(p => p.category === filterCategory);
    }
    
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.name || a.product_name || '').localeCompare(b.name || b.product_name || '');
        case 'name_desc':
          return (b.name || b.product_name || '').localeCompare(a.name || a.product_name || '');
        case 'category_asc':
          return (a.category || '').localeCompare(b.category || '');
        case 'category_desc':
          return (b.category || '').localeCompare(a.category || '');
        case 'brand_asc':
          return (a.brand_name || '').localeCompare(b.brand_name || '');
        case 'brand_desc':
          return (b.brand_name || '').localeCompare(a.brand_name || '');
        case 'price_asc':
          return (a.sales_price || 0) - (b.sales_price || 0);
        case 'price_desc':
          return (b.sales_price || 0) - (a.sales_price || 0);
        case 'stock_asc':
          return (a.stock_quantity || 0) - (b.stock_quantity || 0);
        case 'stock_desc':
          return (b.stock_quantity || 0) - (a.stock_quantity || 0);
        case 'cost_asc':
          return (a.cost_of_production || 0) - (b.cost_of_production || 0);
        case 'cost_desc':
          return (b.cost_of_production || 0) - (a.cost_of_production || 0);
        case 'date_asc':
          return new Date(a.created_at || a.createdAt || 0) - new Date(b.created_at || b.createdAt || 0);
        case 'date_desc':
          return new Date(b.created_at || b.createdAt || 0) - new Date(a.created_at || a.createdAt || 0);
        case 'volume_asc':
          return extractVolume(a.volume_size) - extractVolume(b.volume_size);
        case 'volume_desc':
          return extractVolume(b.volume_size) - extractVolume(a.volume_size);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [products, sortBy, filterCategory]);

  // Group products by brand for grouped view
  const groupedByBrand = useMemo(() => {
    if (sortBy !== 'grouped') return {};
    
    const groups = {};
    const filtered = filterCategory === 'all' 
      ? products 
      : products.filter(p => p.category === filterCategory);
      
    filtered.forEach(product => {
      const brandName = product.brand_name || 'No Brand';
      if (!groups[brandName]) {
        groups[brandName] = [];
      }
      groups[brandName].push(product);
    });
    
    // Sort brand names alphabetically
    const sortedGroups = {};
    Object.keys(groups).sort((a, b) => a.localeCompare(b)).forEach(key => {
      // Sort products within each brand by name
      sortedGroups[key] = groups[key].sort((a, b) => 
        (a.name || a.product_name || '').localeCompare(b.name || b.product_name || '')
      );
    });
    
    return sortedGroups;
  }, [products, sortBy, filterCategory]);

  // Toggle brand accordion
  const toggleBrandAccordion = (brandName) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brandName]: !prev[brandName]
    }));
  };

  // Expand/collapse all brands
  const expandAllBrands = () => {
    const allExpanded = {};
    Object.keys(groupedByBrand).forEach(brand => {
      allExpanded[brand] = true;
    });
    setExpandedBrands(allExpanded);
  };

  const collapseAllBrands = () => {
    setExpandedBrands({});
  };

  // Stats calculations
  const totalProducts = products.length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.cost_of_production * p.stock_quantity), 0);
  const totalPotentialRevenue = products.reduce((acc, p) => acc + (p.sales_price * p.stock_quantity), 0);
  const lowStockThreshold = Number(settings.inventory.lowStockThreshold || 5);
  const lowStockCount = products.filter(p => p.stock_quantity < lowStockThreshold).length;
  const warningThreshold = Math.max(lowStockThreshold * 2, lowStockThreshold + 1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, sortedProducts.length);
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + pageSize);
  const showingStart = sortedProducts.length === 0 ? 0 : startIndex + 1;
  const showingEnd = sortedProducts.length === 0 ? 0 : endIndex;

  return (
    <div>
      <div className="page-title page-title--with-actions">
        <div>
          <h1>Inventory</h1>
          <p>Manage your products, costs, and pricing</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
            <button 
              className="secondary" 
              onClick={() => exportInventory(sortedProducts, 'csv')}
              title="Export as CSV"
              style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', borderRadius: '10px' }}
            >
              <FiFileText size={16} /> <span className="hide-mobile">CSV</span>
            </button>
            <button 
              className="secondary" 
              onClick={() => exportInventory(sortedProducts, 'pdf')}
              title="Export as PDF"
              style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', borderRadius: '10px' }}
            >
              <FiDownload size={16} /> <span className="hide-mobile">PDF</span>
            </button>
          </div>
          <button className="add-btn-bordered" onClick={() => navigate('/inventory/add')} style={{ height: '42px' }}>
            <FiPlus size={18} /> Add Product
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-widget border-blue">
          <div className="stat-header">
            <div className="stat-icon blue">
              <FiPackage />
            </div>
          </div>
          <div className="stat-label">Total Products</div>
          <div className="stat-value">{new Intl.NumberFormat('en-US').format(totalProducts)}</div>
        </div>

        <div className="stat-widget border-purple">
          <div className="stat-header">
            <div className="stat-icon purple">
              <FiTag />
            </div>
          </div>
          <div className="stat-label">Stock Value (Cost)</div>
          <div className="stat-value">{formatCurrency(totalStockValue)}</div>
        </div>

        <div className="stat-widget border-green">
          <div className="stat-header">
            <div className="stat-icon green">
              <FiTrendingUp />
            </div>
          </div>
          <div className="stat-label">Potential Revenue</div>
          <div className="stat-value">{formatCurrency(totalPotentialRevenue)}</div>
        </div>

        <div className={`stat-widget ${lowStockCount > 0 ? 'border-red' : 'border-green'}`}>
          <div className="stat-header">
            <div className={`stat-icon ${lowStockCount > 0 ? 'red' : 'green'}`}>
              <FiPackage />
            </div>
          </div>
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value">{new Intl.NumberFormat('en-US').format(lowStockCount)}</div>
        </div>
      </div>

      {/* Product List */}
      <div className="card">
        <div className="flex justify-between" style={{ marginBottom: '20px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Product Catalog</h3>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {products.length} items · Showing {showingStart}-{showingEnd}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Filter/Sort Button */}
            <div style={{ position: 'relative' }} ref={filterDropdownRef}>
              <button 
                onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                title="Sort products"
                style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  padding: 0, 
                  background: showFilterDropdown || sortBy !== 'name_asc' ? 'rgba(79, 106, 245, 0.1)' : 'var(--bg-surface)', 
                  border: '1px solid var(--border-color)', 
                  color: showFilterDropdown || sortBy !== 'name_asc' ? 'var(--primary-color)' : 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <FiFilter size={18} />
              </button>
              
              {/* Filter Dropdown */}
              {showFilterDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '48px',
                  right: 0,
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                  zIndex: 100,
                  minWidth: '220px',
                  maxWidth: 'calc(100vw - 32px)',
                  padding: '8px 0',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}>
                  <div style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Sort By
                  </div>
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setShowFilterDropdown(false);
                        setCurrentPage(1); // Reset to first page on sort change
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '10px 16px',
                        background: sortBy === option.value ? 'rgba(79, 106, 245, 0.1)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: sortBy === option.value ? 'var(--primary-color)' : 'var(--text-primary)',
                        fontSize: '14px',
                        textAlign: 'left',
                        fontWeight: sortBy === option.value ? 600 : 400
                      }}
                    >
                      <span>{option.label}</span>
                      {sortBy === option.value && <FiCheck size={16} />}
                    </button>
                  ))}

                  {categories.length > 1 && (
                    <>
                      <div style={{ padding: '16px 16px 8px', fontSize: '12px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', borderTop: '1px solid var(--border-color)', marginTop: '8px' }}>
                        Filter Category
                      </div>
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => {
                            setFilterCategory(cat);
                            setShowFilterDropdown(false);
                            setCurrentPage(1);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            padding: '10px 16px',
                            background: filterCategory === cat ? 'rgba(79, 106, 245, 0.1)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: filterCategory === cat ? 'var(--primary-color)' : 'var(--text-primary)',
                            fontSize: '14px',
                            textAlign: 'left',
                            fontWeight: filterCategory === cat ? 600 : 400
                          }}
                        >
                          <span style={{ textTransform: 'capitalize' }}>{cat === 'all' ? 'All Categories' : cat}</span>
                          {filterCategory === cat && <FiCheck size={16} />}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {selectionMode ? (
              <>
                <button 
                  className="icon-btn-circle"
                  onClick={cancelSelectionMode}
                  title="Cancel"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <FiX size={18} />
                </button>
                <button 
                  className="icon-btn-circle"
                  onClick={() => setShowBulkUpdateModal(true)}
                  disabled={selectedProducts.length === 0}
                  title={`Update ${selectedProducts.length} selected`}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, background: selectedProducts.length > 0 ? 'var(--info-bg)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--primary-color)' }}
                >
                  <FiTag size={18} />
                </button>
                <button 
                  className="icon-btn-circle danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedProducts.length === 0}
                  title={`Delete ${selectedProducts.length} selected`}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, background: selectedProducts.length > 0 ? 'var(--danger-bg)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--danger-text)', position: 'relative' }}
                >
                  <FiTrash2 size={18} />
                  {selectedProducts.length > 0 && (
                    <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: 'var(--danger-text)', color: 'white', fontSize: '10px', fontWeight: 700, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{selectedProducts.length}</span>
                  )}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setSelectionMode(true)}
                title="Select products for bulk actions"
                style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <FiCheck size={18} />
              </button>
            )}
          </div>
        </div>
        
        {/* Grouped View by Brand */}
        {sortBy === 'grouped' ? (
          <div>
            {/* Expand/Collapse All buttons */}
            {Object.keys(groupedByBrand).length > 0 && (
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  className="secondary"
                  onClick={expandAllBrands}
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '999px' }}
                >
                  Expand All
                </button>
                <button
                  className="secondary"
                  onClick={collapseAllBrands}
                  style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '999px' }}
                >
                  Collapse All
                </button>
              </div>
            )}
            
            {loadingProducts ? (
              <SkeletonTable rows={8} cols={6} />
            ) : products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                <FiPackage size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No products yet</p>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Add your first product to get started</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(groupedByBrand).map(([brandName, brandProducts]) => (
                  <div 
                    key={brandName} 
                    style={{ 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '12px', 
                      overflow: 'hidden',
                      background: 'var(--bg-surface)'
                    }}
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => toggleBrandAccordion(brandName)}
                      style={{
                        width: '100%',
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: expandedBrands[brandName] ? 'rgba(79, 106, 245, 0.05)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          transform: expandedBrands[brandName] ? 'rotate(90deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          color: 'var(--text-secondary)'
                        }}>
                          <FiChevronRight size={18} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px' }}>
                            {brandName}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                            {brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Total Stock Value</div>
                          <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '14px' }}>
                            {formatCurrency(brandProducts.reduce((sum, p) => sum + (p.sales_price * p.stock_quantity), 0))}
                          </div>
                        </div>
                      </div>
                    </button>
                    
                    {/* Accordion Content */}
                    {expandedBrands[brandName] && (
                      <div className="table-container" style={{ borderTop: '1px solid var(--border-color)' }}>
                        <table>
                          <thead>
                            <tr>
                              {selectionMode && <th style={{ width: '40px' }}></th>}
                              <th>Code</th>
                              <th>Product</th>
                              <th>Category</th>
                              <th>Cost of Production</th>
                              <th>Markup</th>
                              <th>Sales Price</th>
                              <th>Profit/Unit</th>
                              <th>Stock</th>
                              {!selectionMode && <th>Actions</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {brandProducts.map(product => (
                              <tr 
                                key={product.id}
                                onClick={selectionMode ? () => toggleProductSelection(product.id) : undefined}
                                style={{ cursor: selectionMode ? 'pointer' : 'default', background: selectedProducts.includes(product.id) ? 'var(--info-bg)' : undefined }}
                              >
                                {selectionMode && (
                                  <td>
                                    <div style={{ 
                                      width: '20px', 
                                      height: '20px', 
                                      borderRadius: '50%', 
                                      border: selectedProducts.includes(product.id) ? 'none' : '2px solid var(--border-color)',
                                      background: selectedProducts.includes(product.id) ? 'var(--primary-color)' : 'transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: 'white'
                                    }}>
                                      {selectedProducts.includes(product.id) && <FiCheck size={12} />}
                                    </div>
                                  </td>
                                )}
                                <td>
                                  {product.sorting_code ? (
                                    <span style={{ 
                                      fontFamily: "'JetBrains Mono', monospace", 
                                      fontWeight: 600, 
                                      fontSize: '12px',
                                      letterSpacing: '0.5px',
                                      background: 'var(--info-bg)',
                                      color: 'var(--primary-color)',
                                      padding: '4px 8px',
                                      borderRadius: '4px'
                                    }}>
                                      {product.sorting_code}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                                  )}
                                </td>
                                <td>
                                  <div>
                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</div>
                                    {product.description && (
                                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{product.description}</div>
                                    )}
                                  </div>
                                </td>
                                <td>
                                  {product.category ? (
                                    <span style={{ 
                                      fontSize: '12px', 
                                      padding: '2px 8px', 
                                      borderRadius: '12px', 
                                      background: 'var(--bg-card-hover)', 
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-color)',
                                      fontWeight: 500
                                    }}>
                                      {product.category}
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                                  )}
                                </td>
                                <td style={{ fontWeight: 500 }}>{formatCurrency(product.cost_of_production)}</td>
                                <td>
                                  <span className="badge badge-info">
                                    {product.markup_amount && Number(product.markup_amount) > 0
                                      ? formatCurrency(Number(product.markup_amount))
                                      : `${product.markup_percentage}%`}
                                  </span>
                                </td>
                                <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{formatCurrency(product.sales_price)}</td>
                                <td style={{ fontWeight: 600, color: 'var(--success-text)' }}>{formatCurrency(product.profit, { showSign: true })}</td>
                                <td>
                                  <span className={`badge ${product.stock_quantity < lowStockThreshold ? 'badge-danger' : product.stock_quantity < warningThreshold ? 'badge-warning' : 'badge-success'}`}>
                                    {new Intl.NumberFormat('en-US').format(product.stock_quantity)} units
                                  </span>
                                </td>
                                {!selectionMode && (
                                  <td>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                      <button 
                                        className="secondary" 
                                        style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%' }}
                                        onClick={() => navigate(`/inventory/edit/${product.id}`)}
                                      >
                                        <FiEdit2 size={16} />
                                      </button>
                                      <button 
                                        className="secondary" 
                                        style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%', color: 'var(--danger-text)' }}
                                        onClick={() => handleDelete(product.id)}
                                      >
                                        <FiTrash2 size={16} />
                                      </button>
                                    </div>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Normal Table View */
          <>
            <div className="table-container">
              {loadingProducts ? (
                <SkeletonTable rows={8} cols={6} />
              ) : (
                <table>
                  <thead>
                    <tr>
                      {selectionMode && <th style={{ width: '40px' }}></th>}
                      <th>Code</th>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Cost of Production</th>
                      <th>Markup</th>
                      <th>Sales Price</th>
                      <th>Profit/Unit</th>
                      <th>Stock</th>
                      {!selectionMode && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProducts.map(product => (
                      <tr 
                        key={product.id}
                        onClick={selectionMode ? () => toggleProductSelection(product.id) : undefined}
                        style={{ cursor: selectionMode ? 'pointer' : 'default', background: selectedProducts.includes(product.id) ? 'var(--info-bg)' : undefined }}
                      >
                        {selectionMode && (
                          <td>
                            <div style={{ 
                              width: '20px', 
                              height: '20px', 
                              borderRadius: '50%', 
                              border: selectedProducts.includes(product.id) ? 'none' : '2px solid var(--border-color)',
                              background: selectedProducts.includes(product.id) ? 'var(--primary-color)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white'
                            }}>
                              {selectedProducts.includes(product.id) && <FiCheck size={12} />}
                            </div>
                          </td>
                        )}
                      <td>
                        {product.sorting_code ? (
                          <span style={{ 
                            fontFamily: "'JetBrains Mono', monospace", 
                            fontWeight: 600, 
                            fontSize: '12px',
                            letterSpacing: '0.5px',
                            background: 'var(--info-bg)',
                            color: 'var(--primary-color)',
                            padding: '4px 8px',
                            borderRadius: '4px'
                          }}>
                            {product.sorting_code}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.name}</div>
                          {product.description && (
                            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{product.description}</div>
                          )}
                        </div>
                      </td>
                      <td>
                        {product.category ? (
                          <span style={{ 
                            fontSize: '12px', 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: 'var(--bg-card-hover)', 
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)',
                            fontWeight: 500
                          }}>
                            {product.category}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ fontWeight: 500 }}>{formatCurrency(product.cost_of_production)}</td>
                      <td>
                        <span className="badge badge-info">
                          {product.markup_amount && Number(product.markup_amount) > 0
                            ? formatCurrency(Number(product.markup_amount))
                            : `${product.markup_percentage}%`}
                        </span>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{formatCurrency(product.sales_price)}</td>
                      <td style={{ fontWeight: 600, color: 'var(--success-text)' }}>{formatCurrency(product.profit, { showSign: true })}</td>
                      <td>
                        <span className={`badge ${product.stock_quantity < lowStockThreshold ? 'badge-danger' : product.stock_quantity < warningThreshold ? 'badge-warning' : 'badge-success'}`}>
                          {new Intl.NumberFormat('en-US').format(product.stock_quantity)} units
                        </span>
                      </td>
                      {!selectionMode && (
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="secondary" 
                              style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%' }}
                              onClick={() => navigate(`/inventory/edit/${product.id}`)}
                            >
                              <FiEdit2 size={16} />
                            </button>
                            <button 
                              className="secondary" 
                              style={{ padding: '8px', width: '36px', height: '36px', borderRadius: '50%', color: 'var(--danger-text)' }}
                              onClick={() => handleDelete(product.id)}
                            >
                              <FiTrash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {products.length === 0 && (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                        <FiPackage size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <p style={{ margin: 0, fontWeight: 500 }}>No products yet</p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Add your first product to get started</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {products.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
                Page {currentPage} of {totalPages}
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="secondary"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage <= 1}
                  style={{ padding: '8px 14px', borderRadius: '999px' }}
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage >= totalPages}
                  style={{ padding: '8px 14px', borderRadius: '999px' }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
        )}
    </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box', transform: 'none' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', maxWidth: '400px', width: '90%', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#EF4444' }}>
              <FiTrash2 size={24} />
            </div>
            <h3 style={{ margin: '0 0 8px' }}>Delete {selectedProducts.length} Product{selectedProducts.length > 1 ? 's' : ''}?</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              This action cannot be undone. The selected products will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                className="secondary" 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '10px 24px', borderRadius: '999px' }}
              >
                Cancel
              </button>
              <button 
                onClick={handleBulkDelete}
                style={{ padding: '10px 24px', borderRadius: '999px', background: '#EF4444' }}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? (
                  <><span className="btn-spinner"></span> Deleting...</>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdateModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100dvh', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px', boxSizing: 'border-box', transform: 'none' }}>
          <div style={{ background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px', maxWidth: '450px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 8px' }}>Bulk Update Products</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              Updating {selectedProducts.length} product(s). Values left empty will remain unchanged.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Pricing Section Title */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Pricing & Costs</div>

              {/* Cost Update */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Cost of Production Adjustment</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type="number" 
                      placeholder="Value"
                      value={bulkUpdateForm.costAdjustment}
                      onChange={(e) => setBulkUpdateForm(prev => ({ ...prev, costAdjustment: e.target.value }))}
                      style={{ paddingLeft: bulkUpdateForm.costType === 'fixed' ? '24px' : '12px' }}
                    />
                    {bulkUpdateForm.costType === 'fixed' && <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '14px' }}>{currencySymbol}</span>}
                  </div>
                  <select 
                    style={{ width: '120px', padding: '8px' }}
                    value={bulkUpdateForm.costType}
                    onChange={(e) => setBulkUpdateForm(prev => ({ ...prev, costType: e.target.value }))}
                  >
                    <option value="percentage">% Change</option>
                    <option value="fixed">Fixed Add/Sub</option>
                  </select>
                </div>
              </div>

              {/* Pricing / Markup Update */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Sales Price or Markup Change</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input 
                      type="number" 
                      placeholder="Value"
                      value={bulkUpdateForm.markupValue}
                      onChange={(e) => setBulkUpdateForm(prev => ({ ...prev, markupValue: e.target.value }))}
                      style={{ paddingLeft: (bulkUpdateForm.markupType === 'amount' || bulkUpdateForm.markupType === 'set_price') ? '24px' : '12px' }}
                    />
                    {(bulkUpdateForm.markupType === 'amount' || bulkUpdateForm.markupType === 'set_price') && <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '14px' }}>{currencySymbol}</span>}
                  </div>
                  <select 
                    style={{ width: '130px', padding: '8px' }}
                    value={bulkUpdateForm.markupType}
                    onChange={(e) => setBulkUpdateForm(prev => ({ ...prev, markupType: e.target.value }))}
                  >
                    <option value="percentage">% Markup</option>
                    <option value="amount">Markup Amt</option>
                    <option value="set_price">Fix Sales Price</option>
                  </select>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>Set Markup % or Amount, OR define a target Sales Price.</p>
              </div>

              {/* Product Info Section Title */}
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary-color)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginTop: '10px' }}>Product Details & Stock</div>

              {/* Category Update */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Change Category</label>
                {!isAddingNewBulkCategory ? (
                  <select 
                    value={bulkUpdateForm.category}
                    onChange={(e) => {
                      if (e.target.value === 'new') {
                        setIsAddingNewBulkCategory(true);
                      } else {
                        setBulkUpdateForm(prev => ({ ...prev, category: e.target.value }));
                      }
                    }}
                    style={{ width: '100%' }}
                  >
                    <option value="">(No Change)</option>
                    {categoriesList.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                    <option value="new" style={{ fontWeight: 'bold', color: 'var(--primary-color)' }}>+ Add New Category...</option>
                  </select>
                ) : (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="New category name" 
                      value={newBulkCategoryName}
                      onChange={(e) => setNewBulkCategoryName(e.target.value)}
                      style={{ flex: 1, height: '42px' }}
                      autoFocus
                    />
                    <button 
                      type="button" 
                      onClick={handleAddNewBulkCategory}
                      style={{ padding: '0 12px', height: '42px', borderRadius: '8px', background: 'var(--primary-color)', color: 'white', border: 'none' }}
                    >
                      Add
                    </button>
                    <button 
                      type="button" 
                      className="secondary" 
                      onClick={() => {
                        setIsAddingNewBulkCategory(false);
                        setNewBulkCategoryName('');
                      }}
                      style={{ padding: '0 12px', height: '42px', borderRadius: '8px' }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              {/* Stock Update */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Stock Units Adjustment</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="number" 
                    placeholder="Units"
                    value={bulkUpdateForm.stockValue}
                    onChange={(e) => setBulkUpdateForm(prev => ({ ...prev, stockValue: e.target.value }))}
                    style={{ flex: 1 }}
                  />
                  <select 
                    style={{ width: '110px', padding: '8px' }}
                    value={bulkUpdateForm.stockMode}
                    onChange={(e) => setBulkUpdateForm(prev => ({ ...prev, stockMode: e.target.value }))}
                  >
                    <option value="add">Add (+)</option>
                    <option value="subtract">Sub (-)</option>
                    <option value="set">Set Fixed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '16px', padding: '16px 0 0', borderTop: '1px solid var(--border-color)' }}>
                <button 
                  className="secondary"
                  onClick={() => {
                    setShowBulkUpdateModal(false);
                    setIsAddingNewBulkCategory(false);
                    setNewBulkCategoryName('');
                  }}
                  style={{ flex: 1, borderRadius: '12px' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkUpdate}
                  style={{ flex: 1, borderRadius: '12px' }}
                  disabled={(!bulkUpdateForm.costAdjustment && !bulkUpdateForm.markupValue && !bulkUpdateForm.category && !bulkUpdateForm.stockValue) || bulkUpdating}
                >
                  {bulkUpdating ? (
                    <><span className="btn-spinner"></span> Applying...</>
                  ) : (
                    'Update All'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
