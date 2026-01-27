import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { SkeletonTable, SkeletonStatsGrid } from '../components/Skeleton';
import {
  PlusIcon,
  DeleteIcon,
  CalendarIcon,
  ReportsIcon,
  TrendingUpIcon,
  EditIcon,
  FilterIcon,
  ChevronDownIcon,
  CloseIcon,
  CheckIcon
} from '../components/CustomIcons';
import { useToast } from '../components/Toast';
import soundManager from '../utils/soundManager';
import useScrollLock from '../hooks/useScrollLock';
import { usePageState } from '../hooks/usePageState';
import './Income.css';

const Income = () => {
    const { formatCurrency, currencySymbol } = useSettings();
    const toast = useToast();
    
    // Persisted page state
    const { state: pageState, updateState: updatePageState } = usePageState('income', {
        filterCategory: 'all',
        sortBy: 'date_desc',
    }, { persistScroll: true, scrollContainerSelector: '.main-content' });

    const [incomeRecords, setIncomeRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRecord, setEditingRecord] = useState(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const filterDropdownRef = useRef(null);
    
    // Use persisted filter/sort state
    const filterCategory = pageState.filterCategory;
    const sortBy = pageState.sortBy;
    const setFilterCategory = (value) => updatePageState({ filterCategory: value });
    const setSortBy = (value) => updatePageState({ sortBy: value });

    const [formData, setFormData] = useState({
        description: '',
        amount: '',
        profit: '',
        category: 'Services',
        source: '',
        date: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const incomeCategories = [
        'Services',
        'Consulting',
        'Interest',
        'Rental',
        'Commission',
        'Refunds',
        'Investment',
        'Other'
    ];

    useScrollLock(showAddModal);

    useEffect(() => {
        const unsubscribe = api.subscribe('/income', (response) => {
            setIncomeRecords(response.data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Close filtering dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
                setShowFilterDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const resetForm = () => {
        setFormData({
            description: '',
            amount: '',
            profit: '',
            category: 'Services',
            source: '',
            date: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setEditingRecord(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const incomeData = {
                description: formData.description,
                amount: parseFloat(formData.amount),
                profit: parseFloat(formData.profit) || 0,
                category: formData.category,
                source: formData.source || null,
                date: formData.date,
                notes: formData.notes || null
            };

            if (editingRecord) {
                await api.put(`/income/${editingRecord.id}`, incomeData);
                toast.success('Income record updated');
            } else {
                await api.post('/income', incomeData);
                toast.success('Income record added');
            }

            setShowAddModal(false);
            resetForm();
            soundManager.playSuccess();
        } catch (err) {
            console.error('Error saving income:', err);
            toast.error('Failed to save income record');
            soundManager.playError();
        }
    };

    const handleEdit = (record) => {
        setEditingRecord(record);
        setFormData({
            description: record.description,
            amount: record.amount.toString(),
            profit: (record.profit || 0).toString(),
            category: record.category,
            source: record.source || '',
            date: record.date.split('T')[0],
            notes: record.notes || ''
        });
        setShowAddModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this income record?')) return;
        try {
            await api.delete(`/income/${id}`);
            toast.success('Income record deleted');
            soundManager.playSuccess();
        } catch (err) {
            console.error('Error deleting income:', err);
            toast.error('Failed to delete income record');
            soundManager.playError();
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        resetForm();
    };

    // Filtering and Sorting Logic
    const filteredAndSortedIncome = useMemo(() => {
        let result = [...incomeRecords];

        // Filter by category
        if (filterCategory !== 'all') {
            result = result.filter(item => item.category === filterCategory);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'date_desc': return new Date(b.date) - new Date(a.date);
                case 'date_asc': return new Date(a.date) - new Date(b.date);
                case 'amount_desc': return b.amount - a.amount;
                case 'amount_asc': return a.amount - b.amount;
                case 'desc_asc': return a.description.localeCompare(b.description);
                default: return 0;
            }
        });

        return result;
    }, [incomeRecords, filterCategory, sortBy]);

    // Summary Stats
    const stats = useMemo(() => {
        const total = filteredAndSortedIncome.reduce((acc, curr) => acc + curr.amount, 0);
        const totalProfit = filteredAndSortedIncome.reduce((acc, curr) => acc + (curr.profit || 0), 0);
        const count = filteredAndSortedIncome.length;
        
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyRecords = incomeRecords.filter(r => r.date && r.date.startsWith(currentMonth));
        const monthly = monthlyRecords.reduce((acc, curr) => acc + curr.amount, 0);
        const monthlyProfit = monthlyRecords.reduce((acc, curr) => acc + (curr.profit || 0), 0);

        const categoryTotals = filteredAndSortedIncome.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});

        const topCategory = Object.entries(categoryTotals)
            .sort(([, a], [, b]) => b - a)[0];

        return { total, totalProfit, count, monthly, monthlyProfit, topCategory: topCategory ? topCategory[0] : 'N/A' };
    }, [filteredAndSortedIncome, incomeRecords]);

    const sortOptions = [
        { value: 'date_desc', label: 'Date (Newest First)' },
        { value: 'date_asc', label: 'Date (Oldest First)' },
        { value: 'amount_desc', label: 'Amount (High to Low)' },
        { value: 'amount_asc', label: 'Amount (Low to High)' },
        { value: 'desc_asc', label: 'Description (A-Z)' }
    ];

    return (
        <div className="income-page page-animate">
            <div className="page-title page-title--with-actions">
                <div>
                    <h1>Manual Income</h1>
                    <p>Track secondary revenue streams and manual entries.</p>
                </div>
                <div className="page-title-actions">
                    <div className="filter-dropdown-container" ref={filterDropdownRef}>
                        <button 
                            className={`filter-btn ${filterCategory !== 'all' ? 'active' : ''}`}
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        >
                            <FilterIcon size={16} /> 
                            <span className="hide-mobile">{filterCategory === 'all' ? 'Filter' : filterCategory}</span>
                            <ChevronDownIcon size={14} className="hide-mobile" />
                        </button>
                        
                        {showFilterDropdown && (
                            <div className="filter-dropdown dropdown-animate">
                                <div className="dropdown-section">
                                    <label>Category</label>
                                    <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                                        <option value="all">All Categories</option>
                                        {incomeCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="dropdown-section">
                                    <label>Sort By</label>
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                        {sortOptions.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="dropdown-footer">
                                    <button onClick={() => { setFilterCategory('all'); setSortBy('date_desc'); }}>Reset</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="add-btn-bordered btn-animate hover-lift add-btn-compact" onClick={() => setShowAddModal(true)} style={{ height: '42px' }}>
                        <PlusIcon size={16} /> <span className="btn-text-full">Add Income</span><span className="btn-text-short">Income</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <>
                    <SkeletonStatsGrid count={4} />
                    <div style={{ marginTop: '2rem' }}>
                        <SkeletonTable rows={5} cols={6} />
                    </div>
                </>
            ) : (
                <>
                    <div className="stats-grid">
                        <div className="stat-widget border-green animate-slide-up delay-100">
                            <div className="stat-header">
                                <div className="stat-icon green"><span className="currency-icon-text">{currencySymbol}</span></div>
                            </div>
                            <div className="stat-label">Total Revenue (Income)</div>
                            <div className="stat-value">{formatCurrency(stats.total)}</div>
                        </div>
                        
                        <div className="stat-widget border-cyan animate-slide-up delay-200">
                            <div className="stat-header">
                                <div className="stat-icon cyan"><TrendingUpIcon /></div>
                            </div>
                            <div className="stat-label">Total Profit</div>
                            <div className="stat-value">{formatCurrency(stats.totalProfit)}</div>
                        </div>

                        <div className="stat-widget border-blue animate-slide-up delay-300">
                            <div className="stat-header">
                                <div className="stat-icon blue"><CalendarIcon /></div>
                            </div>
                            <div className="stat-label">This Month Revenue</div>
                            <div className="stat-value">{formatCurrency(stats.monthly)}</div>
                            <div className="stat-footnote">Profit: {formatCurrency(stats.monthlyProfit)}</div>
                        </div>

                        <div className="stat-widget border-purple animate-slide-up delay-400">
                            <div className="stat-header">
                                <div className="stat-icon purple"><ReportsIcon /></div>
                            </div>
                            <div className="stat-label">Records ({stats.topCategory})</div>
                            <div className="stat-value">{stats.count}</div>
                        </div>
                    </div>

                    <div className="card expense-list-card animate-fade-in delay-300">
                        <div className="card-header">
                            <h3>Income History</h3>
                            <div className="header-badge">{filteredAndSortedIncome.length} Entries</div>
                        </div>
                        
                        <div className="table-container hide-mobile">
                            <table className="expenses-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Description</th>
                                        <th>Category</th>
                                        <th>Revenue</th>
                                        <th>Profit</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedIncome.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="empty-row">No income records found.</td>
                                        </tr>
                                    ) : (
                                        filteredAndSortedIncome.map(record => (
                                            <tr key={record.id} className="animate-slide-up">
                                                <td>
                                                    <div className="date-cell">
                                                        <CalendarIcon size={12} />
                                                        {new Date(record.date).toLocaleDateString()}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="description-cell">
                                                        <strong>{record.description}</strong>
                                                        {record.notes && <p className="notes-hint">{record.notes}</p>}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="category-badge income-badge">{record.category}</span>
                                                </td>
                                                <td>
                                                    <span className="amount-cell text-green">{formatCurrency(record.amount)}</span>
                                                </td>
                                                <td>
                                                    <span className="amount-cell text-cyan">{formatCurrency(record.profit || 0)}</span>
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div className="action-buttons">
                                                        <button className="icon-btn edit-btn" onClick={() => handleEdit(record)} title="Edit">
                                                            <EditIcon size={16} />
                                                        </button>
                                                        <button className="icon-btn delete-btn" onClick={() => handleDelete(record.id)} title="Delete">
                                                            <DeleteIcon size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="show-mobile expense-mobile-list">
                            {filteredAndSortedIncome.length === 0 ? (
                                <div className="empty-row">No income records found.</div>
                            ) : (
                                filteredAndSortedIncome.map(record => (
                                    <div key={record.id} className="expense-mobile-item animate-slide-up">
                                        <div className="expense-mobile-header">
                                            <div className="expense-mobile-title">
                                                <strong>{record.description}</strong>
                                                <span>{new Date(record.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="expense-mobile-amounts">
                                                <span className="expense-mobile-amount text-green">
                                                    {formatCurrency(record.amount)}
                                                </span>
                                                <span className="expense-mobile-profit text-cyan">
                                                    Profit: {formatCurrency(record.profit || 0)}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="expense-mobile-footer">
                                            <span className="category-badge income-badge">{record.category}</span>
                                            <div className="expense-mobile-actions">
                                                <button className="icon-btn edit-btn" onClick={() => handleEdit(record)}>
                                                    <EditIcon size={16} />
                                                </button>
                                                <button className="icon-btn delete-btn" onClick={() => handleDelete(record.id)}>
                                                    <DeleteIcon size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-modal">
                        <div className="modal-header">
                            <h2>{editingRecord ? 'Edit Income Record' : 'Add Income Entry'}</h2>
                            <button className="close-btn" onClick={handleCloseModal}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Description</label>
                                <input
                                    type="text"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="e.g., Consulting Service, Interest Payment"
                                    required
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Revenue (Income Amount)</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon-symbol">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            placeholder="Total income received"
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Actual Profit</label>
                                    <div className="input-with-icon">
                                        <TrendingUpIcon className="input-icon" />
                                        <input
                                            type="number"
                                            name="profit"
                                            value={formData.profit}
                                            onChange={handleChange}
                                            placeholder="Profit after costs"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        value={formData.date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Category</label>
                                    <select name="category" value={formData.category} onChange={handleChange}>
                                        {incomeCategories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Source (Optional)</label>
                                    <input
                                        type="text"
                                        name="source"
                                        value={formData.source}
                                        onChange={handleChange}
                                        placeholder="e.g., Bank Name, Client"
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleChange}
                                    placeholder="Any additional details..."
                                    rows={3}
                                />
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {editingRecord ? <><CheckIcon /> Update</> : <><PlusIcon /> Add Income</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Income;
