import React, { useState, useEffect } from 'react';
import api from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { FiPlus, FiTrash2, FiDollarSign, FiCalendar, FiFileText, FiLink, FiAlertCircle } from 'react-icons/fi';
import './Expenses.css';

const Expenses = () => {
    const { formatCurrency } = useSettings();
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [orders, setOrders] = useState([]);
    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        category: 'Operating',
        order_id: ''
    });

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await api.get('/expenses');
            setExpenses(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching expenses:', err);
            setLoading(false);
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders');
            setOrders(res.data.data);
        } catch (err) {
            console.error('Error fetching orders:', err);
        }
    };

    useEffect(() => {
        fetchExpenses();
        fetchOrders();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const selectedOrder = orders.find(o => o.id === formData.order_id);
            await api.post('/expenses', {
                ...formData,
                amount: parseFloat(formData.amount),
                order_id: formData.order_id || null,
                customer_name: selectedOrder ? selectedOrder.customer_name : null
            });
            setShowAddModal(false);
            setFormData({ description: '', amount: '', category: 'Operating', order_id: '' });
            fetchExpenses();
        } catch (err) {
            console.error('Error adding expense:', err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            await api.delete(`/expenses/${id}`);
            fetchExpenses();
        } catch (err) {
            console.error('Error deleting expense:', err);
        }
    };

    const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <div className="expenses-container page-animate">
            <div className="page-title page-title--with-actions">
                <div>
                    <h1>Business Expenses</h1>
                    <p>Track business overheads and order-specific costs.</p>
                </div>
                <button className="add-btn-bordered btn-animate hover-lift" onClick={() => setShowAddModal(true)}>
                    <FiPlus size={16} className="icon-spin" /> Add Expense
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-widget border-red animate-slide-up delay-100">
                    <div className="stat-header">
                        <div className="stat-icon red"><FiDollarSign /></div>
                    </div>
                    <div className="stat-label">Total Expenses</div>
                    <div className="stat-value">{formatCurrency(totalExpenses)}</div>
                </div>
                
                <div className="stat-widget border-blue animate-slide-up delay-200">
                    <div className="stat-header">
                        <div className="stat-icon blue"><FiFileText /></div>
                    </div>
                    <div className="stat-label">Total Records</div>
                    <div className="stat-value">{expenses.length}</div>
                </div>
            </div>

            <div className="card expense-list-card animate-fade-in delay-300">
                <div className="card-header">
                    <h3>Expense History</h3>
                </div>
                
                {loading ? (
                    <div className="loading-state">
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line"></div>
                        <div className="skeleton-line"></div>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table View */}
                        <div className="table-container hide-mobile">
                            <table className="expenses-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th>Linked Order</th>
                                        <th>Amount</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {expenses.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="empty-row">No expenses recorded yet.</td>
                                        </tr>
                                    ) : (
                                        expenses.map(expense => (
                                            <tr key={expense.id} className="animate-slide-up">
                                                <td>
                                                    <div className="date-cell">
                                                        <FiCalendar size={12} />
                                                        {new Date(expense.date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td className="desc-cell">
                                                    <strong>{expense.description}</strong>
                                                </td>
                                                <td><span className="category-badge">{expense.category}</span></td>
                                                <td>
                                                    {expense.order_id ? (
                                                        <span className="order-link">
                                                            <FiLink size={12} /> {orders.find(o => o.id === expense.order_id)?.customer_name || expense.customer_name || `Order #${expense.order_id.slice(0, 5)}`}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted">— General —</span>
                                                    )}
                                                </td>
                                                <td className="amount-cell text-red">{formatCurrency(expense.amount)}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button className="action-btn delete btn-animate" onClick={() => handleDelete(expense.id)}>
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="mobile-expense-list show-mobile">
                            {expenses.length === 0 ? (
                                <div className="empty-state">No expenses recorded yet.</div>
                            ) : (
                                expenses.map(expense => (
                                    <div key={expense.id} className="expense-mobile-item animate-pop-in">
                                        <div className="expense-mobile-header">
                                            <div className="expense-mobile-title">
                                                <strong>{expense.description}</strong>
                                                <span>{new Date(expense.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="expense-mobile-amount text-red">
                                                {formatCurrency(expense.amount)}
                                            </div>
                                        </div>
                                        <div className="expense-mobile-footer">
                                            <span className="category-badge">{expense.category}</span>
                                            <div className="expense-mobile-actions">
                                                {expense.order_id && (
                                                    <span className="order-link small">
                                                        <FiLink size={10} /> {orders.find(o => o.id === expense.order_id)?.customer_name || expense.customer_name || 'Linked'}
                                                    </span>
                                                )}
                                                <button className="action-btn delete btn-animate" onClick={() => handleDelete(expense.id)}>
                                                    <FiTrash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </div>

            {showAddModal && (
                <div className="modal-overlay animate-fade-in" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h2>Record Expense</h2>
                                <p>Capture business costs and link to orders</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="modern-form">
                            <div className="form-group">
                                <label>What was this expense for? <span className="required">*</span></label>
                                <input 
                                    type="text" 
                                    name="description" 
                                    className="modern-input"
                                    value={formData.description} 
                                    onChange={handleChange} 
                                    placeholder="e.g., Delivery fee, Office supplies"
                                    required 
                                />
                            </div>

                            <div className="form-row grid-2">
                                <div className="form-group">
                                    <label>Amount <span className="required">*</span></label>
                                    <div className="input-with-symbol">
                                        <span className="input-symbol">₦</span>
                                        <input 
                                            type="number" 
                                            name="amount" 
                                            className="modern-input"
                                            value={formData.amount} 
                                            onChange={handleChange} 
                                            placeholder="0.00"
                                            step="0.01"
                                            required 
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Category</label>
                                    <select 
                                        name="category" 
                                        className="modern-select"
                                        value={formData.category} 
                                        onChange={handleChange}
                                    >
                                        <option value="Operating">Operating</option>
                                        <option value="Delivery">Delivery</option>
                                        <option value="Packaging">Packaging</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Tax">Tax</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Link to Order (Optional)</label>
                                <select 
                                    name="order_id" 
                                    className="modern-select"
                                    value={formData.order_id} 
                                    onChange={handleChange}
                                >
                                    <option value="">— General Business Expense —</option>
                                    {orders.map(order => (
                                        <option key={order.id} value={order.id}>
                                            #{order.id.slice(0, 5)} - {order.customer_name} ({formatCurrency(order.total_sales_price)})
                                        </option>
                                    ))}
                                </select>
                                <p className="helper-text">
                                    <FiAlertCircle size={12} /> Linking deducts this from the order's net profit.
                                </p>
                            </div>

                            <div className="modal-actions-modern">
                                <button type="button" className="secondary-btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="primary-btn btn-animate">Record Expense</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Expenses;
