import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUpIcon,
  TrendingDownIcon,
  CartIcon,
  PackageIcon,
  ProfileIcon,
  AnalyticsIcon,
  PieChartIcon,
  CalendarIcon,
  AlertCircleIcon,
  DownloadIcon,
  ReportsIcon
} from '../components/CustomIcons';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSettings } from '../contexts/SettingsContext';
import { exportFinancialReport } from '../utils/exportUtils';
import { usePageState } from '../hooks/usePageState';
import './Analytics.css';

const incomeRef = collection(db, 'income');

const getDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.valueOf()) ? null : value;
  if (typeof value.toDate === 'function') {
    const converted = value.toDate();
    return Number.isNaN(converted.valueOf()) ? null : converted;
  }

  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : date;
};

const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const Analytics = () => {
  const { formatCurrency, currencySymbol } = useSettings();

  // Persist date range selection
  const { state: pageState, updateState: updatePageState } = usePageState('analytics', {
    dateRange: '30',
  }, { persistScroll: true, scrollContainerSelector: '.main-content' });

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [incomeRecords, setIncomeRecords] = useState([]);
  const [dateRange, setDateRange] = useState(pageState.dateRange);
  const [loading, setLoading] = useState(true);

  // Persist date range changes
  useEffect(() => {
    updatePageState({ dateRange });
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersSnap, productsSnap, incomeSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('order_date', 'desc'))),
        getDocs(collection(db, 'products')),
        getDocs(query(incomeRef, orderBy('date', 'desc')))
      ]);

      setOrders(ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        order_date: doc.data().order_date?.toDate?.() || new Date(doc.data().order_date)
      })));

      setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      setIncomeRecords(incomeSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Filter by date range
  const filterByDateRange = (items) => {
    if (dateRange === 'all') return items;
    const now = new Date();
    const daysAgo = new Date(now.setDate(now.getDate() - parseInt(dateRange)));
    return items.filter(item => new Date(item.order_date) >= daysAgo);
  };

  // Filter income by date range
  const filterIncomeByDateRange = (items) => {
    if (dateRange === 'all') return items;
    const now = new Date();
    const daysAgo = new Date(now.setDate(now.getDate() - parseInt(dateRange)));
    return items.filter(item => new Date(item.date) >= daysAgo);
  };

  const filteredOrders = useMemo(() => filterByDateRange(orders), [orders, dateRange]);
  const filteredIncome = useMemo(() => filterIncomeByDateRange(incomeRecords), [incomeRecords, dateRange]);

  // Calculate stats (including manual income)
  const orderRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_sales_price || 0), 0);
  const manualIncomeRevenue = filteredIncome.reduce((sum, i) => sum + (i.amount || 0), 0);
  const manualIncomeProfit = filteredIncome.reduce((sum, i) => sum + (i.profit || 0), 0);
  const totalRevenue = orderRevenue + manualIncomeRevenue;
  const totalProfit = filteredOrders.reduce((sum, o) => sum + (o.total_profit || 0), 0) + manualIncomeProfit;
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Compare with previous period
  const getPreviousPeriodOrders = () => {
    if (dateRange === 'all') return []; // No previous period for "all time"
    const now = new Date();
    const days = parseInt(dateRange);
    const periodStart = new Date(now.setDate(now.getDate() - days));
    const previousStart = new Date(periodStart.setDate(periodStart.getDate() - days));

    return orders.filter(o => {
      const orderDate = new Date(o.order_date);
      return orderDate >= previousStart && orderDate < new Date(new Date().setDate(new Date().getDate() - days));
    });
  };

  const previousOrders = getPreviousPeriodOrders();
  const previousRevenue = previousOrders.reduce((sum, o) => sum + (o.total_sales_price || 0), 0);
  const revenueChange = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue * 100) : 0;

  // Sales by day chart data
  const salesByDay = useMemo(() => {
    const salesMap = {};
    filteredOrders.forEach(order => {
      const date = new Date(order.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!salesMap[date]) {
        salesMap[date] = { date, revenue: 0, profit: 0, orders: 0 };
      }
      salesMap[date].revenue += order.total_sales_price || 0;
      salesMap[date].profit += order.total_profit || 0;
      salesMap[date].orders += 1;
    });
    return Object.values(salesMap).reverse();
  }, [filteredOrders]);

  // Top products by revenue
  const productSales = useMemo(() => {
    const productSales = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.product_id || item.product_name || 'unknown';
        if (!productSales[key]) {
          productSales[key] = {
            id: item.product_id,
            name: item.product_name || 'Unknown',
            revenue: 0,
            quantity: 0
          };
        }
        productSales[key].revenue += (item.sales_price_at_time || item.sales_price || 0) * (item.quantity || 0);
        productSales[key].quantity += item.quantity || 0;
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  const topProducts = productSales.slice(0, 5);

  const soldProductKeys = useMemo(() => {
    const keys = new Set();
    productSales.forEach(product => {
      if (product.id) keys.add(product.id);
      if (product.name) keys.add(product.name.toLowerCase());
    });
    return keys;
  }, [productSales]);

  const deadStockProducts = useMemo(() => {
    return products.filter(product => {
      const stock = Number(product.stock_quantity || 0);
      if (stock <= 0) return false;
      const productName = (product.name || '').toLowerCase();
      return !soldProductKeys.has(product.id) && !soldProductKeys.has(productName);
    });
  }, [products, soldProductKeys]);

  const topCustomers = useMemo(() => {
    const customerMap = {};
    filteredOrders.forEach(order => {
      const key = order.customer_id || order.customer_name || 'Walk-in';
      if (!customerMap[key]) {
        customerMap[key] = {
          name: order.customer_name || 'Walk-in',
          revenue: 0,
          profit: 0,
          orders: 0
        };
      }
      customerMap[key].revenue += Number(order.total_sales_price || 0);
      customerMap[key].profit += Number(order.total_profit || 0);
      customerMap[key].orders += 1;
    });

    return Object.values(customerMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredOrders]);

  const monthlyTrend = useMemo(() => {
    const today = new Date();
    const buckets = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
      return {
        key: getMonthKey(date),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        revenue: 0,
        profit: 0,
        orders: 0
      };
    });

    const bucketMap = new Map(buckets.map(bucket => [bucket.key, bucket]));

    orders.forEach(order => {
      const date = getDateValue(order.order_date);
      if (!date) return;
      const bucket = bucketMap.get(getMonthKey(date));
      if (!bucket) return;
      bucket.revenue += Number(order.total_sales_price || 0);
      bucket.profit += Number(order.total_profit || 0);
      bucket.orders += 1;
    });

    incomeRecords.forEach(record => {
      const date = getDateValue(record.date);
      if (!date) return;
      const bucket = bucketMap.get(getMonthKey(date));
      if (!bucket) return;
      bucket.revenue += Number(record.amount || 0);
      bucket.profit += Number(record.profit || 0);
    });

    return buckets;
  }, [orders, incomeRecords]);

  const monthlyComparison = useMemo(() => {
    const current = monthlyTrend[monthlyTrend.length - 1] || { revenue: 0, profit: 0, orders: 0 };
    const previous = monthlyTrend[monthlyTrend.length - 2] || { revenue: 0, profit: 0, orders: 0 };

    return {
      current,
      previous,
      revenueChange: previous.revenue > 0 ? ((current.revenue - previous.revenue) / previous.revenue) * 100 : 0,
      profitChange: previous.profit > 0 ? ((current.profit - previous.profit) / previous.profit) * 100 : 0
    };
  }, [monthlyTrend]);

  const inventoryValue = useMemo(() => {
    return products.reduce((sum, product) => (
      sum + (Number(product.cost_of_production || 0) * Number(product.stock_quantity || 0))
    ), 0);
  }, [products]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const categories = {};
    products.forEach(product => {
      const cat = product.category || 'Uncategorized';
      if (!categories[cat]) {
        categories[cat] = { name: cat, value: 0 };
      }
      categories[cat].value += 1;
    });
    return Object.values(categories);
  }, [products]);

  const COLORS = ['#2563eb', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  const handleExport = (type) => {
    const transactions = filteredOrders.map(o => ({
      date: new Date(o.order_date).toLocaleDateString(),
      type: 'Sale',
      reference: o.orderId || o.id.substring(0, 8),
      revenue: o.total_sales_price || 0,
      cost: (o.total_sales_price || 0) - (o.total_profit || 0),
      profit: o.total_profit || 0,
      method: o.payment_method || 'Cash'
    }));

    const data = {
      summary: {
        totalRevenue: formatCurrency(totalRevenue),
        totalCost: formatCurrency(totalRevenue - totalProfit),
        totalProfit: formatCurrency(totalProfit),
        margin: totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0
      },
      transactions
    };

    exportFinancialReport(data, type);
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading-state">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <div>
          <h1>Analytics</h1>
          <p>Track your business performance</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="secondary"
              onClick={() => handleExport('csv')}
              title="Export Full Financial Report (CSV)"
              style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <ReportsIcon size={16} /> <span className="hide-mobile">CSV</span>
            </button>
            <button
              className="secondary"
              onClick={() => handleExport('pdf')}
              title="Export Full Financial Report (PDF)"
              style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              <DownloadIcon size={16} /> <span className="hide-mobile">PDF Report</span>
            </button>
          </div>
          <div className="date-filter">
            <CalendarIcon />
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="365">Last year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-widget border-blue animate-slide-up delay-100">
          <div className="stat-header">
            <div className="stat-icon blue"><span className="currency-icon-text">{currencySymbol}</span></div>
            <span className={`stat-change ${revenueChange >= 0 ? 'positive' : 'negative'}`}>
              {revenueChange >= 0 ? <TrendingUpIcon /> : <TrendingDownIcon />}
              {Math.abs(revenueChange).toFixed(1)}%
            </span>
          </div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
        </div>

        <div className="stat-widget border-green animate-slide-up delay-200">
          <div className="stat-header">
            <div className="stat-icon green"><TrendingUpIcon /></div>
          </div>
          <div className="stat-label">Total Profit</div>
          <div className="stat-value">{formatCurrency(totalProfit)}</div>
        </div>

        <div className="stat-widget border-purple animate-slide-up delay-300">
          <div className="stat-header">
            <div className="stat-icon purple"><CartIcon /></div>
          </div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{new Intl.NumberFormat('en-US').format(totalOrders)}</div>
        </div>

        <div className="stat-widget border-orange animate-slide-up delay-400">
          <div className="stat-header">
            <div className="stat-icon orange"><AnalyticsIcon /></div>
          </div>
          <div className="stat-label">Avg. Order Value</div>
          <div className="stat-value">{formatCurrency(avgOrderValue)}</div>
        </div>
      </div>

      <div className="analytics-insights-grid">
        <div className="insight-card">
          <div className="insight-icon blue"><CalendarIcon size={18} /></div>
          <div className="insight-content">
            <span className="insight-label">This Month Revenue</span>
            <strong>{formatCurrency(monthlyComparison.current.revenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
            <span className={`insight-change ${monthlyComparison.revenueChange >= 0 ? 'positive' : 'negative'}`}>
              {monthlyComparison.revenueChange >= 0 ? '+' : ''}{monthlyComparison.revenueChange.toFixed(1)}% vs previous month
            </span>
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-icon green"><ProfileIcon size={18} /></div>
          <div className="insight-content">
            <span className="insight-label">Top Customer</span>
            <strong>{topCustomers[0]?.name || 'No customer data'}</strong>
            <span>{topCustomers[0] ? `${formatCurrency(topCustomers[0].revenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} across ${topCustomers[0].orders} order${topCustomers[0].orders === 1 ? '' : 's'}` : 'Create orders to build value history'}</span>
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-icon purple"><PackageIcon size={18} /></div>
          <div className="insight-content">
            <span className="insight-label">Inventory Value</span>
            <strong>{formatCurrency(inventoryValue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</strong>
            <span>{new Intl.NumberFormat('en-US').format(products.length)} active product records</span>
          </div>
        </div>

        <div className="insight-card">
          <div className="insight-icon orange"><AlertCircleIcon size={18} /></div>
          <div className="insight-content">
            <span className="insight-label">Dead Stock Watch</span>
            <strong>{new Intl.NumberFormat('en-US').format(deadStockProducts.length)}</strong>
            <span>Stocked item{deadStockProducts.length === 1 ? '' : 's'} with no sales in this range</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3><AnalyticsIcon /> Revenue Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3><TrendingUpIcon /> Profit Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Line type="monotone" dataKey="profit" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3><CalendarIcon /> Monthly Revenue vs Profit</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--text-tertiary)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend formatter={(value) => <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{value}</span>} />
                <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="chart-card">
          <h3><ProfileIcon /> Customer Value</h3>
          <div className="customer-value-list">
            {topCustomers.map((customer, index) => (
              <div key={`${customer.name}-${index}`} className="customer-value-item">
                <div className="customer-rank">{index + 1}</div>
                <div className="customer-info">
                  <div className="customer-name">{customer.name}</div>
                  <div className="customer-meta">{customer.orders} order{customer.orders === 1 ? '' : 's'} · {formatCurrency(customer.profit, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} profit</div>
                </div>
                <div className="customer-revenue">{formatCurrency(customer.revenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
            ))}
            {topCustomers.length === 0 && (
              <p className="no-data">No customer value data available</p>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3><PackageIcon /> Top Products</h3>
          <div className="top-products-list">
            {topProducts.map((product, index) => (
              <div key={index} className="top-product-item">
                <div className="product-rank">{index + 1}</div>
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-quantity">{new Intl.NumberFormat('en-US').format(product.quantity)} sold</div>
                </div>
                <div className="product-revenue">{formatCurrency(product.revenue, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</div>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="no-data">No product data available</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3><PieChartIcon /> Product Categories</h3>
          <div className="chart-container pie-chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
