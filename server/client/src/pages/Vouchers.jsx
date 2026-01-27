import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { SkeletonTable, SkeletonStatsGrid } from '../components/Skeleton';
import {
    PlusIcon,
    DeleteIcon,
    TagsIcon,
    CalendarIcon,
    PercentageIcon,
    EditIcon,
    FilterIcon,
    ChevronDownIcon,
    CloseIcon,
    CheckIcon,
    CopyIcon,
    UsersIcon,
    VoucherIcon,
    ClockIcon,
    CheckCircleIcon,
    AlertCircleIcon,
    RefreshIcon,
    ShareIcon,
    DownloadIcon,
    ReportsIcon
} from '../components/CustomIcons';
import { useToast } from '../components/Toast';
import soundManager from '../utils/soundManager';
import useScrollLock from '../hooks/useScrollLock';
import { usePageState } from '../hooks/usePageState';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './Vouchers.css';

const Vouchers = () => {
    const { formatCurrency, currencySymbol } = useSettings();
    const toast = useToast();
    
    // Persisted page state
    const { state: pageState, updateState: updatePageState } = usePageState('vouchers', {
        filterStatus: 'all',
        sortBy: 'created_desc',
    }, { persistScroll: true, scrollContainerSelector: '.main-content' });

    const [vouchers, setVouchers] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingVoucher, setEditingVoucher] = useState(null);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [shareVoucher, setShareVoucher] = useState(null);
    const filterDropdownRef = useRef(null);
    const voucherCardRef = useRef(null);
    
    // Use persisted filter/sort state
    const filterStatus = pageState.filterStatus;
    const sortBy = pageState.sortBy;
    const setFilterStatus = (value) => updatePageState({ filterStatus: value });
    const setSortBy = (value) => updatePageState({ sortBy: value });

    const [formData, setFormData] = useState({
        code: '',
        description: '',
        discountType: 'percentage',
        discountValue: '',
        minPurchase: '',
        maxDiscount: '',
        brands: [],
        customerId: '',
        usageLimit: '',
        usedCount: 0,
        validFrom: new Date().toISOString().split('T')[0],
        validUntil: '',
        isActive: true
    });

    // Get unique brands from products
    const brands = useMemo(() => {
        const brandSet = new Set(products.map(p => p.brand_name).filter(Boolean));
        return Array.from(brandSet).sort();
    }, [products]);

    useScrollLock(showAddModal);

    useEffect(() => {
        const unsubVouchers = api.subscribe('/vouchers', (response) => {
            setVouchers(response.data);
            setLoading(false);
        });

        // Fetch customers and products for dropdowns
        api.get('/customers').then(res => setCustomers(res.data.data || []));
        api.get('/products').then(res => setProducts(res.data.data || []));

        return () => unsubVouchers();
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

    const generateVoucherCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'RYME-';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setFormData(prev => ({ ...prev, code }));
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleBrandToggle = (brand) => {
        setFormData(prev => ({
            ...prev,
            brands: prev.brands.includes(brand)
                ? prev.brands.filter(b => b !== brand)
                : [...prev.brands, brand]
        }));
    };

    const resetForm = () => {
        setFormData({
            code: '',
            description: '',
            discountType: 'percentage',
            discountValue: '',
            minPurchase: '',
            maxDiscount: '',
            brands: [],
            customerId: '',
            usageLimit: '',
            usedCount: 0,
            validFrom: new Date().toISOString().split('T')[0],
            validUntil: '',
            isActive: true
        });
        setEditingVoucher(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const voucherData = {
                code: formData.code.toUpperCase(),
                description: formData.description,
                discountType: formData.discountType,
                discountValue: parseFloat(formData.discountValue),
                minPurchase: formData.minPurchase ? parseFloat(formData.minPurchase) : 0,
                maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : null,
                brands: formData.brands,
                customerId: formData.customerId || null,
                usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : null,
                usedCount: editingVoucher ? editingVoucher.usedCount : 0,
                validFrom: formData.validFrom,
                validUntil: formData.validUntil,
                isActive: formData.isActive
            };

            if (editingVoucher) {
                await api.put(`/vouchers/${editingVoucher.id}`, voucherData);
                toast.success('Voucher updated successfully');
            } else {
                await api.post('/vouchers', voucherData);
                toast.success('Voucher created successfully');
            }

            setShowAddModal(false);
            resetForm();
            soundManager.playSuccess();
        } catch (err) {
            console.error('Error saving voucher:', err);
            toast.error('Failed to save voucher');
            soundManager.playError();
        }
    };

    const handleEdit = (voucher) => {
        setEditingVoucher(voucher);
        setFormData({
            code: voucher.code,
            description: voucher.description || '',
            discountType: voucher.discountType,
            discountValue: voucher.discountValue.toString(),
            minPurchase: voucher.minPurchase ? voucher.minPurchase.toString() : '',
            maxDiscount: voucher.maxDiscount ? voucher.maxDiscount.toString() : '',
            brands: voucher.brands || [],
            customerId: voucher.customerId || '',
            usageLimit: voucher.usageLimit ? voucher.usageLimit.toString() : '',
            usedCount: voucher.usedCount || 0,
            validFrom: voucher.validFrom?.split('T')[0] || '',
            validUntil: voucher.validUntil?.split('T')[0] || '',
            isActive: voucher.isActive
        });
        setShowAddModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this voucher?')) return;
        try {
            await api.delete(`/vouchers/${id}`);
            toast.success('Voucher deleted');
            soundManager.playSuccess();
        } catch (err) {
            console.error('Error deleting voucher:', err);
            toast.error('Failed to delete voucher');
            soundManager.playError();
        }
    };

    const handleToggleActive = async (voucher) => {
        try {
            await api.put(`/vouchers/${voucher.id}`, { ...voucher, isActive: !voucher.isActive });
            toast.success(voucher.isActive ? 'Voucher deactivated' : 'Voucher activated');
        } catch (err) {
            console.error('Error toggling voucher:', err);
            toast.error('Failed to update voucher');
        }
    };

    const copyToClipboard = (code) => {
        navigator.clipboard.writeText(code);
        toast.success('Voucher code copied!');
    };

    // Share voucher functions
    const handleShare = (voucher) => {
        setShareVoucher(voucher);
        setShowShareModal(true);
    };

    const exportVoucherAsImage = async () => {
        if (!voucherCardRef.current) return;
        try {
            toast.info('Generating image...');
            // Wait for any fonts to load
            await document.fonts.ready;
            
            const canvas = await html2canvas(voucherCardRef.current, {
                scale: 3,
                backgroundColor: null,
                useCORS: true,
                logging: false,
                width: voucherCardRef.current.offsetWidth,
                height: voucherCardRef.current.offsetHeight,
                onclone: (clonedDoc) => {
                    const el = clonedDoc.querySelector('.voucher-card-capture');
                    if (el) {
                        el.style.transform = 'none';
                        el.style.position = 'static';
                        el.style.display = 'block';
                    }
                }
            });
            const link = document.createElement('a');
            link.download = `voucher-${shareVoucher.code}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
            toast.success('Voucher image ready!');
        } catch (error) {
            console.error('Error exporting image:', error);
            toast.error('Failed to generate image');
        }
    };

    const exportVoucherAsPDF = async () => {
        if (!voucherCardRef.current) return;
        try {
            toast.info('Preparing PDF...');
            const canvas = await html2canvas(voucherCardRef.current, {
                scale: 2,
                backgroundColor: null,
                useCORS: true
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width / 2, canvas.height / 2]
            });
            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 2, canvas.height / 2);
            pdf.save(`voucher-${shareVoucher.code}.pdf`);
            toast.success('Voucher PDF saved!');
        } catch (error) {
            console.error('Error exporting PDF:', error);
            toast.error('Failed to generate PDF');
        }
    };

    const shareVoucherNative = async () => {
        if (!navigator.share) {
            copyToClipboard(shareVoucher.code);
            return;
        }
        try {
            const canvas = await html2canvas(voucherCardRef.current, {
                scale: 2,
                backgroundColor: null,
                useCORS: true
            });
            canvas.toBlob(async (blob) => {
                const file = new File([blob], `voucher-${shareVoucher.code}.png`, { type: 'image/png' });
                await navigator.share({
                    title: `Discount Voucher: ${shareVoucher.code}`,
                    text: `Use code ${shareVoucher.code} to get ${shareVoucher.discountType === 'percentage' ? `${shareVoucher.discountValue}% off` : `${currencySymbol}${shareVoucher.discountValue.toLocaleString()} off`} your purchase!`,
                    files: [file]
                });
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                copyToClipboard(shareVoucher.code);
            }
        }
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        resetForm();
    };

    // Get voucher status
    const getVoucherStatus = (voucher) => {
        const now = new Date();
        const validFrom = new Date(voucher.validFrom);
        const validUntil = voucher.validUntil ? new Date(voucher.validUntil) : null;
        
        if (!voucher.isActive) return 'inactive';
        if (validUntil && now > validUntil) return 'expired';
        if (now < validFrom) return 'scheduled';
        if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) return 'exhausted';
        return 'active';
    };

    const getStatusBadge = (status) => {
        const styles = {
            active: { bg: 'var(--success-bg)', color: 'var(--success-text)', icon: <CheckCircleIcon size={12} /> },
            expired: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', icon: <AlertCircleIcon size={12} /> },
            inactive: { bg: 'var(--bg-tertiary)', color: 'var(--text-tertiary)', icon: <AlertCircleIcon size={12} /> },
            scheduled: { bg: 'var(--info-bg)', color: 'var(--info-text)', icon: <ClockIcon size={12} /> },
            exhausted: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', icon: <CheckIcon size={12} /> }
        };
        const style = styles[status];
        return (
            <span className="status-badge" style={{ background: style.bg, color: style.color }}>
                {style.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    // Filtering and Sorting Logic
    const filteredAndSortedVouchers = useMemo(() => {
        let result = [...vouchers];

        // Filter by status
        if (filterStatus !== 'all') {
            result = result.filter(v => getVoucherStatus(v) === filterStatus);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'created_desc': return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                case 'created_asc': return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
                case 'expiry_asc': return new Date(a.validUntil || '9999') - new Date(b.validUntil || '9999');
                case 'expiry_desc': return new Date(b.validUntil || 0) - new Date(a.validUntil || 0);
                case 'discount_desc': return b.discountValue - a.discountValue;
                case 'discount_asc': return a.discountValue - b.discountValue;
                default: return 0;
            }
        });

        return result;
    }, [vouchers, filterStatus, sortBy]);

    // Summary Stats
    const stats = useMemo(() => {
        const activeCount = vouchers.filter(v => getVoucherStatus(v) === 'active').length;
        const expiredCount = vouchers.filter(v => getVoucherStatus(v) === 'expired').length;
        const totalUsed = vouchers.reduce((acc, v) => acc + (v.usedCount || 0), 0);
        
        return { total: vouchers.length, activeCount, expiredCount, totalUsed };
    }, [vouchers]);

    const sortOptions = [
        { value: 'created_desc', label: 'Newest First' },
        { value: 'created_asc', label: 'Oldest First' },
        { value: 'expiry_asc', label: 'Expiring Soon' },
        { value: 'expiry_desc', label: 'Expiring Last' },
        { value: 'discount_desc', label: 'Highest Discount' },
        { value: 'discount_asc', label: 'Lowest Discount' }
    ];

    const statusFilters = [
        { value: 'all', label: 'All Vouchers' },
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'exhausted', label: 'Exhausted' }
    ];

    return (
        <div className="vouchers-page page-animate">
            <div className="page-title page-title--with-actions">
                <div>
                    <h1>Vouchers</h1>
                    <p>Create and manage discount vouchers for customers</p>
                </div>
                <div className="page-title-actions">
                    <div className="filter-dropdown-container" ref={filterDropdownRef}>
                        <button 
                            className={`filter-btn ${filterStatus !== 'all' ? 'active' : ''}`}
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        >
                            <FilterIcon size={16} /> 
                            <span className="hide-mobile">{filterStatus === 'all' ? 'Filter' : statusFilters.find(s => s.value === filterStatus)?.label}</span>
                            <ChevronDownIcon size={14} className="hide-mobile" />
                        </button>
                        
                        {showFilterDropdown && (
                            <div className="filter-dropdown dropdown-animate">
                                <div className="dropdown-section">
                                    <label>Status</label>
                                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                        {statusFilters.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
                                    <button onClick={() => { setFilterStatus('all'); setSortBy('created_desc'); }}>
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    <button className="add-btn-bordered btn-animate hover-lift add-btn-compact" onClick={() => setShowAddModal(true)} style={{ height: '42px' }}>
                        <PlusIcon size={16} /> <span className="btn-text-full">Create Voucher</span><span className="btn-text-short">Voucher</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <>
                    <SkeletonStatsGrid count={4} />
                    <SkeletonTable rows={5} />
                </>
            ) : (
                <>
                    <div className="stats-grid">
                        <div className="stat-widget border-purple animate-slide-up delay-100">
                            <div className="stat-header">
                                <div className="stat-icon purple"><VoucherIcon /></div>
                            </div>
                            <div className="stat-label">Total Vouchers</div>
                            <div className="stat-value">{stats.total}</div>
                        </div>
                        
                        <div className="stat-widget border-green animate-slide-up delay-200">
                            <div className="stat-header">
                                <div className="stat-icon green"><CheckCircleIcon /></div>
                            </div>
                            <div className="stat-label">Active Vouchers</div>
                            <div className="stat-value">{stats.activeCount}</div>
                        </div>

                        <div className="stat-widget border-red animate-slide-up delay-300">
                            <div className="stat-header">
                                <div className="stat-icon red"><AlertCircleIcon /></div>
                            </div>
                            <div className="stat-label">Expired</div>
                            <div className="stat-value">{stats.expiredCount}</div>
                        </div>

                        <div className="stat-widget border-blue animate-slide-up delay-400">
                            <div className="stat-header">
                                <div className="stat-icon blue"><RefreshIcon /></div>
                            </div>
                            <div className="stat-label">Total Redemptions</div>
                            <div className="stat-value">{stats.totalUsed}</div>
                        </div>
                    </div>

                    <div className="card voucher-list-card animate-fade-in delay-300">
                        <div className="card-header">
                            <h3>Voucher List</h3>
                            <div className="header-badge">{filteredAndSortedVouchers.length} Vouchers</div>
                        </div>
                        
                        <div className="table-container hide-mobile">
                            <table className="vouchers-table">
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Discount</th>
                                        <th>Brands</th>
                                        <th>Validity</th>
                                        <th>Usage</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedVouchers.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="empty-row">No vouchers found.</td>
                                        </tr>
                                    ) : (
                                        filteredAndSortedVouchers.map(voucher => (
                                            <tr key={voucher.id} className="animate-slide-up">
                                                <td>
                                                    <div className="voucher-code-cell">
                                                        <span className="voucher-code">{voucher.code}</span>
                                                        <button 
                                                            className="copy-btn" 
                                                            onClick={() => copyToClipboard(voucher.code)}
                                                            title="Copy code"
                                                        >
                                                            <CopyIcon size={14} />
                                                        </button>
                                                        {voucher.description && (
                                                            <p className="voucher-desc">{voucher.description}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="discount-value">
                                                        {voucher.discountType === 'percentage' 
                                                            ? `${voucher.discountValue}%` 
                                                            : formatCurrency(voucher.discountValue)}
                                                    </span>
                                                    {voucher.maxDiscount && voucher.discountType === 'percentage' && (
                                                        <span className="max-discount">Max: {formatCurrency(voucher.maxDiscount)}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {voucher.brands && voucher.brands.length > 0 ? (
                                                        <div className="brand-tags">
                                                            {voucher.brands.slice(0, 2).map(b => (
                                                                <span key={b} className="brand-tag">{b}</span>
                                                            ))}
                                                            {voucher.brands.length > 2 && (
                                                                <span className="brand-tag more">+{voucher.brands.length - 2}</span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="all-brands">All Brands</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="validity-cell">
                                                        <span>{new Date(voucher.validFrom).toLocaleDateString()}</span>
                                                        <span className="validity-separator">→</span>
                                                        <span>{voucher.validUntil ? new Date(voucher.validUntil).toLocaleDateString() : 'No Expiry'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className="usage-cell">
                                                        {voucher.usedCount || 0} / {voucher.usageLimit || '∞'}
                                                    </span>
                                                </td>
                                                <td>{getStatusBadge(getVoucherStatus(voucher))}</td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="icon-btn share-btn" 
                                                            onClick={() => handleShare(voucher)} 
                                                            title="Share Voucher"
                                                        >
                                                            <ShareIcon size={16} />
                                                        </button>
                                                        <button 
                                                            className="icon-btn toggle-btn" 
                                                            onClick={() => handleToggleActive(voucher)} 
                                                            title={voucher.isActive ? 'Deactivate' : 'Activate'}
                                                        >
                                                            {voucher.isActive ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}
                                                        </button>
                                                        <button className="icon-btn edit-btn" onClick={() => handleEdit(voucher)} title="Edit">
                                                            <EditIcon size={16} />
                                                        </button>
                                                        <button className="icon-btn delete-btn" onClick={() => handleDelete(voucher.id)} title="Delete">
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

                        {/* Mobile Cards View */}
                        <div className="show-mobile voucher-mobile-list">
                            {filteredAndSortedVouchers.length === 0 ? (
                                <div className="empty-row">No vouchers found.</div>
                            ) : (
                                filteredAndSortedVouchers.map(voucher => (
                                    <div key={voucher.id} className="voucher-mobile-card animate-slide-up">
                                        <div className="voucher-mobile-header">
                                            <div className="voucher-mobile-code">
                                                <span className="voucher-code">{voucher.code}</span>
                                                <button className="copy-btn" onClick={() => copyToClipboard(voucher.code)}>
                                                    <CopyIcon size={14} />
                                                </button>
                                            </div>
                                            {getStatusBadge(getVoucherStatus(voucher))}
                                        </div>
                                        {voucher.description && (
                                            <p className="voucher-mobile-desc">{voucher.description}</p>
                                        )}
                                        <div className="voucher-mobile-details">
                                            <div className="detail-item">
                                                <PercentageIcon size={14} />
                                                <span>
                                                    {voucher.discountType === 'percentage' 
                                                        ? `${voucher.discountValue}% off` 
                                                        : `${formatCurrency(voucher.discountValue)} off`}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <CalendarIcon size={14} />
                                                <span>
                                                    {voucher.validUntil 
                                                        ? `Expires ${new Date(voucher.validUntil).toLocaleDateString()}` 
                                                        : 'No Expiry'}
                                                </span>
                                            </div>
                                            <div className="detail-item">
                                                <RefreshIcon size={14} />
                                                <span>Used {voucher.usedCount || 0} / {voucher.usageLimit || '∞'}</span>
                                            </div>
                                        </div>
                                        {voucher.brands && voucher.brands.length > 0 && (
                                            <div className="voucher-mobile-brands">
                                                {voucher.brands.map(b => (
                                                    <span key={b} className="brand-tag">{b}</span>
                                                ))}
                                            </div>
                                        )}
                                        <div className="voucher-mobile-actions">
                                            <button className="icon-btn share-btn" onClick={() => handleShare(voucher)} title="Share">
                                                <ShareIcon size={16} />
                                            </button>
                                            <button className="icon-btn toggle-btn" onClick={() => handleToggleActive(voucher)}>
                                                {voucher.isActive ? <AlertCircleIcon size={16} /> : <CheckCircleIcon size={16} />}
                                            </button>
                                            <button className="icon-btn edit-btn" onClick={() => handleEdit(voucher)}>
                                                <EditIcon size={16} />
                                            </button>
                                            <button className="icon-btn delete-btn" onClick={() => handleDelete(voucher.id)}>
                                                <DeleteIcon size={16} />
                                            </button>
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
                    <div className="modal-content voucher-modal animate-modal">
                        <div className="modal-header">
                            <h2>{editingVoucher ? 'Edit Voucher' : 'Create New Voucher'}</h2>
                            <button className="close-btn" onClick={handleCloseModal}><CloseIcon /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label>Voucher Code</label>
                                <div className="code-input-group">
                                    <input
                                        type="text"
                                        name="code"
                                        value={formData.code}
                                        onChange={handleChange}
                                        placeholder="e.g., SUMMER20"
                                        required
                                        style={{ textTransform: 'uppercase' }}
                                    />
                                    <button type="button" className="generate-btn" onClick={generateVoucherCode}>
                                        <RefreshIcon size={16} /> Generate
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Description (Optional)</label>
                                <input
                                    type="text"
                                    name="description"
                                    value={formData.description}
                                    onChange={handleChange}
                                    placeholder="e.g., Summer Sale Discount"
                                />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Discount Type</label>
                                    <select name="discountType" value={formData.discountType} onChange={handleChange}>
                                        <option value="percentage">Percentage (%)</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Discount Value</label>
                                    <div className="input-with-icon">
                                        {formData.discountType === 'percentage' 
                                            ? <PercentageIcon className="input-icon" />
                                            : <span className="input-icon-symbol">{currencySymbol}</span>
                                        }
                                        <input
                                            type="number"
                                            name="discountValue"
                                            value={formData.discountValue}
                                            onChange={handleChange}
                                            placeholder={formData.discountType === 'percentage' ? '10' : '500'}
                                            step="0.01"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Minimum Purchase (Optional)</label>
                                    <div className="input-with-icon">
                                        <span className="input-icon-symbol">{currencySymbol}</span>
                                        <input
                                            type="number"
                                            name="minPurchase"
                                            value={formData.minPurchase}
                                            onChange={handleChange}
                                            placeholder="0"
                                            step="0.01"
                                        />
                                    </div>
                                </div>
                                {formData.discountType === 'percentage' && (
                                    <div className="form-group">
                                        <label>Maximum Discount (Optional)</label>
                                        <div className="input-with-icon">
                                            <span className="input-icon-symbol">{currencySymbol}</span>
                                            <input
                                                type="number"
                                                name="maxDiscount"
                                                value={formData.maxDiscount}
                                                onChange={handleChange}
                                                placeholder="No limit"
                                                step="0.01"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Valid From</label>
                                    <input
                                        type="date"
                                        name="validFrom"
                                        value={formData.validFrom}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Valid Until (Optional)</label>
                                    <input
                                        type="date"
                                        name="validUntil"
                                        value={formData.validUntil}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label>Usage Limit (Optional)</label>
                                    <input
                                        type="number"
                                        name="usageLimit"
                                        value={formData.usageLimit}
                                        onChange={handleChange}
                                        placeholder="Unlimited"
                                        min="1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Restrict to Customer (Optional)</label>
                                    <select name="customerId" value={formData.customerId} onChange={handleChange}>
                                        <option value="">All Customers</option>
                                        {customers.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {brands.length > 0 && (
                                <div className="form-group">
                                    <label>Applicable Brands (Leave empty for all brands)</label>
                                    <div className="brand-selector">
                                        {brands.map(brand => (
                                            <button
                                                key={brand}
                                                type="button"
                                                className={`brand-chip ${formData.brands.includes(brand) ? 'selected' : ''}`}
                                                onClick={() => handleBrandToggle(brand)}
                                            >
                                                {formData.brands.includes(brand) && <CheckIcon size={14} />}
                                                {brand}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="form-group checkbox-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        name="isActive"
                                        checked={formData.isActive}
                                        onChange={handleChange}
                                    />
                                    <span>Voucher is active</span>
                                </label>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn-secondary" onClick={handleCloseModal}>Cancel</button>
                                <button type="submit" className="btn-primary">
                                    {editingVoucher ? <><CheckIcon /> Update Voucher</> : <><PlusIcon /> Create Voucher</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Share Voucher Modal - More Modern and Compact */}
            {showShareModal && shareVoucher && (
                <div className="share-modal-overlay">
                    <div className="share-modal-container compact animate-modal">
                        <div className="share-modal-header">
                            <div>
                                <h2>Share Voucher</h2>
                                <p>Send this discount to your customers</p>
                            </div>
                            <button className="close-btn" onClick={() => setShowShareModal(false)}>
                                <CloseIcon size={20} />
                            </button>
                        </div>

                        <div className="share-modal-body">
                            {/* Voucher Preview Preview */}
                            <div className="voucher-preview-area">
                                <div className="voucher-card-capture" ref={voucherCardRef}>
                                    <div className="modern-voucher-card">
                                        <div className="voucher-main-content">
                                            <div className="voucher-left">
                                                <div className="voucher-brand">RYME</div>
                                                <div className="voucher-value-box">
                                                    <span className="value">
                                                        {shareVoucher.discountType === 'percentage' 
                                                            ? `${shareVoucher.discountValue}%` 
                                                            : `${currencySymbol}${shareVoucher.discountValue.toLocaleString()}`}
                                                    </span>
                                                    <span className="off">OFF</span>
                                                </div>
                                                <div className="voucher-text">
                                                    {shareVoucher.description || 'Exclusive Discount'}
                                                </div>
                                            </div>
                                            
                                            <div className="voucher-divider">
                                                <div className="notch top"></div>
                                                <div className="dash-line"></div>
                                                <div className="notch bottom"></div>
                                            </div>

                                            <div className="voucher-right">
                                                <div className="code-tag">PROMO CODE</div>
                                                <div className="code-display">{shareVoucher.code}</div>
                                                <div className="expiry-tag">
                                                    Valid until {shareVoucher.validUntil ? new Date(shareVoucher.validUntil).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Expiry'}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="voucher-footer-strip">
                                            Present this code at checkout to redeem your discount
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="share-options-grid-compact">
                                <button className="compact-action-btn png" onClick={exportVoucherAsImage}>
                                    <div className="btn-icon"><DownloadIcon /></div>
                                    <div className="btn-label">Save Image</div>
                                </button>
                                
                                <button className="compact-action-btn pdf" onClick={exportVoucherAsPDF}>
                                    <div className="btn-icon"><ReportsIcon /></div>
                                    <div className="btn-label">Save PDF</div>
                                </button>
                                
                                <button className="compact-action-btn share" onClick={shareVoucherNative}>
                                    <div className="btn-icon"><ShareIcon /></div>
                                    <div className="btn-label">Share</div>
                                </button>
                                
                                <button className="compact-action-btn copy" onClick={() => copyToClipboard(shareVoucher.code)}>
                                    <div className="btn-icon"><CopyIcon /></div>
                                    <div className="btn-label">Copy Code</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Vouchers;
