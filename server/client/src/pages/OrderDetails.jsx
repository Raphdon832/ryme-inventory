import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ProfileIcon,
  CalendarIcon,
  PackageIcon,
  TagsIcon,
  TrendingUpIcon,
  PrintIcon,
  ShareIcon,
  DownloadIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  CheckIcon,
  CopyIcon,
  EditIcon
} from '../components/CustomIcons';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../components/Toast';
import soundManager from '../utils/soundManager';
import { usePageState } from '../hooks/usePageState';
import './OrderDetails.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency } = useSettings();
  const toast = useToast();

  // Persist scroll position
  usePageState('orderDetails', {}, { persistScroll: true, scrollContainerSelector: '.main-content' });

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = api.subscribe(`/orders/${id}`, (response) => {
        setOrder(response.data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);

  // Close share menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showShareMenu && !e.target.closest('.share-button-container')) {
        setShowShareMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  const handleMarkAsPaid = async () => {
    if (!order) return;
    if (window.confirm('Are you sure you want to mark this order as paid? This will deduct the items from stock.')) {
        try {
            setLoading(true);
            await api.put(`/orders/${id}`, { action: 'mark_paid' });
            toast.success('Order marked as paid successfully!');
            soundManager.playSuccess();
        } catch (error) {
            console.error('Error marking order as paid:', error);
            toast.error(error.response?.data?.message || 'Failed to mark order as paid');
            soundManager.playError();
        } finally {
            setLoading(false);
        }
    }
  };

  const getShareText = () => {
    if (!order) return '';
    const isPaid = order.payment_status === 'Paid';
    const status = isPaid ? '✅ PAID' : '⏳ Pending';
    const items = order.items?.map(item => `  • ${item.product_name} x${item.quantity}`).join('\n') || '';
    const grandTotal = (order.total_sales_price || 0) + (order.vat_amount || 0);
    
    let totalSection = '';
    if (order.include_vat && order.vat_amount > 0) {
      totalSection = `💰 Subtotal: ${formatCurrency(order.total_sales_price)}
📊 VAT (7.5%): ${formatCurrency(order.vat_amount)}
💵 Total: ${formatCurrency(grandTotal)}`;
    } else {
      totalSection = `💰 Total: ${formatCurrency(order.total_sales_price)}`;
    }
    
    return `📦 Order #${order.id?.slice(0, 8).toUpperCase()}
━━━━━━━━━━━━━━━━━━━━
👤 Customer: ${order.customer_name}
📅 Date: ${new Date(order.order_date).toLocaleDateString()}
💳 Status: ${status}

🛒 Items:
${items}

${totalSection}
━━━━━━━━━━━━━━━━━━━━
Sent from Ryme Inventory`;
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateInvoicePDF = async () => {
    if (!order) return null;
    
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

    const isPaid = order.payment_status === 'Paid';
    const invoicePrefix = isPaid ? 'Sales Invoice' : 'Invoice';
    let invoiceNum = `${invoicePrefix} 000`;
    if (order.id) {
        const datePart = new Date(order.order_date).toISOString().slice(0, 7).replace('-', '');
        const idHash = order.id.slice(0, 2).toUpperCase() + order.id.slice(-2).toUpperCase();
        invoiceNum = `${invoicePrefix} ${datePart}-00-${idHash}`;
    }
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryColor);
    doc.text(invoiceNum, pageWidth - 20, 26, { align: 'right' });

    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 35, pageWidth - 20, 35);

    const startY = 50;
    const col2X = pageWidth / 2 + 10;
    
    doc.setFontSize(9);
    doc.setTextColor(...textGray);
    doc.text('Date', 20, startY);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    const orderDate = new Date(order.order_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.text(orderDate, 20, startY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textGray);
    doc.text('Currency', col2X, startY);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text('NGN - Nigerian Naira', col2X, startY + 6);

    const row2Y = startY + 20;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textGray);
    doc.text('Billed To', 20, row2Y);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.text(order.customer_name || 'Guest', 20, row2Y + 6);
    
    if (order.customer_address) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...secondaryColor);
        const splitAddress = doc.splitTextToSize(order.customer_address, 70);
        doc.text(splitAddress, 20, row2Y + 11);
        doc.setFontSize(9);
    }

    const tableStartY = row2Y + 30;
    const hasItemDiscounts = order.items.some(item => (item.discount_percentage || 0) > 0);
    const tableColumn = hasItemDiscounts 
        ? ["S/N", "ITEM", "QTY", "RATE", "SUBTOTAL", "DISC.", "FINAL"]
        : ["S/N", "ITEM", "QTY", "RATE", "AMOUNT"];
        
    const tableRows = [];
    const safeCurrency = (val) => formatCurrency(val).replace(/[^\x00-\x7F]/g, "N");

    order.items.forEach((item, index) => {
      const discount = item.discount_percentage || 0;
      const originalTotal = item.sales_price_at_time * item.quantity;
      const effectiveTotal = (item.sales_price_at_time * (1 - discount / 100)) * item.quantity;
      const itemData = [index + 1, item.product_name, item.quantity, safeCurrency(item.sales_price_at_time)];
      if (hasItemDiscounts) {
        itemData.push(safeCurrency(originalTotal));
        itemData.push(""); // Placeholder for Disc column
      }
      itemData.push(safeCurrency(effectiveTotal));
      tableRows.push(itemData);
    });

    autoTable(doc, {
      startY: tableStartY,
      head: [tableColumn],
      body: tableRows,
      theme: 'plain',
      margin: { left: 15, right: 15 },
      styles: { fontSize: 9, cellPadding: 2, textColor: primaryColor, font: 'helvetica', valign: 'middle', overflow: 'linebreak' },
      headStyles: { fillColor: lightGray, textColor: textGray, fontSize: 8, fontStyle: 'bold', halign: 'left', cellPadding: { top: 4, bottom: 4, left: 2, right: 2 } },
      bodyStyles: { lineWidth: 0, minCellHeight: 10 },
      columnStyles: hasItemDiscounts ? {
        0: { cellWidth: 8, halign: 'center', textColor: secondaryColor },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 10, halign: 'center', textColor: secondaryColor },
        3: { cellWidth: 22, halign: 'right', textColor: secondaryColor },
        4: { cellWidth: 28, halign: 'right', textColor: secondaryColor },
        5: { cellWidth: 14, halign: 'center' },
        6: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      } : {
        0: { cellWidth: 10, halign: 'center', textColor: secondaryColor },
        1: { cellWidth: 'auto', fontStyle: 'bold' },
        2: { cellWidth: 15, halign: 'center', textColor: secondaryColor },
        3: { cellWidth: 35, halign: 'right', textColor: secondaryColor },
        4: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
      },
      didParseCell: (data) => {
        if (data.section === 'head') {
            if (data.column.index === 0 || data.column.index === 2) data.cell.styles.halign = 'center';
            if (hasItemDiscounts) {
                 if (data.column.index === 3 || data.column.index === 4 || data.column.index === 6) data.cell.styles.halign = 'right';
                 if (data.column.index === 5) data.cell.styles.halign = 'center';
            } else {
                 if (data.column.index === 3 || data.column.index === 4) data.cell.styles.halign = 'right';
            }
        }
      },
      didDrawCell: (data) => {
        if (hasItemDiscounts && data.section === 'body' && data.column.index === 5) {
            const item = order.items[data.row.index];
            if (item && item.discount_percentage > 0) {
                 const badgeText = `-${item.discount_percentage}%`;
                 const fontSize = 5; 
                 doc.setFontSize(fontSize);
                 doc.setFont('helvetica', 'bold');
                 const textWidth = doc.getTextWidth(badgeText);
                 const padding = 0.3; 
                 const badgeSize = Math.max(textWidth + (padding * 2), fontSize + 1);
                 const radius = badgeSize / 1.0; 
                 const badgeX = data.cell.x + (data.cell.width / 2) - (badgeSize / 2);
                 const badgeY = data.cell.y + (data.cell.height / 2) - (badgeSize / 2);
                 doc.setFillColor(16, 185, 129);
                 doc.roundedRect(badgeX, badgeY, badgeSize, badgeSize, radius, radius, 'F');
                 doc.setTextColor(255, 255, 255);
                 const textX = badgeX + (badgeSize / 2);
                 const textY = badgeY + (badgeSize / 2);
                 doc.text(badgeText, textX, textY, { align: 'center', baseline: 'middle' });
            } else {
                doc.setFontSize(8);
                doc.setTextColor(...secondaryColor);
                const dashText = "-";
                const dashWidth = doc.getTextWidth(dashText);
                doc.text(dashText, data.cell.x + (data.cell.width / 2) - (dashWidth / 2), data.cell.y + (data.cell.height / 2) + 1);
            }
        }
      }
    });
    
    const totalsRightMargin = pageWidth - 20;
    const totalsLabelX = totalsRightMargin - 50;
    let currentY = doc.lastAutoTable.finalY + 15;
    
    const drawTotalRow = (label, valueRaw, isBold = false, isHeavy = false, isDiscount = false) => {
        doc.setFontSize(isHeavy ? 11 : 9);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(...(isBold ? primaryColor : secondaryColor));
        doc.text(label, totalsLabelX, currentY, { align: 'right' });
        let displayValue = typeof valueRaw === 'number' ? safeCurrency(valueRaw) : valueRaw.replace(/[^\x00-\x7F]/g, "N");
        doc.setTextColor(...(isDiscount ? [239, 68, 68] : primaryColor));
        doc.text(displayValue, totalsRightMargin, currentY, { align: 'right' });
        currentY += 8;
    };

    const subtotal = order.subtotal || order.total_sales_price;
    drawTotalRow('Sub total', subtotal);
    
    if (order.discount && order.discount.value > 0) {
        const total = order.total_sales_price;
        const discountAmount = subtotal - total;
        if (discountAmount > 0) {
             drawTotalRow(`Discount`, `-${safeCurrency(discountAmount)}`, false, false, true);
        }
    }
    
    if (order.include_vat && order.vat_amount > 0) {
        drawTotalRow('VAT (7.5%)', order.vat_amount);
    }
    
    currentY += 2;
    doc.setDrawColor(240, 240, 240);
    doc.line(totalsRightMargin - 70, currentY - 6, totalsRightMargin, currentY - 6);
    const grandTotal = (order.total_sales_price || 0) + (order.vat_amount || 0);
    drawTotalRow('Total', grandTotal, true, false);
    drawTotalRow('Amount due', grandTotal, true, true);

    const footerY = pageHeight - 35;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...primaryColor);
    doc.text('*Notes:', 20, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    
    return { doc, invoiceNum };
  };

  const handleShare = async () => {
    if (!order) return;
    
    if (navigator.share && navigator.canShare) {
      try {
        const result = await generateInvoicePDF();
        if (result) {
          const { doc, invoiceNum } = result;
          const pdfBlob = doc.output('blob');
          const fileName = `invoice_${invoiceNum.replace(/\s/g, '_')}.pdf`;
          
          const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
          
          const shareData = {
            title: `Order #${order?.id?.slice(0, 8).toUpperCase()}`,
            text: `Invoice for ${order.customer_name}`,
            files: [file]
          };
          
          if (navigator.canShare(shareData)) {
            await navigator.share(shareData);
            return;
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('PDF share failed:', err);
        } else {
          return; // User cancelled
        }
      }
    }
    
    // Fallback: show share menu for text-based sharing
    setShowShareMenu(!showShareMenu);
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareMenu(false);
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Order #${order?.id?.slice(0, 8).toUpperCase()}`);
    const body = encodeURIComponent(getShareText());
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    setShowShareMenu(false);
  };

  const handlePrintInvoice = async () => {
    const result = await generateInvoicePDF();
    if (result) {
      const { doc, invoiceNum } = result;
      doc.save(`invoice_${invoiceNum.replace(/\s/g, '_')}.pdf`);
    }
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
          <ArrowLeftIcon size={20} />
          <span>Back to Orders</span>
        </Link>
        
        <div className="header-actions">
          {order.payment_status !== 'Paid' && (
            <>
              <button 
                className="btn-secondary" 
                onClick={() => navigate(`/orders/edit/${order.id}`)}
                style={{ marginRight: '8px' }}
                title="Edit Order"
              >
                <EditIcon size={18} />
                <span>Edit</span>
              </button>
              <button 
                className="btn-primary" 
                onClick={handleMarkAsPaid} 
                style={{ marginRight: '8px', backgroundColor: '#F59E0B' }}
                title="Mark order as paid and deduct stock"
              >
                <CheckCircleIcon size={18} />
                <span>Mark as Paid</span>
              </button>
            </>
          )}
          <button className="btn-primary" title="Download Invoice" onClick={handlePrintInvoice} style={{ marginRight: '8px' }}>
            <DownloadIcon size={18} />
            <span>Download Invoice</span>
          </button>
          <div className="share-button-container">
            <button className="btn-icon" title="Share" style={{ width: '42px', height: '42px' }} onClick={handleShare}>
              <ShareIcon size={20} />
            </button>
            {showShareMenu && (
              <div className="share-menu">
                <button className="share-menu-item" onClick={handleCopyToClipboard}>
                  {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                  <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
                </button>
                <button className="share-menu-item" onClick={handleWhatsAppShare}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span>WhatsApp</span>
                </button>
                <button className="share-menu-item" onClick={handleEmailShare}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>Email</span>
                </button>
              </div>
            )}
          </div>
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
                {order.payment_status === 'Paid' ? <CheckCircleIcon size={16} /> : <AlertCircleIcon size={16} />}
                <span>Status: {order.payment_status || 'Paid'}</span>
              </span>
            </div>
            <div className="meta-item">
              <CalendarIcon size={16} className="meta-icon" />
              <span>{new Date(order.order_date).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
            <div className="meta-item">
              <ProfileIcon size={16} className="meta-icon" />
              <span>{order.customer_name}</span>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="order-summary-stats">
          <div className="summary-stat">
            <div className="stat-icon items">
              <PackageIcon size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{order.items?.length || 0}</span>
              <span className="stat-label">Items</span>
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-icon revenue">
              <TagsIcon size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(order.total_sales_price || 0)}</span>
              <span className="stat-label">Total Revenue</span>
            </div>
          </div>
          <div className="summary-stat">
            <div className="stat-icon profit">
              <TrendingUpIcon size={20} />
            </div>
            <div className="stat-content">
              <span className="stat-value">{formatCurrency(order.total_profit || 0)}</span>
              <span className="stat-label">Total Profit ({profitMargin}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Order Items Section */}
      <div className="order-items-card">
        <div className="card-header">
          <h2>Order Items</h2>
        </div>
        
        {/* Desktop View Table */}
        <div className="table-container desktop-only">
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
                        <span className="product-name">
                          {item.product_name}
                          {item.discount_percentage > 0 && (
                            <span className="item-discount-badge">-{item.discount_percentage}%</span>
                          )}
                        </span>
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

        {/* Mobile View List */}
        <div className="mobile-only order-items-list">
          {order.items?.map((item, index) => {
            const totalPrice = item.sales_price_at_time * item.quantity;
            const totalProfit = item.profit_at_time * item.quantity;
            const costPerUnit = item.sales_price_at_time - item.profit_at_time;
            
            return (
              <div key={item.id || index} className="mobile-item-card">
                 <div className="mobile-item-header">
                    <div className="product-cell">
                        <div className="product-avatar">
                          {item.product_name?.charAt(0) || 'P'}
                        </div>
                        <div className="product-info">
                           <span className="product-name">
                             {item.product_name}
                             {item.discount_percentage > 0 && (
                               <span className="item-discount-badge">-{item.discount_percentage}%</span>
                             )}
                           </span>
                           <span className="product-quantity">Qty: {item.quantity}</span>
                        </div>
                    </div>
                    <div className="item-price-main">
                       {formatCurrency(totalPrice)}
                    </div>
                 </div>
                 <div className="mobile-item-details">
                    <div className="detail-row">
                       <span className="detail-label">Unit Price</span>
                       <span className="detail-value">{formatCurrency(item.sales_price_at_time || 0)}</span>
                    </div>
                    <div className="detail-row">
                       <span className="detail-label">Cost of Prod.</span>
                       <span className="detail-value text-muted">{formatCurrency(costPerUnit)}</span>
                    </div>
                    <div className="detail-row profit-row">
                       <span className="detail-label">Profit</span>
                       <span className="detail-value profit-value">{formatCurrency(totalProfit, { showSign: true })}</span>
                    </div>
                 </div>
              </div>
            );
          })}
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

          {order.include_vat && order.vat_amount > 0 && (
            <div className="totals-row">
              <span>VAT (7.5%)</span>
              <span>{formatCurrency(order.vat_amount)}</span>
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
            <span>{formatCurrency((order.total_sales_price || 0) + (order.vat_amount || 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetails;
