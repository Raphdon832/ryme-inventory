import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { SkeletonTable } from '../components/Skeleton.jsx';
import { FiPlus, FiEdit2, FiTrash2, FiPackage, FiTag, FiTrendingUp, FiX, FiCheck } from 'react-icons/fi';
import { useSettings } from '../contexts/SettingsContext';

const Inventory = () => {
  const navigate = useNavigate();
  const { settings, formatCurrency } = useSettings();
  const [products, setProducts] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products');
      setProducts(response.data.data);
      setLoadingProducts(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setLoadingProducts(false);
    }
  };

  const handleDelete = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${productId}`);
        fetchProducts();
      } catch (error) {
        console.error('Error deleting product:', error);
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
    try {
      for (const productId of selectedProducts) {
        await api.delete(`/products/${productId}`);
      }
      setSelectedProducts([]);
      setDeleteMode(false);
      setShowDeleteConfirm(false);
      fetchProducts();
    } catch (error) {
      console.error('Error deleting products:', error);
    }
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedProducts([]);
  };

  // Stats calculations
  const totalProducts = products.length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.cost_of_production * p.stock_quantity), 0);
  const totalPotentialRevenue = products.reduce((acc, p) => acc + (p.sales_price * p.stock_quantity), 0);
  const lowStockThreshold = Number(settings.inventory.lowStockThreshold || 5);
  const lowStockCount = products.filter(p => p.stock_quantity < lowStockThreshold).length;
  const warningThreshold = Math.max(lowStockThreshold * 2, lowStockThreshold + 1);

  return (
    <div>
      <div className="page-title page-title--with-actions">
        <div>
          <h1>Inventory</h1>
          <p>Manage your products, costs, and pricing</p>
        </div>
        <button className="add-btn-bordered" onClick={() => navigate('/inventory/add')}>
          <FiPlus size={18} /> Add Product
        </button>
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
          <div className="stat-value">{totalProducts}</div>
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
          <div className="stat-value">{lowStockCount}</div>
        </div>
      </div>

      {/* Product List */}
      <div className="card">
        <div className="flex justify-between" style={{ marginBottom: '20px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>Product Catalog</h3>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>{products.length} items</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {deleteMode ? (
              <>
                <button 
                  className="icon-btn-circle"
                  onClick={cancelDeleteMode}
                  title="Cancel"
                  style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <FiX size={18} />
                </button>
                <button 
                  className="icon-btn-circle danger"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={selectedProducts.length === 0}
                  title={`Delete ${selectedProducts.length} selected`}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, background: selectedProducts.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--danger-text)', position: 'relative' }}
                >
                  <FiTrash2 size={18} />
                  {selectedProducts.length > 0 && (
                    <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#EF4444', color: 'white', fontSize: '10px', fontWeight: 700, width: '18px', height: '18px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{selectedProducts.length}</span>
                  )}
                </button>
              </>
            ) : (
              <button 
                onClick={() => setDeleteMode(true)}
                title="Delete products"
                style={{ width: '40px', height: '40px', borderRadius: '50%', padding: 0, background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
              >
                <FiTrash2 size={18} />
              </button>
            )}
          </div>
        </div>
        
        <div className="table-container">
          <table>
            <thead>
              <tr>
                {deleteMode && <th style={{ width: '40px' }}></th>}
                <th>Code</th>
                <th>Product</th>
                <th>Cost of Production</th>
                <th>Markup</th>
                <th>Sales Price</th>
                <th>Profit/Unit</th>
                <th>Stock</th>
                {!deleteMode && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {products.map(product => (
                <tr 
                  key={product.id}
                  onClick={deleteMode ? () => toggleProductSelection(product.id) : undefined}
                  style={{ cursor: deleteMode ? 'pointer' : 'default', background: selectedProducts.includes(product.id) ? 'rgba(239, 68, 68, 0.05)' : undefined }}
                >
                  {deleteMode && (
                    <td>
                      <div style={{ 
                        width: '20px', 
                        height: '20px', 
                        borderRadius: '50%', 
                        border: selectedProducts.includes(product.id) ? 'none' : '2px solid var(--border-color)',
                        background: selectedProducts.includes(product.id) ? '#EF4444' : 'transparent',
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
                        background: 'rgba(79, 106, 245, 0.1)',
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
                      {product.stock_quantity} units
                    </span>
                  </td>
                  {!deleteMode && (
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
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
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
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
