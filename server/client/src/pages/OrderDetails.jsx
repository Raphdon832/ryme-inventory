import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiCalendar, FiPackage, FiTag, FiTrendingUp, FiPrinter, FiShare2, FiDownload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './OrderDetails.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrderDetails = async () => {
      try {
        const response = await api.get(`/orders/${id}`);
        setOrder(response.data.data);
      } catch (error) {
        console.error('Error fetching order details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetails();
  }, [id]);

  const handleMarkAsPaid = async () => {
    if (!order) return;
    if (window.confirm('Are you sure you want to mark this order as paid? This will deduct the items from stock.')) {
        try {
            setLoading(true);
            const response = await api.put(`/orders/${id}`, { action: 'mark_paid' });
            
            if (response.data.success) {
                // Update local state
                setOrder(prev => ({
                    ...prev,
                    payment_status: 'Paid',
                    paid_at: new Date().toISOString()
                }));
                alert('Order marked as paid successfully!');
            }
        } catch (error) {
            console.error('Error marking order as paid:', error);
            alert(error.response?.data?.message || 'Failed to mark order as paid');
        } finally {
            setLoading(false);
        }
    }
  };

  const handlePrintInvoice = () => {
    if (!order) return;
    
    const doc = new jsPDF();
    
    // Config
    const pageWidth = doc.internal.pageSize.getWidth();
    const config = {
      companyName: "Ryme Interiors",
      // Add logo data URL here if needed, for instance:
      // logoUrl: "data:image/png;base64,...",
    };

    // Header
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('INVOICE', pageWidth - 20, 20, { align: 'right' });
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0); // Black for B&W theme
    doc.text(config.companyName, 20, 20);
    
    // Line Separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 30, pageWidth - 20, 30);
    
    // Invoice # Generation (Hash ID to 7 digits for display if not numeric)
    // Simple hash to number: sum of char codes % 10000000
    // Or just use timestamp part:
    let invoiceNum = "0000000";
    if (order.id) {
        // Just take last 7 numeric chars if exist, otherwise hash
        // Simple consistent number from string ID
        let hash = 0;
        for (let i = 0; i < order.id.length; i++) {
            hash = ((hash << 5) - hash) + order.id.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        invoiceNum = String(Math.abs(hash)).slice(0, 7).padStart(7, '0');
    }

    // Order Info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    
    const rightColX = pageWidth - 20;
    
    // Left Side: Customer Info
    doc.text(`Bill To:`, 20, 45);
    doc.setFont('helvetica', 'bold');
    doc.text(order.customer_name || 'Guest', 20, 50);
    doc.setFont('helvetica', 'normal');
    if (order.customer_address) {
        // Wrap text if address is long
        const splitAddress = doc.splitTextToSize(order.customer_address, 80);
        doc.text(splitAddress, 20, 55);
    }

    // Right Side: Invoice Meta
    doc.text(`Invoice #:`, rightColX - 30, 45, { align: 'right' });
    doc.text(invoiceNum, rightColX, 45, { align: 'right' });
    
    doc.text(`Date:`, rightColX - 30, 50, { align: 'right' });
    doc.text(new Date(order.order_date).toLocaleDateString(), rightColX, 50, { align: 'right' });

    // Table
    const tableColumn = ["S/N", "Product", "Qty", "Unit Price", "Total"];
    const tableRows = [];

    order.items.forEach((item, index) => {
      const itemData = [
        index + 1,
        item.product_name,
        item.quantity,
        `N${item.sales_price_at_time.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
        `N${(item.sales_price_at_time * item.quantity).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
      ];
      tableRows.push(itemData);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 75, // Moved down to accommodate address
      theme: 'grid',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] }, // Dark Gray for B&W theme
      styles: { fontSize: 9, textColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 15 }, // S/N column
        3: { halign: 'right' },
        4: { halign: 'right' }
      }
    });
    
    // Totals
    const finalY = (doc).lastAutoTable.finalY + 15;
    const rightMargin = pageWidth - 20;
    
    doc.setFontSize(10);
    
    if (order.subtotal) {
        doc.text(`Subtotal: N${order.subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightMargin, finalY, { align: 'right' });
        
        if (order.discount && order.discount.type !== 'none') {
             const discountAmount = order.subtotal - order.total_sales_price;
             doc.setTextColor(0, 0, 0); // Black for B&W theme
             doc.text(`Discount: -N${discountAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightMargin, finalY + 6, { align: 'right' });
             doc.setTextColor(60, 60, 60); // Reset
        }
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: N${order.total_sales_price.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightMargin, finalY + 14, { align: 'right' });
    } else {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total: N${order.total_sales_price.toLocaleString(undefined, {minimumFractionDigits: 2})}`, rightMargin, finalY + 10, { align: 'right' });
    }

    // save using the 7 digit number
    doc.save(`invoice_${invoiceNum}.pdf`);
  };

  if (loading) {
    return (
      <div className="order-details-loading">
        <div className="loading-spinner"></div>
        <p>Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-details-error">
        <h2>Order not found</h2>
        <p>The order you're looking for doesn't exist or has been removed.</p>
        <button className="btn-primary" onClick={() => navigate('/orders')}>
          Back to Orders
        </button>
      </div>
    );
  }

  const profitMargin = order.total_sales_price > 0 
    ? ((order.total_profit / order.total_sales_price) * 100).toFixed(1) 
    : 0;

  return (
    <div className="order-details-page">
      {/* Header Section */}
      <div className="order-details-header">
        <Link to="/orders" className="back-link">
          <FiArrowLeft />
          <span>Back to Orders</span>
        </Link>
        
        <div className="header-actions">
          {order.payment_status !== 'Paid' && (
            <button 
              className="btn-primary" 
              onClick={handleMarkAsPaid} 
              style={{ marginRight: '8px', backgroundColor: '#F59E0B' }}
              title="Mark order as paid and deduct stock"
            >
              <FiCheckCircle size={18} />
              <span>Mark as Paid</span>
            </button>
          )}
          <button className="btn-primary" title="Download Invoice" onClick={handlePrintInvoice} style={{ marginRight: '8px' }}>
            <FiDownload size={18} />
            <span>Download Invoice</span>
          </button>
          <button className="btn-icon" title="Share" style={{ width: '42px', height: '42px' }}>
            <FiShare2 />
          </button>
        </div>
      </div>

      {/* Order Info Card */}
      <div className="order-info-card">
        <div className="order-info-main">
          <div className="order-badge">ORDER</div>
          <h1 className="order-number">#{String(order.id).padStart(4, '0')}</h1>
          <div className="order-meta">
            <div className="meta-item">
              <span className={`badge ${order.payment_status === 'Paid' ? 'badge-success' : 'badge-warning'}`} 
                style={{ 
                  backgroundColor: order.payment_status === 'Paid' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                  color: order.payment_status === 'Paid' ? '#10B981' : '#F59E0B',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: `1px solid ${order.payment_status === 'Paid' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`
                }}>
                {order.payment_status === 'Paid' ? <FiCheckCircle /> : <FiAlertCircle />}
                <span>Status: {order.payment_status || 'Paid'}</span>
              </span>
            </div>
            <div className="meta-item">
              <FiCalendar className="meta-icon" />
              <span>{new Date(order.order_date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="meta-item">
              <FiUser className="meta-icon" />
              <span>{order.customer_name}</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="order-summary-stats">
          <div className="summary-stat">
            <div className="stat-icon items">
              <FiPackage />
            </div>
            <div className="stat-content">
              <span className="stat-value">{order.items?.length || 0}</span>
              <span className="stat-label">Items</span>
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-icon revenue">
              <FiTag />
            </div>
            <div className="stat-content">
              <span className="stat-value">₦{order.total_sales_price?.toFixed(2) || '0.00'}</span>
              <span className="stat-label">Total Revenue</span>
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-icon profit">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <span className="stat-value">₦{order.total_profit?.toFixed(2) || '0.00'}</span>
              <span className="stat-label">Total Profit ({profitMargin}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items Table */}
      <div className="order-items-card">
        <div className="card-header">
          <h2>Order Items</h2>
        </div>
        
        <div className="table-container">
          <table className="order-items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Cost of Production</th>
                <th>Unit Price</th>
                <th>Total Price</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {order.items?.map((item, index) => {
                const totalPrice = item.sales_price_at_time * item.quantity;
                const totalProfit = item.profit_at_time * item.quantity;
                const costPerUnit = item.sales_price_at_time - item.profit_at_time;
                
                return (
                  <tr key={item.id || index}>
                    <td>
                      <div className="product-cell">
                        <div className="product-avatar">
                          {item.product_name?.charAt(0) || 'P'}
                        </div>
                        <span className="product-name">{item.product_name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="quantity-badge">{item.quantity}</span>
                    </td>
                    <td className="text-muted">
                      ₦{costPerUnit.toFixed(2)}
                    </td>
                    <td>
                      ₦{item.sales_price_at_time?.toFixed(2) || '0.00'}
                    </td>
                    <td className="font-semibold">
                      ₦{totalPrice.toFixed(2)}
                    </td>
                    <td>
                      <span className="profit-value">+₦{totalProfit.toFixed(2)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Order Totals */}
        <div className="order-totals">
          <div className="totals-row">
            <span>Subtotal</span>
            <span>₦{(order.subtotal || order.total_sales_price)?.toFixed(2)}</span>
          </div>

          {order.subtotal && order.discount && order.discount.type !== 'none' && (
             <div className="totals-row" style={{ color: '#ef4444' }}>
                <span>Discount {order.discount.type === 'percentage' ? `(${order.discount.value}%)` : ''}</span>
                <span>-₦{(order.subtotal - order.total_sales_price).toFixed(2)}</span>
             </div>
          )}

          <div className="totals-row">
            <span>Total Cost of Production</span>
            <span className="text-muted">
              ₦{((order.total_sales_price || 0) - (order.total_profit || 0)).toFixed(2)}
            </span>
          </div>
          <div className="totals-row total-profit">
            <span>Total Profit</span>
            <span className="profit-amount">+₦{order.total_profit?.toFixed(2) || '0.00'}</span>
          </div>
          <div className="totals-row grand-total">
            <span>Grand Total</span>
            <span>₦{order.total_sales_price?.toFixed(2) || '0.00'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
