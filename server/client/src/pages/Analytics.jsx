import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiShoppingCart, FiPackage, FiBarChart2, FiPieChart, FiCalendar } from 'react-icons/fi';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import './Analytics.css';

const Analytics = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [dateRange, setDateRange] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [ordersSnap, productsSnap] = await Promise.all([
        getDocs(query(collection(db, 'orders'), orderBy('order_date', 'desc'))),
        getDocs(collection(db, 'products'))
      ]);
      
      setOrders(ordersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        order_date: doc.data().order_date?.toDate?.() || new Date(doc.data().order_date)
      })));
      
      setProducts(productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  // Filter by date range
  const filterByDateRange = (items) => {
    const now = new Date();
    const daysAgo = new Date(now.setDate(now.getDate() - parseInt(dateRange)));
    return items.filter(item => new Date(item.order_date) >= daysAgo);
  };

  const filteredOrders = filterByDateRange(orders);

  // Calculate stats
  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.total_sales_price || 0), 0);
  const totalProfit = filteredOrders.reduce((sum, o) => sum + (o.total_profit || 0), 0);
  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Compare with previous period
  const getPreviousPeriodOrders = () => {
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
  const getSalesByDay = () => {
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
  };

  // Top products by revenue
  const getTopProducts = () => {
    const productSales = {};
    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const productId = item.product_id;
        if (!productSales[productId]) {
          productSales[productId] = { 
            name: item.product_name || 'Unknown', 
            revenue: 0, 
            quantity: 0 
          };
        }
        productSales[productId].revenue += (item.sales_price || 0) * (item.quantity || 0);
        productSales[productId].quantity += item.quantity || 0;
      });
    });
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // Category breakdown
  const getCategoryBreakdown = () => {
    const categories = {};
    products.forEach(product => {
      const cat = product.category || 'Uncategorized';
      if (!categories[cat]) {
        categories[cat] = { name: cat, value: 0 };
      }
      categories[cat].value += 1;
    });
    return Object.values(categories);
  };

  const COLORS = ['#2563eb', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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
        <div className="date-filter">
          <FiCalendar />
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="analytics-stats">
        <div className="stat-card border-blue">
          <div className="stat-header">
            <div className="stat-icon blue"><FiDollarSign /></div>
            <span className={`stat-change ${revenueChange >= 0 ? 'positive' : 'negative'}`}>
              {revenueChange >= 0 ? <FiTrendingUp /> : <FiTrendingDown />}
              {Math.abs(revenueChange).toFixed(1)}%
            </span>
          </div>
          <div className="stat-value">₦{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="stat-label">Total Revenue</div>
        </div>

        <div className="stat-card border-green">
          <div className="stat-header">
            <div className="stat-icon green"><FiTrendingUp /></div>
          </div>
          <div className="stat-value">₦{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="stat-label">Total Profit</div>
        </div>

        <div className="stat-card border-purple">
          <div className="stat-header">
            <div className="stat-icon purple"><FiShoppingCart /></div>
          </div>
          <div className="stat-value">{totalOrders}</div>
          <div className="stat-label">Total Orders</div>
        </div>

        <div className="stat-card border-orange">
          <div className="stat-header">
            <div className="stat-icon orange"><FiBarChart2 /></div>
          </div>
          <div className="stat-value">₦{avgOrderValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="stat-label">Avg. Order Value</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3><FiBarChart2 /> Revenue Over Time</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={getSalesByDay()}>
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
          <h3><FiTrendingUp /> Profit Trend</h3>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={getSalesByDay()}>
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

      {/* Bottom Row */}
      <div className="charts-grid">
        <div className="chart-card">
          <h3><FiPackage /> Top Products</h3>
          <div className="top-products-list">
            {getTopProducts().map((product, index) => (
              <div key={index} className="top-product-item">
                <div className="product-rank">{index + 1}</div>
                <div className="product-info">
                  <div className="product-name">{product.name}</div>
                  <div className="product-quantity">{product.quantity} sold</div>
                </div>
                <div className="product-revenue">₦{product.revenue.toLocaleString()}</div>
              </div>
            ))}
            {getTopProducts().length === 0 && (
              <p className="no-data">No product data available</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h3><FiPieChart /> Product Categories</h3>
          <div className="chart-container pie-chart">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={getCategoryBreakdown()}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {getCategoryBreakdown().map((entry, index) => (
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
