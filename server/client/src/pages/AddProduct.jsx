import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../api';
import { FiArrowLeft, FiPlus, FiX, FiSave, FiPackage } from 'react-icons/fi';
import './AddProduct.css';

const AddProduct = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    cost_of_production: '',
    markup_percentage: '',
    markup_amount: '',
    stock_quantity: ''
  });
  const [lineItems, setLineItems] = useState([]);
  const [newLineItem, setNewLineItem] = useState({ item_name: '', cost: '' });
  const [loading, setLoading] = useState(false);
  const [pricingError, setPricingError] = useState('');

  useEffect(() => {
    if (isEditing) {
      fetchProduct();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${id}`);
      const product = response.data.data;
      setFormData({
        name: product.name,
        description: product.description || '',
        cost_of_production: product.cost_of_production,
        markup_percentage: product.markup_percentage,
        markup_amount: product.markup_amount || '',
        stock_quantity: product.stock_quantity
      });
    } catch (error) {
      console.error('Error fetching product:', error);
    }
  };

  const handleChange = (e) => {
    setPricingError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const addLineItem = () => {
    if (newLineItem.item_name && newLineItem.cost) {
      setLineItems([...lineItems, { ...newLineItem, id: Date.now() }]);
      setNewLineItem({ item_name: '', cost: '' });
    }
  };

  const removeLineItem = (itemId) => {
    setLineItems(lineItems.filter(item => item.id !== itemId));
  };

  const calculatedCoP = lineItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);
  const finalCoP = lineItems.length > 0 ? calculatedCoP : Number(formData.cost_of_production || 0);
  const hasMarkupAmount = formData.markup_amount !== '' && formData.markup_amount !== null && formData.markup_amount !== undefined;
  const hasMarkupPercent = formData.markup_percentage !== '' && formData.markup_percentage !== null && formData.markup_percentage !== undefined;
  const appliedMarkup = hasMarkupAmount
    ? Number(formData.markup_amount || 0)
    : hasMarkupPercent
      ? (finalCoP * Number(formData.markup_percentage) / 100)
      : 0;
  const estimatedSP = finalCoP ? finalCoP + appliedMarkup : 0;
  const estimatedProfit = finalCoP ? estimatedSP - finalCoP : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!hasMarkupAmount && !hasMarkupPercent) {
        setPricingError('Please provide either a markup percentage or a markup amount.');
        setLoading(false);
        return;
      }

      const productData = {
        ...formData,
        cost_of_production: lineItems.length > 0 ? calculatedCoP : formData.cost_of_production
      };
      
      if (isEditing) {
        await api.put(`/products/${id}`, productData);
      } else {
        await api.post('/products', productData);
      }
      
      navigate('/inventory');
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Error saving product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-product-page">
      <div className="add-product-header">
        <Link to="/inventory" className="back-link">
          <FiArrowLeft />
          <span>Back to Inventory</span>
        </Link>
      </div>

      <div className="add-product-container">
        <div className="add-product-main">
          <div className="page-title">
            <h1>{isEditing ? 'Edit Product' : 'Add New Product'}</h1>
            <p>Fill in the details below to {isEditing ? 'update' : 'create'} a product</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-card">
              <h3 className="section-title">Basic Information</h3>
              
              <div className="form-group">
                <label>Product Name <span className="required">*</span></label>
                <input 
                  type="text" 
                  name="name" 
                  placeholder="e.g., Oak Wood Chair" 
                  value={formData.name} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea 
                  name="description" 
                  placeholder="Brief description of the product" 
                  value={formData.description} 
                  onChange={handleChange}
                  rows="3"
                />
              </div>
            </div>

            <div className="form-card">
              <h3 className="section-title">
                <FiPackage /> Cost of Production
              </h3>
              <p className="section-description">
                Add materials/ingredients used to make this product. The total will be your Cost of Production.
              </p>

              {lineItems.length > 0 && (
                <div className="line-items-list">
                  {lineItems.map((item) => (
                    <div key={item.id} className="line-item">
                      <div className="line-item-content">
                        <span className="line-item-name">{item.item_name}</span>
                        <span className="line-item-cost">₦{Number(item.cost).toFixed(2)}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="btn-remove"
                      >
                        <FiX />
                      </button>
                    </div>
                  ))}
                  <div className="line-items-total">
                    <span>Total CoP:</span>
                    <span className="total-amount">₦{calculatedCoP.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="add-line-item-form">
                <input 
                  type="text" 
                  placeholder="Item/Material name" 
                  value={newLineItem.item_name}
                  onChange={(e) => setNewLineItem({ ...newLineItem, item_name: e.target.value })}
                  className="line-item-input"
                />
                <input 
                  type="number" 
                  placeholder="Cost" 
                  step="0.01"
                  value={newLineItem.cost}
                  onChange={(e) => setNewLineItem({ ...newLineItem, cost: e.target.value })}
                  className="line-item-cost-input"
                />
                <button 
                  type="button"
                  onClick={addLineItem}
                  className="btn-add-item"
                >
                  <FiPlus /> Add Item
                </button>
              </div>

              {lineItems.length === 0 && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label>Or enter Cost of Production directly (₦) <span className="required">*</span></label>
                  <input 
                    type="number" 
                    name="cost_of_production" 
                    placeholder="0.00" 
                    step="0.01"
                    value={formData.cost_of_production} 
                    onChange={handleChange} 
                    required={lineItems.length === 0}
                  />
                </div>
              )}
            </div>

            <div className="form-card">
              <h3 className="section-title">Pricing & Stock</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Markup Percentage (%)</label>
                  <input 
                    type="number" 
                    name="markup_percentage" 
                    placeholder="e.g., 50" 
                    value={formData.markup_percentage} 
                    onChange={handleChange} 
                  />
                  <small className="helper-text">Use percentage or amount — one is required.</small>
                </div>

                <div className="form-group">
                  <label>Markup Amount (₦)</label>
                  <input
                    type="number"
                    name="markup_amount"
                    placeholder="e.g., 1500"
                    step="0.01"
                    value={formData.markup_amount}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Stock Quantity <span className="required">*</span></label>
                  <input 
                    type="number" 
                    name="stock_quantity" 
                    placeholder="0" 
                    value={formData.stock_quantity} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              {pricingError && (
                <div className="pricing-error">{pricingError}</div>
              )}
            </div>

            <div className="form-actions">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => navigate('/inventory')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading}
              >
                <FiSave /> {loading ? 'Saving...' : (isEditing ? 'Update Product' : 'Add Product')}
              </button>
            </div>
          </form>
        </div>

        <div className="add-product-sidebar">
          <div className="preview-card">
            <h3>Price Preview</h3>
            
            <div className="preview-item">
              <span>Cost of Production:</span>
              <span className="preview-value">₦{finalCoP.toFixed(2)}</span>
            </div>
            
            <div className="preview-item">
              <span>
                Markup {hasMarkupAmount ? '(Amount)' : `(${formData.markup_percentage || 0}%)`}:
              </span>
              <span className="preview-value">+₦{(estimatedSP - finalCoP).toFixed(2)}</span>
            </div>
            
            <div className="preview-divider"></div>
            
            <div className="preview-item">
              <span>Sales Price:</span>
              <span className="preview-value primary">₦{estimatedSP.toFixed(2)}</span>
            </div>
            
            <div className="preview-item">
              <span>Profit per Unit:</span>
              <span className="preview-value success">+₦{estimatedProfit.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddProduct;
