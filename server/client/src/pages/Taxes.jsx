import React, { useState, useEffect } from 'react';
import api from '../api';
import { FiPieChart, FiInfo, FiHash, FiDownload, FiArrowUpRight, FiArrowDownRight } from 'react-icons/fi';
import { exportTaxReport } from '../utils/exportUtils';
import './Taxes.css';

const Taxes = () => {
    const [revenue, setRevenue] = useState(0);
    const [profit, setProfit] = useState(0);
    const [vatCollected, setVatCollected] = useState(0);
    const [vatOrdersCount, setVatOrdersCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [taxType, setTaxType] = useState('PIT'); // Default to PIT based on user request
    
    // Nigerian Tax Constants (2024 Guidelines)
    const VAT_RATE = 0.075; 
    const EDT_RATE = 0.03;  
    const PENSION_RATE = 0.08; // Based on PwC sample
    
    useEffect(() => {
        fetchFinancialData();
    }, []);

    const fetchFinancialData = async () => {
        try {
            const [ordersRes, expensesRes] = await Promise.all([
                api.get('/orders'),
                api.get('/expenses')
            ]);
            
            const allOrders = ordersRes.data.data;
            const expenses = expensesRes.data.data;

            // Only count paid orders for tax calculations
            const paidOrders = allOrders.filter(order => order.payment_status === 'Paid');
            
            const totalRevenue = paidOrders.reduce((sum, order) => sum + (order.total_sales_price || 0), 0);
            const totalGrossProfit = paidOrders.reduce((sum, order) => sum + (order.total_profit || 0), 0);
            const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            // Calculate actual VAT collected from PAID orders where VAT was charged
            const vatOrders = paidOrders.filter(order => order.include_vat);
            const totalVatCollected = vatOrders.reduce((sum, order) => sum + (order.vat_amount || 0), 0);
            
            setRevenue(totalRevenue);
            setProfit(totalGrossProfit - totalExpenses);
            setVatCollected(totalVatCollected);
            setVatOrdersCount(vatOrders.length);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching financial data:', error);
            setLoading(false);
        }
    };

    // --- COMPANY TAX LOGIC (CIT/EDT) ---
    // VAT is now calculated from actual orders where VAT was charged
    const calculateVAT = () => vatCollected;
    
    const getCITRate = () => {
        if (revenue < 25000000) return 0; 
        if (revenue <= 100000000) return 0.20; 
        return 0.30; 
    };

    const citRate = getCITRate();
    const calculateCIT = () => Math.max(0, profit * citRate);
    const calculateEDT = () => Math.max(0, profit * EDT_RATE);
    
    // --- INDIVIDUAL TAX LOGIC (PIT) ---
    // Based on PwC Guideline provided by user
    const calculatePITDetails = () => {
        const grossIncome = profit; // For an individual business owner, net profit is effectively gross income for PIT
        const pension = grossIncome * PENSION_RATE;
        const gi2 = grossIncome - pension;
        
        const cra1 = Math.max(200000, 0.01 * grossIncome);
        const cra2 = 0.20 * gi2;
        const totalReliefs = cra1 + cra2 + pension;
        
        const taxableIncome = Math.max(0, grossIncome - totalReliefs);
        
        let tax = 0;
        let remaining = taxableIncome;
        
        const brackets = [
            { limit: 300000, rate: 0.07 },
            { limit: 300000, rate: 0.11 },
            { limit: 500000, rate: 0.15 },
            { limit: 500000, rate: 0.19 },
            { limit: 1600000, rate: 0.21 },
            { limit: Infinity, rate: 0.24 }
        ];

        for (const bracket of brackets) {
            if (remaining <= 0) break;
            const amountInBracket = Math.min(remaining, bracket.limit);
            tax += amountInBracket * bracket.rate;
            remaining -= amountInBracket;
        }

        // Minimum tax: 1% of GI
        const minimumTax = grossIncome * 0.01;
        const finalTax = Math.max(tax, minimumTax);

        return {
            pension,
            cra: cra1 + cra2,
            taxableIncome,
            finalTax
        };
    };

    const pitDetails = calculatePITDetails();
    
    const totalTaxLiability = taxType === 'CIT' 
        ? calculateCIT() + calculateEDT() 
        : pitDetails.finalTax;

    const netProfitAfterTax = profit - totalTaxLiability;

    const formatCurrency = (num) => {
        return '₦' + new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    const handleExport = () => {
        exportTaxReport({
            revenue,
            profit,
            taxType,
            pitDetails,
            citRate,
            calculateCIT,
            calculateEDT,
            calculateVAT,
            totalTaxLiability,
            netProfitAfterTax
        });
    };

    if (loading) return (
        <div className="taxes-container page-animate">
            <div className="loading-state">
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
                <div className="skeleton-line"></div>
            </div>
        </div>
    );

    return (
        <div className="taxes-container page-animate">
            {/* Professional Print Header - only visible when printing */}
            <div className="print-only tax-report-header">
                <div className="report-badge">Official Tax Analysis Report</div>
                <div className="report-meta">
                    <div>
                        <h2>RYME Inventory System</h2>
                        <p>Business Financial Audit & Tax Compliance</p>
                    </div>
                </div>
                <div className="report-date-container">
                    <span>Generated on: {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
            </div>

            <div className="page-title page-title--with-actions no-print">
                <div>
                    <h1>Tax Management</h1>
                    <p>Nigerian Tax Law Compliance ({taxType === 'CIT' ? '2024 Corporate' : 'Individual/PIT'})</p>
                </div>
                <div className="page-actions-group">
                    <select 
                        className="modern-select tax-type-selector"
                        value={taxType}
                        onChange={(e) => setTaxType(e.target.value)}
                    >
                        <option value="PIT">Personal Income Tax (Individual)</option>
                        <option value="CIT">Corporate Income Tax (Company)</option>
                    </select>
                    <button className="add-btn-bordered btn-animate hover-lift" onClick={handleExport}>
                        <FiDownload size={16} /> Export PDF
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <div className="stat-widget border-blue animate-slide-up delay-100">
                    <div className="stat-header">
                        <div className="stat-icon blue"><FiArrowUpRight /></div>
                    </div>
                    <div className="stat-label">{taxType === 'CIT' ? 'Annual Revenue' : 'Business Profit'}</div>
                    <div className="stat-value">{formatCurrency(taxType === 'CIT' ? revenue : profit)}</div>
                </div>

                <div className="stat-widget border-red animate-slide-up delay-200">
                    <div className="stat-header">
                        <div className="stat-icon red"><FiHash /></div>
                    </div>
                    <div className="stat-label">Tax Liability</div>
                    <div className="stat-value">{formatCurrency(totalTaxLiability)}</div>
                </div>

                <div className="stat-widget border-purple animate-slide-up delay-300">
                    <div className="stat-header">
                        <div className="stat-icon purple"><FiPieChart /></div>
                    </div>
                    <div className="stat-label">VAT Collected</div>
                    <div className="stat-value">{formatCurrency(calculateVAT())}</div>
                    <div className="stat-footnote">{vatOrdersCount} order{vatOrdersCount !== 1 ? 's' : ''} with VAT</div>
                </div>
            </div>

            <div className="tax-layout animate-fade-in delay-400">
                <div className="tax-main-content">
                    <div className="card">
                        <div className="card-header">
                            <h3>Detailed {taxType === 'CIT' ? 'Company' : 'Personal'} Tax Breakdown</h3>
                        </div>
                        
                        {/* Desktop Table */}
                        <div className="table-container hide-mobile">
                            <table className="modern-table">
                                <thead>
                                    <tr>
                                        <th>Tax Component</th>
                                        <th>Rate/Basis</th>
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {taxType === 'CIT' ? (
                                        <>
                                            <tr>
                                                <td>
                                                    <strong>CIT</strong>
                                                    <p className="text-muted small">Company Income Tax</p>
                                                </td>
                                                <td>{(citRate * 100)}% of Profit</td>
                                                <td style={{ textAlign: 'right' }} className="amount-cell">{formatCurrency(calculateCIT())}</td>
                                                <td><span className={`status-pill ${calculateCIT() > 0 ? 'pending' : 'exempt'}`}>
                                                    {calculateCIT() > 0 ? 'Due' : 'Exempt'}
                                                </span></td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <strong>EDT</strong>
                                                    <p className="text-muted small">Education Tax (Tertiary)</p>
                                                </td>
                                                <td>3.0% of Profit</td>
                                                <td style={{ textAlign: 'right' }} className="amount-cell">{formatCurrency(calculateEDT())}</td>
                                                <td><span className={`status-pill ${calculateEDT() > 0 ? 'pending' : 'exempt'}`}>
                                                    {calculateEDT() > 0 ? 'Due' : 'Exempt'}
                                                </span></td>
                                            </tr>
                                        </>
                                    ) : (
                                        <>
                                            <tr>
                                                <td>
                                                    <strong>Gross Assessable Income</strong>
                                                    <p className="text-muted small">Total Business Profit</p>
                                                </td>
                                                <td>Net Profit from Operations</td>
                                                <td style={{ textAlign: 'right' }} className="amount-cell">{formatCurrency(profit)}</td>
                                                <td><span className="status-pill recurring">Income</span></td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <strong>Consolidated Relief Allowance (CRA)</strong>
                                                    <p className="text-muted small">Higher of ₦200k/1% GI + 20% GI</p>
                                                </td>
                                                <td>Tax-Free Portion</td>
                                                <td style={{ textAlign: 'right' }} className="amount-cell text-green">({formatCurrency(pitDetails.cra)})</td>
                                                <td><span className="status-pill exempt">Relief</span></td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <strong>Pension Contributions</strong>
                                                    <p className="text-muted small">8% Statutory Deduction</p>
                                                </td>
                                                <td>Relief-Eligible Deduction</td>
                                                <td style={{ textAlign: 'right' }} className="amount-cell text-green">({formatCurrency(pitDetails.pension)})</td>
                                                <td><span className="status-pill exempt">Relief</span></td>
                                            </tr>
                                            <tr className="bracket-summary-row no-print">
                                                <td colSpan="4">
                                                    <details className="tax-bracket-details">
                                                        <summary>View Graduated Tax Brackets Breakdown</summary>
                                                        <div className="bracket-grid">
                                                            <div className="bracket-item"><span>First ₦300k @ 7%</span></div>
                                                            <div className="bracket-item"><span>Next ₦300k @ 11%</span></div>
                                                            <div className="bracket-item"><span>Next ₦500k @ 15%</span></div>
                                                            <div className="bracket-item"><span>Next ₦500k @ 19%</span></div>
                                                            <div className="bracket-item"><span>Next ₦1.6M @ 21%</span></div>
                                                            <div className="bracket-item"><span>Over ₦3.2M @ 24%</span></div>
                                                        </div>
                                                    </details>
                                                </td>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <strong>Taxable Income (Chargeable)</strong>
                                                    <p className="text-muted small">Net Income subject to PIT</p>
                                                </td>
                                                <td>{formatCurrency(profit)} - {formatCurrency(pitDetails.cra + pitDetails.pension)}</td>
                                                <td style={{ textAlign: 'right' }} className="amount-cell">{formatCurrency(pitDetails.taxableIncome)}</td>
                                                <td><span className="status-pill recurring">Base</span></td>
                                            </tr>
                                        </>
                                    )}
                                    <tr>
                                        <td>
                                            <strong>VAT Collected</strong>
                                            <p className="text-muted small">From {vatOrdersCount} order{vatOrdersCount !== 1 ? 's' : ''} with VAT</p>
                                        </td>
                                        <td>7.5% on VAT-enabled orders</td>
                                        <td style={{ textAlign: 'right' }} className="amount-cell text-blue">{formatCurrency(calculateVAT())}</td>
                                        <td><span className="status-pill recurring">Monthly</span></td>
                                    </tr>
                                </tbody>
                                <tfoot>
                                    <tr className="grand-total-row">
                                        <td colSpan="2"><strong>Net Annual Income (After {taxType})</strong></td>
                                        <td style={{ textAlign: 'right' }}><strong>{formatCurrency(netProfitAfterTax)}</strong></td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {/* Mobile Tax Cards */}
                        <div className="mobile-tax-list show-mobile">
                            {taxType === 'CIT' ? (
                                <>
                                    <div className="tax-mobile-item">
                                        <div className="tax-mobile-row">
                                            <span>CIT (Company Income Tax)</span>
                                            <strong>{formatCurrency(calculateCIT())}</strong>
                                        </div>
                                        <div className="tax-mobile-footer">
                                            <span className="text-muted">{(citRate * 100)}% Rate</span>
                                            <span className={`status-pill ${calculateCIT() > 0 ? 'pending' : 'exempt'}`}>
                                                {calculateCIT() > 0 ? 'Due' : 'Exempt'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="tax-mobile-item">
                                        <div className="tax-mobile-row">
                                            <span>EDT (Education Tax)</span>
                                            <strong>{formatCurrency(calculateEDT())}</strong>
                                        </div>
                                        <div className="tax-mobile-footer">
                                            <span className="text-muted">3% Rate</span>
                                            <span className={`status-pill ${calculateEDT() > 0 ? 'pending' : 'exempt'}`}>
                                                {calculateEDT() > 0 ? 'Due' : 'Exempt'}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="tax-mobile-item">
                                        <div className="tax-mobile-row">
                                            <span>PIT (Graduated Scale)</span>
                                            <strong>{formatCurrency(pitDetails.finalTax)}</strong>
                                        </div>
                                        <div className="tax-mobile-footer">
                                            <span className="text-muted">Based on Net Profit</span>
                                            <span className="status-pill recurring">Monthly</span>
                                        </div>
                                    </div>
                                    <div className="tax-mobile-item">
                                        <div className="tax-mobile-row">
                                            <span>Total Reliefs</span>
                                            <strong className="text-green">{formatCurrency(pitDetails.cra + pitDetails.pension)}</strong>
                                        </div>
                                        <div className="tax-mobile-footer">
                                            <span className="text-muted">Deductible</span>
                                            <span className="status-pill exempt">Exempt</span>
                                        </div>
                                    </div>
                                </>
                            )}
                            <div className="tax-mobile-item">
                                <div className="tax-mobile-row">
                                    <span>VAT Collected</span>
                                    <strong className="text-blue">{formatCurrency(calculateVAT())}</strong>
                                </div>
                                <div className="tax-mobile-footer">
                                    <span className="text-muted">{vatOrdersCount} order{vatOrdersCount !== 1 ? 's' : ''}</span>
                                    <span className="status-pill recurring">Monthly</span>
                                </div>
                            </div>
                            <div className="tax-mobile-total">
                                <span>Net Profit After Tax</span>
                                <strong>{formatCurrency(netProfitAfterTax)}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="tax-sidebar">
                    <div className="card info-card-flat">
                        <div className="card-header">
                            <h3><FiInfo /> {taxType} Compliance</h3>
                        </div>
                        <div className="info-content-modern">
                            <ul>
                                {taxType === 'CIT' ? (
                                    <>
                                        <li>
                                            <strong>CIT Thresholds</strong>
                                            <p>Under ₦25M turnover: 0%. Under ₦100M: 20%. Over ₦100M: 30%.</p>
                                        </li>
                                        <li>
                                            <strong>Education Tax</strong>
                                            <p>Applicable to all companies at 3% of assessable profit.</p>
                                        </li>
                                    </>
                                ) : (
                                    <>
                                        <li>
                                            <strong>Consolidated Relief</strong>
                                            <p>As per the PwC guideline: Higher of ₦200k or 1% of GI + 20% of GI.</p>
                                        </li>
                                        <li>
                                            <strong>Tax Brackets</strong>
                                            <p>Graduated rates from 7% (first 300k) up to 24% (over 3.2M).</p>
                                        </li>
                                        <li>
                                            <strong>Minimum Tax</strong>
                                            <p>The calculation ensures a minimum tax of 1% of Gross Income.</p>
                                        </li>
                                    </>
                                )}
                                <li>
                                    <strong>VAT (7.5%)</strong>
                                    <p>Calculated from orders where VAT was enabled. Enable VAT when creating orders to track liability. Remit by 21st of next month.</p>
                                </li>
                            </ul>
                            <button className="firs-link-btn btn-animate" onClick={() => window.open('https://www.firs.gov.ng', '_blank')}>
                                Open FIRS Portal
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Taxes;
