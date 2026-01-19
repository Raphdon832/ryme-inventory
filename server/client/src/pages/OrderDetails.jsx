import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiCalendar, FiPackage, FiTag, FiTrendingUp, FiPrinter, FiShare2, FiDownload, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../contexts/SettingsContext';
import './OrderDetails.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = api.subscribe(`/orders/${id}`, (response) => {
        setOrder(response.data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  const handleMarkAsPaid = async () => {
    if (!order) return;
    if (window.confirm('Are you sure you want to mark this order as paid? This will deduct the items from stock.')) {
        try {
            setLoading(true);
            await api.put(`/orders/${id}`, { action: 'mark_paid' });
            // State update handled by snapshot
            alert('Order marked as paid successfully!');
        } catch (error) {
            console.error('Error marking order as paid:', error);
            alert(error.response?.data?.message || 'Failed to mark order as paid');
        } finally {
            setLoading(false);
        }
    }
  };

  const handlePrintInvoice = async () => {
    if (!order) return;
    
    // Load Logo
    const loadImage = (url) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => resolve(img);
            img.onerror = reject;
        });
    };

    let logoImg = null;
    try {
        logoImg = await loadImage('/RymeLogoPDF.png');
    } catch (error) {
        console.error("Failed to load logo", error);
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Theme Colors
    const primaryColor = [20, 20, 20]; // Almost Black
    const secondaryColor = [100, 100, 100]; // Dark Gray
    const lightGray = [248, 249, 250]; // Very Light Gray for Headers
    const textGray = [156, 163, 175]; // Light Text Gray for labels
    
    // Config
    const config = {
      companyName: "Ryme Interiors", 
    };

    // --- Header ---
    // Logo
    if (logoImg) {
        const logoWidth = 40; 
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', 20, 12, logoWidth, logoHeight);
    } else {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text(config.companyName, 20, 26);
    }

    // Invoice Number - "Sales Invoice" for paid orders, "Invoice" for pending
    const isPaid = order.payment_status === 'Paid';
    const invoicePrefix = isPaid ? 'Sales Invoice' : 'Invoice';
    let invoiceNum = `${invoicePrefix} 000`;
    if (order.id) {
        // Generate a clean invoice number format like INV YYYYMM-00-HASH
        const datePart = new Date(order.order_date).toISOString().slice(0, 7).replace('-', ''); // YYYYMM
        const idHash = order.id.slice(0, 2).toUpperCase() + order.id.slice(-2).toUpperCase();
        invoiceNum = `${invoicePrefix} ${datePart}-00-${idHash}`;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text(invoiceNum, pageWidth - 20, 26, { align: 'right' });

    // Line Divider
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35);

    // --- Info Section ---
    const startY = 50;
    const col2X = pageWidth / 2 + 10;
    
    doc.setFontSize(9);
    
    // Row 1: Date & Currency
    // Label - Date
    doc.setTextColor(...textGray);
    doc.text('Date', 20, startY);
    // Value
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    const orderDate = new Date(order.order_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(orderDate, 20, startY + 6);

    // Label - Currency (Moved from Row 2)
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textGray);
    doc.text('Currency', col2X, startY);
    // Value
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('NGN - Nigerian Naira', col2X, startY + 6);

    // Row 2: Billed To (Currency Removed)
    const row2Y = startY + 20;
    
    // Label - Billed To
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textGray);
    doc.text('Billed To', 20, row2Y);
    // Value
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(order.customer_name || 'Guest', 20, row2Y + 6);
    
    // Billed To Address (Regular font, smaller)
    if (order.customer_address) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...secondaryColor);
        // Wrap text if needed
        const splitAddress = doc.splitTextToSize(order.customer_address, 70);
        doc.text(splitAddress, 20, row2Y + 11);
        doc.setFontSize(9); // Reset size
    }
    
    // Currency was here - now removed

    // --- Table ---
    const tableStartY = row2Y + 30;
    
    // Check if any item has a discount to dynamically add column
    const hasItemDiscounts = order.items.some(item => (item.discount_percentage || 0) > 0);
    
    // Updated: Added S/N column and Discount column if needed
    const tableColumn = hasItemDiscounts 
        ? ["S/N", "ITEM", "QTY", "RATE", "DISC.", "AMOUNT"]
        : ["S/N", "ITEM", "QTY", "RATE", "AMOUNT"];
        
    const tableRows = [];

    // Helper to sanitize currency for PDF (removes unsupported symbols like ₦)
    const safeCurrency = (val) => {
        const formatted = formatCurrency(val);
        return formatted.replace(/[^\x00-\x7F]/g, "N"); // Replace non-ascii with N
    };

    order.items.forEach((item, index) => {
      const discount = item.discount_percentage || 0;
      const effectiveTotal = (item.sales_price_at_time * (1 - discount / 100)) * item.quantity;
      
      const itemData = [
        index + 1, // S/N
        item.product_name, // Removed sorting code from invoice name
        item.quantity,
        safeCurrency(item.sales_price_at_time),
      ];

      if (hasItemDiscounts) {
          itemData.push(""); // Placeholder for Disc column (drawn manually)
      }

      itemData.push(safeCurrency(effectiveTotal));
      tableRows.push(itemData);
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [tableColumn],
      body: tableRows,
      theme: 'plain',
      margin: { left: 15, right: 15 }, // Reduced margins for wider table
      styles: {
        fontSize: 9,
        cellPadding: 2, // Reduced padding significantly (was 8) to prevent wrapping
        textColor: primaryColor,
        font: 'helvetica',
        valign: 'middle',
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: lightGray,
        textColor: textGray,
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left',
        cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } // specific padding for header
      },
      bodyStyles: {
        lineWidth: 0,
        minCellHeight: 10, // Ensure rows aren't too squashed vertically
      },
      columnStyles: hasItemDiscounts ? {
        0: { cellWidth: 8, halign: 'center', textColor: secondaryColor }, // S/N
        1: { cellWidth: 'auto', fontStyle: 'bold' }, // Item
        2: { cellWidth: 12, halign: 'center', textColor: secondaryColor }, // Qty
        3: { cellWidth: 30, halign: 'right', textColor: secondaryColor }, // Rate
        4: { cellWidth: 15, halign: 'center' }, // Disc
        5: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }, // Amount
      } : {
        0: { cellWidth: 10, halign: 'center', textColor: secondaryColor }, // S/N
        1: { cellWidth: 'auto', fontStyle: 'bold' }, // Item
        2: { cellWidth: 15, halign: 'center', textColor: secondaryColor }, // Qty
        3: { cellWidth: 35, halign: 'right', textColor: secondaryColor }, // Rate
        4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }, // Amount
      },
      didParseCell: (data) => {
        // Custom alignment for header
        if (data.section === 'head') {
            if (data.column.index === 0 || data.column.index === 2) data.cell.styles.halign = 'center';
            if (hasItemDiscounts) {
                 if (data.column.index === 3 || data.column.index === 5) data.cell.styles.halign = 'right';
                 if (data.column.index === 4) data.cell.styles.halign = 'center';
            } else {
                 if (data.column.index === 3 || data.column.index === 4) data.cell.styles.halign = 'right';
            }
        }
      },
      didDrawCell: (data) => {
        // Draw badge in Discount column if applicable
        if (hasItemDiscounts && data.section === 'body' && data.column.index === 4) {
            const item = order.items[data.row.index];
            if (item && item.discount_percentage > 0) {
                 const badgeText = `-${item.discount_percentage}%`;
                 const fontSize = 4; 
                 doc.setFontSize(fontSize);
                 doc.setFont('helvetica', 'bold');
                 
                 const textWidth = doc.getTextWidth(badgeText);
                 const paddingX = 1; 
                 const badgeWidth = textWidth + (paddingX * 2);
                 const badgeHeight = fontSize + 1.5; 
                 const radius = badgeHeight / 2; 
                 
                 // Center in cell
                 const badgeX = data.cell.x + (data.cell.width / 2) - (badgeWidth / 2);
                 const badgeY = data.cell.y + (data.cell.height / 2) - (badgeHeight / 2);
                 
                 doc.setFillColor(16, 185, 129); // Green background
                 doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, radius, radius, 'F');
                 
                 doc.setTextColor(255, 255, 255); // White text
                 const textX = badgeX + (badgeWidth / 2);
                 const textY = badgeY + (badgeHeight / 2);
                 doc.text(badgeText, textX, textY, { align: 'center', baseline: 'middle' });
            } else {
                // Optional: Draw a subtle dash for items without discount
                doc.setFontSize(8);
                doc.setTextColor(...secondaryColor);
                const dashText = "-";
                const dashWidth = doc.getTextWidth(dashText);
                doc.text(dashText, data.cell.x + (data.cell.width / 2) - (dashWidth / 2), data.cell.y + (data.cell.height / 2) + 1);
            }
        }
      }
    });
    
    // --- Totals Section ---
    const totalsRightMargin = pageWidth - 20;
    const totalsLabelX = totalsRightMargin - 50;
    let currentY = doc.lastAutoTable.finalY + 15;
    
    // Helper to draw total rows
    const drawTotalRow = (label, valueRaw, isBold = false, isHeavy = false, isDiscount = false) => {
        doc.setFontSize(isHeavy ? 11 : 9);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        
        // Label
        doc.setTextColor(...(isBold ? primaryColor : secondaryColor));
        doc.text(label, totalsLabelX, currentY, { align: 'right' });
        
        // Value (cleaned)
        // If valueRaw is a number, format it. If string, use as is (sanitized)
        let displayValue = typeof valueRaw === 'number' ? safeCurrency(valueRaw) : valueRaw.replace(/[^\x00-\x7F]/g, "N");

        doc.setTextColor(...(isDiscount ? [239, 68, 68] : primaryColor)); // Red for discount
        doc.text(displayValue, totalsRightMargin, currentY, { align: 'right' });
        
        currentY += 8; // Spacing per row
    };

    // Subtotal
    const subtotal = order.subtotal || order.total_sales_price;
    drawTotalRow('Sub total', subtotal);
    
    // Discount
    if (order.discount && order.discount.value > 0) {
        const total = order.total_sales_price;
        const discountAmount = subtotal - total;
        if (discountAmount > 0) {
             drawTotalRow(`Discount`, `-${safeCurrency(discountAmount)}`, false, false, true);
        }
    }
    
    // Visual Line before Total
    currentY += 2;
    doc.setDrawColor(240, 240, 240);
    doc.line(totalsRightMargin - 70, currentY - 6, totalsRightMargin, currentY - 6);
    
    // Total
    drawTotalRow('Total', order.total_sales_price, true, false);
    
    // Amount Due (Grand Total)
    drawTotalRow('Amount due', order.total_sales_price, true, true);

    
    // --- Footer Notes ---
    const footerY = pageHeight - 35;
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...primaryColor);
    doc.text('*Notes:', 20, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    // Removed specific return policy note and attachment box
    
    doc.save(`invoice_${invoiceNum.replace(/\s/g, '_')}.pdf`);
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
              <span className="stat-value">{formatCurrency(order.total_sales_price || 0)}</span>
              <span className="stat-label">Total Revenue</span>
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-icon profit">
              <FiTrendingUp />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(order.total_profit || 0)}</span>
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
                      {formatCurrency(costPerUnit)}
                    </td>
                    <td>
                      {formatCurrency(item.sales_price_at_time || 0)}
                    </td>
                    <td className="font-semibold">
                      {formatCurrency(totalPrice)}
                    </td>
                    <td>
                      <span className="profit-value">{formatCurrency(totalProfit, { showSign: true })}</span>
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
            <span>{formatCurrency(order.subtotal || order.total_sales_price || 0)}</span>
          </div>

          {order.subtotal && order.discount && order.discount.type !== 'none' && (
             <div className="totals-row" style={{ color: '#ef4444' }}>
                <span>Discount {order.discount.type === 'percentage' ? `(${order.discount.value}%)` : ''}</span>
               <span>-{formatCurrency(order.subtotal - order.total_sales_price)}</span>
             </div>
          )}

          <div className="totals-row">
            <span>Total Cost of Production</span>
            <span className="text-muted">
              {formatCurrency((order.total_sales_price || 0) - (order.total_profit || 0))}
            </span>
          </div>
          <div className="totals-row total-profit">
            <span>Total Profit</span>
            <span className="profit-amount">{formatCurrency(order.total_profit || 0, { showSign: true })}</span>
          </div>
          <div className="totals-row grand-total">
            <span>Grand Total</span>
            <span>{formatCurrency(order.total_sales_price || 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
