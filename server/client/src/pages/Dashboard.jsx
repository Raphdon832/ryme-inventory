import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '../api';
import { useSettings } from '../contexts/SettingsContext';
import { useUI } from '../contexts/UIContext';
import { SkeletonStatsGrid, SkeletonCard } from '../components/Skeleton';
import useScrollLock from '../hooks/useScrollLock';
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  Tooltip
} from 'recharts';
import {
  FiArrowUpRight,
  FiPlus,
  FiDownload,
  FiCheckCircle,
  FiShoppingCart,
  FiHash,
  FiRefreshCw,
  FiCpu,
  FiDollarSign,
  FiPieChart,
  FiEdit3
} from 'react-icons/fi';

const Dashboard = () => {
  const navigate = useNavigate();
  const { settings, formatCurrency } = useSettings();
  const { openTool } = useUI();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    totalProfit: 0,
    totalExpenses: 0,
    netProfit: 0,
    lowStockItems: [],
    revenueChart: [],
    topProducts: [],
    orders: [],
    products: []
  });

  const [showImportModal, setShowImportModal] = useState(false);
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState('');
  const [reorderStatus, setReorderStatus] = useState('');

  // Lock scroll when any modal is open
  useScrollLock(showImportModal);

  useEffect(() => {
    const unsubscribeProducts = api.subscribe('/products', (response) => {
      const products = response.data;
      setStats(prev => ({
        ...prev,
        products,
        totalProducts: products.length
      }));
      setLoading(false);
    });

    const unsubscribeOrders = api.subscribe('/orders', (response) => {
      const orders = response.data;
      
      const totalRevenue = orders.reduce((acc, order) => acc + order.total_sales_price, 0);
      const totalProfit = orders.reduce((acc, order) => acc + order.total_profit, 0);

      // Fetch expenses to calculate net profit
      api.get('/expenses')
        .then(res => {
          const totalExpenses = res.data.data.reduce((sum, item) => sum + item.amount, 0);
          setStats(prev => ({
            ...prev,
            totalRevenue,
            totalProfit,
            totalExpenses,
            netProfit: totalProfit - totalExpenses,
            totalOrders: orders.length,
            orders
          }));
        })
        .catch(err => {
          console.error("Dashboard: Error fetching expenses", err);
          setStats(prev => ({
            ...prev,
            totalRevenue,
            totalProfit,
            totalOrders: orders.length,
            orders
          }));
        });

      const revenueByDate = new Map();
      const productTotals = new Map();

      orders.forEach((order) => {
        const dateKey = order.order_date ? String(order.order_date).slice(0, 10) : 'unknown';
        const current = revenueByDate.get(dateKey) || { revenue: 0, profit: 0 };
        revenueByDate.set(dateKey, {
          revenue: current.revenue + Number(order.total_sales_price || 0),
          profit: current.profit + Number(order.total_profit || 0)
        });

        (order.items || []).forEach((item) => {
          const key = item.product_name || item.product_id;
          const totals = productTotals.get(key) || { name: item.product_name || 'Unknown', total_sold: 0, total_revenue: 0 };
          totals.total_sold += Number(item.quantity || 0);
          totals.total_revenue += Number(item.sales_price_at_time || 0) * Number(item.quantity || 0);
          productTotals.set(key, totals);
        });
      });

      const revenueChart = Array.from(revenueByDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, values]) => ({ date, revenue: values.revenue, profit: values.profit }));

      const topProducts = Array.from(productTotals.values())
        .sort((a, b) => b.total_sold - a.total_sold)
        .slice(0, 5);

      setStats(prev => ({
        ...prev,
        orders,
        totalOrders: orders.length,
        totalRevenue,
        totalProfit,
        revenueChart,
        topProducts
      }));
    });

    return () => {
      unsubscribeProducts();
      unsubscribeOrders();
    };
  }, []);

  const handleReorderTask = async () => {
    if (!lowStockItems.length) return;
    const item = lowStockItems[0];
    try {
      setReorderStatus('creating');
      await addDoc(collection(db, 'tasks'), {
        title: `Reorder ${item.name}`,
        description: `Low stock threshold reached. Current stock: ${item.stock_quantity}.`,
        priority: 'high',
        status: 'pending',
        dueDate: Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      setReorderStatus('created');
      setTimeout(() => setReorderStatus(''), 2000);
    } catch (error) {
      console.error('Error creating reorder task:', error);
      setReorderStatus('error');
      setTimeout(() => setReorderStatus(''), 2000);
    }
  };

  const chartData = useMemo(() => {
    if (!stats.revenueChart || stats.revenueChart.length === 0) {
      return [];
    }

    return stats.revenueChart.map((item, index) => {
      const date = item.date ? new Date(item.date) : null;
      const name = date && !Number.isNaN(date.valueOf())
        ? date.toLocaleDateString('en-US', { weekday: 'short' })
        : `Day ${index + 1}`;

      return {
        name,
        revenue: Number(item.revenue || 0)
      };
    });
  }, [stats.revenueChart]);

  const topProducts = stats.topProducts || [];
  const lowStockItems = useMemo(() => {
    const threshold = Number(settings.inventory.lowStockThreshold || 5);
    return (stats.products || []).filter(p => p.stock_quantity < threshold);
  }, [stats.products, settings.inventory.lowStockThreshold]);

  const recentOrders = useMemo(() => {
    if (!stats.orders || stats.orders.length === 0) return [];
    return [...stats.orders]
      .sort((a, b) => new Date(b.order_date) - new Date(a.order_date))
      .slice(0, 4);
  }, [stats.orders]);

  const stockValue = useMemo(() => {
    if (!stats.products || stats.products.length === 0) return 0;
    return stats.products.reduce((acc, product) => (
      acc + (product.cost_of_production * product.stock_quantity)
    ), 0);
  }, [stats.products]);

  const potentialRevenue = useMemo(() => {
    if (!stats.products || stats.products.length === 0) return 0;
    return stats.products.reduce((acc, product) => (
      acc + (product.sales_price * product.stock_quantity)
    ), 0);
  }, [stats.products]);

  const formatCurrencyCompact = (value) =>
    formatCurrency(value, { maximumFractionDigits: 0, minimumFractionDigits: 0 });

  const progressValue = stats.totalRevenue > 0
    ? Math.round((stats.totalProfit / stats.totalRevenue) * 100)
    : 0;

  return (
    <div className="dashboard-container">
      <div className="page-title page-title--with-actions">
        <div>
          <h1>Dashboard</h1>
          <p>Track stock levels, sales, and profit in one place.</p>
        </div>
        <div className="page-actions">
          <button className="add-btn-bordered btn-animate hover-lift" onClick={() => navigate('/inventory/add')}>
            <FiPlus size={16} className="icon-spin" /> Add Product
          </button>
          <button className="secondary btn-animate hover-lift" onClick={() => setShowImportModal(true)}>
            <FiDownload size={16} /> Import Products
          </button>
        </div>
      </div>

      {loading ? (
        <SkeletonStatsGrid count={4} />
      ) : (
      <div className="stats-grid bento-grid">
        <div className="stat-widget accent-blue animate-slide-up delay-100">
          <div className="stat-header">
            <span className="stat-label">Total Products</span>
            <span className="stat-arrow"><FiArrowUpRight /></span>
          </div>
          <div className="stat-value auto-fit">{new Intl.NumberFormat('en-US').format(stats.totalProducts)}</div>
          <div className="stat-footnote">Inventory count</div>
        </div>

        <div className="stat-widget accent-purple animate-slide-up delay-200">
          <div className="stat-header">
            <span className="stat-label">Total Orders</span>
            <span className="stat-arrow"><FiArrowUpRight /></span>
          </div>
          <div className="stat-value auto-fit">{new Intl.NumberFormat('en-US').format(stats.totalOrders)}</div>
          <div className="stat-footnote">Orders processed</div>
        </div>

        <div className="stat-widget accent-green animate-slide-up delay-300">
          <div className="stat-header">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-arrow"><FiArrowUpRight /></span>
          </div>
          <div className="stat-value auto-fit">{formatCurrencyCompact(stats.totalRevenue)}</div>
          <div className="stat-footnote">Total sales value</div>
        </div>

        <div className="stat-widget accent-orange animate-slide-up delay-400">
          <div className="stat-header">
            <span className="stat-label">Gross Profit</span>
            <span className="stat-arrow"><FiArrowUpRight /></span>
          </div>
          <div className="stat-value auto-fit">{formatCurrencyCompact(stats.totalProfit)}</div>
          <div className="stat-footnote">Before expenses</div>
        </div>

        <div className="stat-widget accent-red animate-slide-up delay-500">
          <div className="stat-header">
            <span className="stat-label">Total Expenses</span>
            <span className="stat-arrow"><FiArrowUpRight /></span>
          </div>
          <div className="stat-value auto-fit">{formatCurrencyCompact(stats.totalExpenses || 0)}</div>
          <div className="stat-footnote">Overheads & costs</div>
        </div>

        <div className="stat-widget accent-cyan animate-slide-up delay-600">
          <div className="stat-header">
            <span className="stat-label">Net Profit</span>
            <span className="stat-arrow"><FiArrowUpRight /></span>
          </div>
          <div className="stat-value auto-fit">{formatCurrencyCompact(stats.netProfit || 0)}</div>
          <div className="stat-footnote">Actual earnings</div>
        </div>
      </div>
      )}

      <div className="dashboard-grid animate-fade-in delay-200">
        <div className="card analytics-card hover-lift">
          <div className="card-header">
            <h3>Product Analytics</h3>
          </div>
          <div className="chart-container">
            {chartData.length === 0 ? (
              <div className="empty-state">No revenue data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={24}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(26, 93, 58, 0.08)' }}
                    contentStyle={{ borderRadius: 12, borderColor: 'var(--border-color)' }}
                  />
                  <Bar dataKey="revenue" fill="var(--primary-color)" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {settings.notifications.lowStockAlerts && (
          <div className="card reminder-card hover-lift">
            <div className="card-header">
              <h3>Low Stock Alert</h3>
            </div>
            <div className="reminder-content">
              {lowStockItems.length === 0 ? (
                <>
                  <h4>All items are stocked</h4>
                  <p>No low stock items at the moment.</p>
                </>
              ) : (
                <>
                  <h4 className="animate-pop-in">{lowStockItems[0].name}</h4>
                  <p>Only {lowStockItems[0].stock_quantity} units left</p>
                  <button
                    className="primary full btn-animate"
                    onClick={handleReorderTask}
                    disabled={reorderStatus === 'creating'}
                  >
                    {reorderStatus === 'creating'
                      ? 'Creating Task...'
                      : reorderStatus === 'created'
                        ? 'Task Created'
                        : 'Create Reorder Task'}
                  </button>
                  {reorderStatus === 'error' && (
                    <p style={{ color: 'var(--danger-text)', marginTop: '8px', fontSize: '12px' }}>
                      Failed to create task. Try again.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        <div className="card list-card hover-lift">
          <div className="card-header">
            <h3>Top Products</h3>
            <button className="chip-button btn-animate" onClick={() => navigate('/inventory')}>View All</button>
          </div>
          <div className="list-items">
            {topProducts.length === 0 ? (
              <div className="empty-state">No product sales yet.</div>
            ) : (
              topProducts.map((item, index) => (
                <div className="list-item list-item-hover animate-slide-up" style={{ animationDelay: `${index * 100}ms` }} key={`${item.name}-${index}`}>
                  <div className="list-icon">
                    <FiCheckCircle />
                  </div>
                  <div className="list-content">
                    <div className="list-title">{item.name}</div>
                    <div className="list-subtitle default-cursor">{item.total_sold} units sold</div>
                  </div>
                  <div className="list-meta">{formatCurrencyCompact(item.total_revenue)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid bottom-grid animate-fade-in delay-300">
        <div className="card recent-orders-card hover-lift">
          <div className="card-header">
            <h3>Recent Orders</h3>
            <button className="chip-button btn-animate" onClick={() => navigate('/orders')}>View All</button>
          </div>
          <div className="list-items">
            {recentOrders.length === 0 ? (
              <div className="empty-state">No orders yet.</div>
            ) : (
              recentOrders.map((order, index) => (
                <div className="list-item list-item-hover animate-slide-up" style={{ animationDelay: `${index * 100}ms` }} key={order.id}>
                  <div className="list-icon">
                    <FiShoppingCart />
                  </div>
                  <div className="list-content">
                    <div className="list-title">{order.customer_name}</div>
                    <div className="list-subtitle default-cursor">
                      {new Date(order.order_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="list-meta">{formatCurrencyCompact(order.total_sales_price)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card progress-card hover-lift">
          <div className="card-header">
            <h3>Product Margin</h3>
          </div>
          <div className="progress-wrapper">
            <div className="progress-ring" style={{ '--progress': `${progressValue}%` }} />
            <div className="progress-center">
              <div className="progress-value">{progressValue}%</div>
              <div className="progress-label">Profit Margin</div>
            </div>
          </div>
          <div className="progress-legend">
            <span className="legend-item">
              <span className="dot dot-complete" /> Profit
            </span>
            <span className="legend-item">
              <span className="dot dot-progress" /> Revenue
            </span>
            <span className="legend-item">
              <span className="dot dot-pending" /> Cost
            </span>
          </div>
        </div>

        <div className="card timer-card hover-lift">
          <div className="card-header">
            <h3>Inventory Value</h3>
          </div>
          <div className="timer-display">{formatCurrencyCompact(stockValue)}</div>
          <div className="timer-meta">
            Potential revenue: {formatCurrencyCompact(potentialRevenue)}
          </div>
        </div>
      </div>

      {/* Quick Tools Section */}
      <div className="card tools-card animate-fade-in delay-200" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h3>Quick Utility Tools</h3>
          <p className="card-subtitle">Fast access to business essentials</p>
        </div>
        <div className="tools-shortcuts">
          <button className="tool-shortcut btn-animate" onClick={() => openTool('calculator')}>
            <div className="tool-icon calc"><FiHash /></div>
            <span>Calculator</span>
          </button>
          <button className="tool-shortcut btn-animate" onClick={() => openTool('converter')}>
            <div className="tool-icon unit"><FiRefreshCw /></div>
            <span>Units</span>
          </button>
          <button className="tool-shortcut btn-animate" onClick={() => openTool('barcode')}>
            <div className="tool-icon asset"><FiCpu /></div>
            <span>Asset Tags</span>
          </button>
          <button className="tool-shortcut btn-animate" onClick={() => openTool('currency')}>
            <div className="tool-icon currency"><FiDollarSign /></div>
            <span>Currency</span>
          </button>
          <button className="tool-shortcut btn-animate" onClick={() => openTool('pricing')}>
            <div className="tool-icon pricing"><FiPieChart /></div>
            <span>Simulator</span>
          </button>
          <button className="tool-shortcut btn-animate" onClick={() => openTool('scratchpad')}>
            <div className="tool-icon scratch"><FiEdit3 /></div>
            <span>Scratchpad</span>
          </button>
        </div>
      </div>

      {showImportModal && (
        <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
          <div className="modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="card-header" style={{ marginBottom: '16px' }}>
              <h3>Import Products (CSV)</h3>
              <button className="chip-button" onClick={() => setShowImportModal(false)}>Close</button>
            </div>

            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Required columns: name, description, cost_of_production, stock_quantity, and either markup_percentage or markup_amount
            </p>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setImportError('');
                setImportRows([]);
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (e) => {
                  const text = String(e.target?.result || '');
                  const lines = text.split(/\r?\n/).filter(Boolean);
                  if (lines.length < 2) {
                    setImportError('CSV needs at least a header row and one data row.');
                    return;
                  }

                  const headers = lines[0].split(',').map(h => h.trim());
                  const requiredBase = ['name', 'description', 'cost_of_production', 'stock_quantity'];
                  const missingBase = requiredBase.filter(r => !headers.includes(r));
                  if (missingBase.length > 0) {
                    setImportError(`Missing columns: ${missingBase.join(', ')}`);
                    return;
                  }

                  const hasMarkupPercent = headers.includes('markup_percentage');
                  const hasMarkupAmount = headers.includes('markup_amount');
                  if (!hasMarkupPercent && !hasMarkupAmount) {
                    setImportError('CSV must include markup_percentage or markup_amount column.');
                    return;
                  }

                  const rows = lines.slice(1).map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const row = {};
                    headers.forEach((h, idx) => { row[h] = values[idx]; });
                    return row;
                  });

                  setImportRows(rows);
                };
                reader.readAsText(file);
              }}
            />

            {importError && (
              <div className="empty-state" style={{ marginTop: '16px', color: 'var(--danger-text)' }}>
                {importError}
              </div>
            )}

            {importRows.length > 0 && (
              <div style={{ marginTop: '16px' }}>
                <div className="flex justify-between" style={{ marginBottom: '12px' }}>
                  <span>Preview ({importRows.length} rows)</span>
                  <button
                    className="primary"
                    onClick={async () => {
                      try {
                        for (const row of importRows) {
                          await api.post('/products', {
                            name: row.name,
                            description: row.description,
                            cost_of_production: Number(row.cost_of_production),
                            markup_percentage: row.markup_percentage,
                            markup_amount: row.markup_amount,
                            stock_quantity: Number(row.stock_quantity)
                          });
                        }
                        setShowImportModal(false);
                        fetchStats();
                      } catch (error) {
                        setImportError('Import failed. Please check your CSV values.');
                        console.error(error);
                      }
                    }}
                  >
                    Import Now
                  </button>
                </div>
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Cost</th>
                        <th>Markup</th>
                        <th>Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 5).map((row, index) => (
                        <tr key={index}>
                          <td>{row.name}</td>
                          <td>{row.description}</td>
                          <td>{row.cost_of_production}</td>
                          <td>{row.markup_amount || row.markup_percentage}</td>
                          <td>{row.stock_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
