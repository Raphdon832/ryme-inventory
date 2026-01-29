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
  EditIcon,
  PaymentIcon,
  CloseIcon,
  DeleteIcon,
  HistoryIcon,
  CashIcon,
  CreditCardIcon,
  BankIcon,
  LinkIcon,
  UnlinkIcon,
  PackageCheckIcon,
  GroupIcon,
  SearchIcon,
  CartIcon
} from '../components/CustomIcons';
import api from '../api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../components/Toast';
import soundManager from '../utils/soundManager';
import { usePageState } from '../hooks/usePageState';
import useScrollLock from '../hooks/useScrollLock';
import './OrderDetails.css';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatCurrency, currencySymbol } = useSettings();
  const toast = useToast();

  // Persist scroll position
  usePageState('orderDetails', {}, { persistScroll: true, scrollContainerSelector: '.main-content' });

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'Cash',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  
  // Invoice options
  const [includePaymentInInvoice, setIncludePaymentInInvoice] = useState(false);
  
  // Linking orders state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkedOrders, setLinkedOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [linkingLoading, setLinkingLoading] = useState(false);
  const [selectedOrdersToLink, setSelectedOrdersToLink] = useState([]);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  
  // Fulfillment state
  const [fulfillmentLoading, setFulfillmentLoading] = useState(null); // Holds item index being toggled
  
  // Lock scroll when modals are open
  useScrollLock(showPaymentModal || showLinkModal);

  useEffect(() => {
    const unsubscribe = api.subscribe(`/orders/${id}`, (response) => {
        setOrder(response.data);
        setLoading(false);
    });
    return () => unsubscribe();
  }, [id]);
  
  // Fetch linked orders when order changes
  useEffect(() => {
    const fetchLinkedOrders = async () => {
      if (order?.linked_group_id) {
        try {
          const response = await api.get(`/orders/${id}/linked`);
          setLinkedOrders(response.data.data || []);
        } catch (error) {
          console.error('Error fetching linked orders:', error);
        }
      } else {
        setLinkedOrders([]);
      }
    };
    
    if (order) {
      fetchLinkedOrders();
    }
  }, [order?.linked_group_id, id]);


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

  // Payment handling functions
  const resetPaymentForm = () => {
    setPaymentForm({
      amount: '',
      payment_method: 'Cash',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  const openPaymentModal = () => {
    resetPaymentForm();
    // Pre-fill with remaining balance
    if (order) {
      const grandTotal = (order.total_sales_price || 0) + (order.vat_amount || 0);
      const totalPaid = order.total_paid || 0;
      const remaining = grandTotal - totalPaid;
      if (remaining > 0) {
        setPaymentForm(prev => ({ ...prev, amount: remaining.toString() }));
      }
    }
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    setPaymentLoading(true);
    try {
      await api.put(`/orders/${id}`, {
        action: 'record_payment',
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        notes: paymentForm.notes,
        date: paymentForm.date
      });
      toast.success('Payment recorded successfully!');
      soundManager.playSuccess();
      setShowPaymentModal(false);
      resetPaymentForm();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.message || 'Failed to record payment');
      soundManager.playError();
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    
    try {
      setPaymentLoading(true);
      await api.put(`/orders/${id}`, {
        action: 'delete_payment',
        paymentId
      });
      toast.success('Payment deleted successfully');
      soundManager.playSuccess();
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error(error.message || 'Failed to delete payment');
      soundManager.playError();
    } finally {
      setPaymentLoading(false);
    }
  };

  // =============== ORDER LINKING FUNCTIONS ===============
  
  const openLinkModal = async () => {
    if (!order?.customer_id && !order?.customer_name) {
      toast.error('Cannot link orders: No customer associated with this order');
      return;
    }
    
    setShowLinkModal(true);
    setLinkingLoading(true);
    setSelectedOrdersToLink([]);
    setLinkSearchQuery('');
    
    try {
      let availableOrders = [];
      
      if (order.customer_id) {
        // If customer_id exists, fetch by customer_id
        const response = await api.get(`/orders/customer/${order.customer_id}`);
        availableOrders = response.data.data || [];
      } else {
        // Fallback: fetch all orders and filter by customer_name
        const response = await api.get('/orders');
        availableOrders = (response.data.data || []).filter(o => 
          o.customer_name?.toLowerCase() === order.customer_name?.toLowerCase()
        );
      }
      
      // Only allow unlinked orders (exclude current order)
      availableOrders = availableOrders.filter(o => 
        o.id !== id && !o.linked_group_id
      );
      
      setCustomerOrders(availableOrders);
    } catch (error) {
      console.error('Error fetching customer orders:', error);
      toast.error('Failed to load customer orders');
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleLinkOrders = async () => {
    if (selectedOrdersToLink.length === 0) {
      toast.error('Please select at least one order to link');
      return;
    }
    
    try {
      setLinkingLoading(true);
      await api.put(`/orders/${id}`, {
        action: 'link_orders',
        orderIds: selectedOrdersToLink
      });
      toast.success(`Successfully linked ${selectedOrdersToLink.length + 1} orders`);
      soundManager.playSuccess();
      setShowLinkModal(false);
      setSelectedOrdersToLink([]);
    } catch (error) {
      console.error('Error linking orders:', error);
      toast.error(error.message || 'Failed to link orders');
      soundManager.playError();
    } finally {
      setLinkingLoading(false);
    }
  };

  const handleUnlinkOrder = async () => {
    if (!window.confirm('Are you sure you want to unlink this order from the group?')) return;
    
    try {
      setLinkingLoading(true);
      await api.put(`/orders/${id}`, { action: 'unlink_order' });
      toast.success('Order unlinked successfully');
      soundManager.playSuccess();
    } catch (error) {
      console.error('Error unlinking order:', error);
      toast.error(error.message || 'Failed to unlink order');
      soundManager.playError();
    } finally {
      setLinkingLoading(false);
    }
  };

  const toggleOrderSelection = (orderId) => {
    setSelectedOrdersToLink(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const filteredCustomerOrders = customerOrders.filter(o => {
    if (!linkSearchQuery) return true;
    const query = linkSearchQuery.toLowerCase();
    return (
      o.id?.toLowerCase().includes(query) ||
      o.customer_name?.toLowerCase().includes(query) ||
      o.items?.some(item => item.product_name?.toLowerCase().includes(query))
    );
  });

  // Calculate aggregated totals for linked orders
  const getLinkedOrdersTotal = () => {
    const allOrders = [order, ...linkedOrders].filter(Boolean);
    const totalAmount = allOrders.reduce((sum, o) => 
      sum + (o.total_sales_price || 0) + (o.vat_amount || 0), 0
    );
    const totalPaid = allOrders.reduce((sum, o) => sum + (o.total_paid || 0), 0);
    const balance = totalAmount - totalPaid;
    return { totalAmount, totalPaid, balance, orderCount: allOrders.length };
  };

  // =============== FULFILLMENT FUNCTIONS ===============
  
  const handleToggleItemFulfilled = async (itemIndex) => {
    try {
      setFulfillmentLoading(itemIndex);
      await api.put(`/orders/${id}`, {
        action: 'toggle_item_fulfilled',
        itemIndex
      });
      soundManager.playSuccess();
    } catch (error) {
      console.error('Error toggling fulfillment:', error);
      toast.error(error.message || 'Failed to update item');
      soundManager.playError();
    } finally {
      setFulfillmentLoading(null);
    }
  };

  const handleSetAllFulfilled = async (fulfilled) => {
    const action = fulfilled ? 'fulfill' : 'unfulfill';
    if (!window.confirm(`Are you sure you want to mark all items as ${fulfilled ? 'fulfilled' : 'unfulfilled'}?`)) return;
    
    try {
      setFulfillmentLoading('all');
      await api.put(`/orders/${id}`, {
        action: 'set_all_items_fulfilled',
        fulfilled
      });
      toast.success(`All items marked as ${fulfilled ? 'fulfilled' : 'unfulfilled'}`);
      soundManager.playSuccess();
    } catch (error) {
      console.error('Error setting all fulfillment:', error);
      toast.error(error.message || 'Failed to update items');
      soundManager.playError();
    } finally {
      setFulfillmentLoading(null);
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'Card':
        return <CreditCardIcon size={14} />;
      case 'Bank Transfer':
        return <BankIcon size={14} />;
      default:
        return <CashIcon size={14} />;
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

    // Ensure we don't start totals too close to the bottom
    if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 25;
    }
    
    const drawTotalRow = (label, valueRaw, isBold = false, isHeavy = false, isDiscount = false) => {
        // Check for page overflow
        if (currentY > pageHeight - 40) {
            doc.addPage();
            currentY = 25;
        }
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
    
    // Ensure space for the final total and line
    if (currentY > pageHeight - 30) {
        doc.addPage();
        currentY = 25;
    }

    currentY += 2;
    doc.setDrawColor(240, 240, 240);
    doc.line(totalsRightMargin - 70, currentY - 6, totalsRightMargin, currentY - 6);
    const grandTotal = (order.total_sales_price || 0) + (order.vat_amount || 0);
    drawTotalRow('Total', grandTotal, true, false);
    
    // Payment Summary Section (if enabled)
    if (includePaymentInInvoice) {
      const totalPaid = order.total_paid || 0;
      const balanceDue = grandTotal - totalPaid;
      
      currentY += 4;
      doc.setDrawColor(240, 240, 240);
      doc.line(totalsRightMargin - 70, currentY - 6, totalsRightMargin, currentY - 6);
      
      // Amount Paid
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...secondaryColor);
      doc.text('Amount Paid', totalsLabelX, currentY, { align: 'right' });
      doc.setTextColor(16, 185, 129); // Green color
      doc.text(safeCurrency(totalPaid), totalsRightMargin, currentY, { align: 'right' });
      currentY += 8;
      
      // Balance Due
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text('Balance Due', totalsLabelX, currentY, { align: 'right' });
      if (balanceDue > 0) {
        doc.setTextColor(239, 68, 68); // Red for unpaid
      } else {
        doc.setTextColor(16, 185, 129); // Green for fully paid
      }
      doc.text(safeCurrency(balanceDue), totalsRightMargin, currentY, { align: 'right' });
      currentY += 8;
      
      // Payment Status Badge
      if (order.payment_status === 'Paid') {
        currentY += 2;
        const statusText = 'PAID IN FULL';
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(statusText);
        const badgeWidth = textWidth + 8;
        const badgeHeight = 6;
        const badgeX = totalsRightMargin - badgeWidth;
        const badgeY = currentY - 4;
        doc.setFillColor(16, 185, 129);
        doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(statusText, badgeX + badgeWidth / 2, currentY - 0.5, { align: 'center' });
        currentY += 8;
      }
    } else {
      drawTotalRow('Amount due', grandTotal, true, true);
    }

    const footerY = pageHeight - 35;
    
    // Check if totals or table ended too close to the footer
    if (currentY > footerY - 5) {
        doc.addPage();
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...primaryColor);
    doc.text('*Notes:', 20, footerY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...secondaryColor);
    doc.text('Thank you for your business! For any inquiries, please contact Ryme Interiors.', 20, footerY + 5);
    doc.text('Payment is due within 7 days. Goods received in good condition are not returnable.', 20, footerY + 10);
    
    // Page Number
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...textGray);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    }
    
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
                className="btn-primary btn-payment" 
                onClick={openPaymentModal}
                style={{ marginRight: '8px' }}
                title="Record a payment for this order"
              >
                <PaymentIcon size={18} />
                <span>Record Payment</span>
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
              {(() => {
                const status = order.payment_status || 'Pending';
                const isPaid = status === 'Paid';
                const isPartial = status === 'Partial';
                const statusColors = {
                  Paid: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10B981', border: 'rgba(16, 185, 129, 0.2)' },
                  Partial: { bg: 'rgba(59, 130, 246, 0.1)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
                  Pending: { bg: 'rgba(245, 158, 11, 0.1)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' }
                };
                const colors = statusColors[status] || statusColors.Pending;
                return (
                  <span className={`badge ${isPaid ? 'badge-success' : isPartial ? 'badge-info' : 'badge-warning'}`} 
                    style={{ 
                      backgroundColor: colors.bg,
                      color: colors.text,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      border: `1px solid ${colors.border}`
                    }}>
                    {isPaid ? <CheckCircleIcon size={16} /> : isPartial ? <PaymentIcon size={16} /> : <AlertCircleIcon size={16} />}
                    <span>Status: {status}</span>
                  </span>
                );
              })()}
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
          <div className="card-header-left">
            <h2>Order Items</h2>
            {order.fulfillment_status && (
              <span className={`fulfillment-badge ${order.fulfillment_status.toLowerCase()}`}>
                {order.fulfillment_status}
              </span>
            )}
          </div>
          <div className="card-header-actions">
            {order.items?.some(i => !i.fulfilled) && (
              <button 
                className="btn-text btn-fulfill-all"
                onClick={() => handleSetAllFulfilled(true)}
                disabled={fulfillmentLoading === 'all'}
              >
                <PackageCheckIcon size={16} />
                <span>Fulfill All</span>
              </button>
            )}
            {order.items?.some(i => i.fulfilled) && (
              <button 
                className="btn-text btn-unfulfill-all"
                onClick={() => handleSetAllFulfilled(false)}
                disabled={fulfillmentLoading === 'all'}
              >
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Desktop View Table */}
        <div className="table-container desktop-only">
          <table className="order-items-table">
            <thead>
              <tr>
                <th className="th-fulfilled">Fulfilled</th>
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
                const isFulfilled = item.fulfilled;
                
                return (
                  <tr key={item.id || index} className={isFulfilled ? 'row-fulfilled' : ''}>
                    <td className="td-fulfilled">
                      <button
                        className={`fulfillment-checkbox ${isFulfilled ? 'checked' : ''}`}
                        onClick={() => handleToggleItemFulfilled(index)}
                        disabled={fulfillmentLoading === index}
                        title={isFulfilled ? 'Mark as unfulfilled' : 'Mark as fulfilled'}
                      >
                        {fulfillmentLoading === index ? (
                          <span className="checkbox-loading"></span>
                        ) : isFulfilled ? (
                          <CheckIcon size={14} />
                        ) : null}
                      </button>
                    </td>
                    <td>
                      <div className="product-cell">
                        <div className="product-avatar">
                          {item.product_name?.charAt(0) || 'P'}
                        </div>
                        <span className={`product-name ${isFulfilled ? 'fulfilled' : ''}`}>
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
            const isFulfilled = item.fulfilled;
            
            return (
              <div key={item.id || index} className={`mobile-item-card ${isFulfilled ? 'fulfilled' : ''}`}>
                 <div className="mobile-item-header">
                    <button
                      className={`fulfillment-checkbox ${isFulfilled ? 'checked' : ''}`}
                      onClick={() => handleToggleItemFulfilled(index)}
                      disabled={fulfillmentLoading === index}
                    >
                      {fulfillmentLoading === index ? (
                        <span className="checkbox-loading"></span>
                      ) : isFulfilled ? (
                        <CheckIcon size={14} />
                      ) : null}
                    </button>
                    <div className="product-cell">
                        <div className="product-avatar">
                          {item.product_name?.charAt(0) || 'P'}
                        </div>
                        <div className="product-info">
                           <span className={`product-name ${isFulfilled ? 'fulfilled' : ''}`}>
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

      {/* Payment Summary Card */}
      <div className="payment-summary-card">
        <div className="card-header payment-header">
          <div className="payment-header-left">
            <PaymentIcon size={20} />
            <h2>Payment Summary</h2>
          </div>
          {(order.payments?.length > 0) && (
            <button 
              className="btn-text"
              onClick={() => setShowPaymentHistory(!showPaymentHistory)}
            >
              <HistoryIcon size={16} />
              <span>{showPaymentHistory ? 'Hide' : 'Show'} History ({order.payments.length})</span>
            </button>
          )}
        </div>
        
        <div className="payment-summary-content">
          {(() => {
            const grandTotal = (order.total_sales_price || 0) + (order.vat_amount || 0);
            const totalPaid = order.total_paid || 0;
            const balance = grandTotal - totalPaid;
            const paymentPercentage = grandTotal > 0 ? Math.min((totalPaid / grandTotal) * 100, 100) : 0;
            
            return (
              <>
                <div className="payment-progress-section">
                  <div className="payment-progress-bar">
                    <div 
                      className="payment-progress-fill" 
                      style={{ width: `${paymentPercentage}%` }}
                    />
                  </div>
                  <div className="payment-progress-label">
                    {paymentPercentage.toFixed(0)}% Paid
                  </div>
                </div>
                
                <div className="payment-stats">
                  <div className="payment-stat">
                    <span className="payment-stat-label">Total Amount</span>
                    <span className="payment-stat-value">{formatCurrency(grandTotal)}</span>
                  </div>
                  <div className="payment-stat">
                    <span className="payment-stat-label">Amount Paid</span>
                    <span className="payment-stat-value paid">{formatCurrency(totalPaid)}</span>
                  </div>
                  <div className="payment-stat">
                    <span className="payment-stat-label">Balance Due</span>
                    <span className={`payment-stat-value ${balance > 0 ? 'due' : 'paid'}`}>
                      {formatCurrency(balance)}
                    </span>
                  </div>
                </div>

                <div className="invoice-payment-toggle">
                  <label className="invoice-toggle">
                    <input 
                      type="checkbox" 
                      checked={includePaymentInInvoice} 
                      onChange={(e) => setIncludePaymentInInvoice(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                    <span className="toggle-label">Include payment info in invoice</span>
                  </label>
                </div>

                {balance > 0 && order.payment_status !== 'Paid' && (
                  <button className="btn-primary btn-record-payment" onClick={openPaymentModal}>
                    <PaymentIcon size={18} />
                    <span>Record Payment</span>
                  </button>
                )}
              </>
            );
          })()}
        </div>

        {/* Payment History */}
        {showPaymentHistory && order.payments?.length > 0 && (
          <div className="payment-history">
            <div className="payment-history-header">
              <h3>Payment History</h3>
            </div>
            <div className="payment-history-list">
              {order.payments.map((payment, index) => (
                <div key={payment.id || index} className="payment-history-item">
                  <div className="payment-item-left">
                    <div className="payment-method-icon">
                      {getPaymentMethodIcon(payment.payment_method)}
                    </div>
                    <div className="payment-item-info">
                      <span className="payment-item-method">{payment.payment_method}</span>
                      <span className="payment-item-date">
                        {new Date(payment.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {payment.notes && (
                        <span className="payment-item-notes">{payment.notes}</span>
                      )}
                    </div>
                  </div>
                  <div className="payment-item-right">
                    <span className="payment-item-amount">{formatCurrency(payment.amount)}</span>
                    {order.payment_status !== 'Paid' && (
                      <button 
                        className="btn-delete-payment"
                        onClick={() => handleDeletePayment(payment.id)}
                        title="Delete payment"
                        disabled={paymentLoading}
                      >
                        <DeleteIcon size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Linked Orders Section */}
      <div className="linked-orders-card">
        <div className="card-header linked-orders-header">
          <div className="linked-header-left">
            <GroupIcon size={20} />
            <h2>Linked Orders</h2>
            {linkedOrders.length > 0 && (
              <span className="linked-count">{linkedOrders.length + 1} orders</span>
            )}
          </div>
          <div className="linked-header-actions">
            {order.linked_group_id ? (
              <>
                <button 
                  className="btn-text btn-link"
                  onClick={openLinkModal}
                  disabled={linkingLoading || (!order.customer_id && !order.customer_name)}
                  title={(!order.customer_id && !order.customer_name) ? 'Order must have a customer to link' : 'Add more orders to this group'}
                >
                  <LinkIcon size={16} />
                  <span>Add Orders</span>
                </button>
                <button 
                  className="btn-text btn-unlink"
                  onClick={handleUnlinkOrder}
                  disabled={linkingLoading}
                >
                  <UnlinkIcon size={16} />
                  <span>Unlink</span>
                </button>
              </>
            ) : (
              <button 
                className="btn-text btn-link"
                onClick={openLinkModal}
                disabled={!order.customer_id && !order.customer_name}
                title={(!order.customer_id && !order.customer_name) ? 'Order must have a customer to link' : 'Link with other orders'}
              >
                <LinkIcon size={16} />
                <span>Link Orders</span>
              </button>
            )}
          </div>
        </div>

        <div className="linked-orders-content">
          {linkedOrders.length > 0 ? (
            <>
              {/* Aggregated Summary */}
              {(() => {
                const totals = getLinkedOrdersTotal();
                const paymentPercentage = totals.totalAmount > 0 
                  ? Math.min((totals.totalPaid / totals.totalAmount) * 100, 100) 
                  : 0;
                
                return (
                  <div className="linked-summary">
                    <div className="linked-summary-header">
                      <span>Combined Payment Progress</span>
                      <span className="linked-progress-percent">{paymentPercentage.toFixed(0)}%</span>
                    </div>
                    <div className="linked-progress-bar">
                      <div 
                        className="linked-progress-fill" 
                        style={{ width: `${paymentPercentage}%` }}
                      />
                    </div>
                    <div className="linked-summary-stats">
                      <div className="linked-stat">
                        <span className="linked-stat-label">Total ({totals.orderCount} orders)</span>
                        <span className="linked-stat-value">{formatCurrency(totals.totalAmount)}</span>
                      </div>
                      <div className="linked-stat">
                        <span className="linked-stat-label">Paid</span>
                        <span className="linked-stat-value paid">{formatCurrency(totals.totalPaid)}</span>
                      </div>
                      <div className="linked-stat">
                        <span className="linked-stat-label">Balance</span>
                        <span className={`linked-stat-value ${totals.balance > 0 ? 'due' : 'paid'}`}>
                          {formatCurrency(totals.balance)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Linked Orders List */}
              <div className="linked-orders-list">
                {linkedOrders.map(linkedOrder => {
                  const orderTotal = (linkedOrder.total_sales_price || 0) + (linkedOrder.vat_amount || 0);
                  const orderPaid = linkedOrder.total_paid || 0;
                  
                  return (
                    <Link 
                      key={linkedOrder.id} 
                      to={`/orders/${linkedOrder.id}`}
                      className="linked-order-item"
                    >
                      <div className="linked-order-info">
                        <span className="linked-order-id">
                          #{linkedOrder.id?.slice(0, 8).toUpperCase()}
                        </span>
                        <span className="linked-order-date">
                          {new Date(linkedOrder.order_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="linked-order-items">
                        {linkedOrder.items?.slice(0, 2).map((item, i) => (
                          <span key={i} className="linked-item-name">{item.product_name}</span>
                        ))}
                        {linkedOrder.items?.length > 2 && (
                          <span className="linked-item-more">+{linkedOrder.items.length - 2} more</span>
                        )}
                      </div>
                      <div className="linked-order-amount">
                        <span className={`linked-order-status ${linkedOrder.payment_status?.toLowerCase()}`}>
                          {linkedOrder.payment_status}
                        </span>
                        <span className="linked-order-total">{formatCurrency(orderTotal)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="linked-orders-empty">
              <GroupIcon size={32} />
              <p>No linked orders</p>
              <span>Link multiple orders from the same customer to track combined payments</span>
            </div>
          )}
        </div>
      </div>

      {/* Link Orders Modal */}
      {showLinkModal && (
        <div className="modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="link-orders-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <LinkIcon size={20} />
                Link Orders
              </h2>
              <button className="modal-close" onClick={() => setShowLinkModal(false)}>
                <CloseIcon size={20} />
              </button>
            </div>

            <div className="link-modal-content">
              <p className="link-modal-subtitle">
                Select orders from <strong>{order.customer_name || 'this customer'}</strong> to link together
              </p>

              <div className="link-search-wrapper">
                <SearchIcon size={18} />
                <input
                  type="text"
                  placeholder="Search orders..."
                  value={linkSearchQuery}
                  onChange={(e) => setLinkSearchQuery(e.target.value)}
                />
              </div>

              {linkingLoading && customerOrders.length === 0 ? (
                <div className="link-loading">
                  <div className="loading-spinner"></div>
                  <p>Loading orders...</p>
                </div>
              ) : filteredCustomerOrders.length === 0 ? (
                <div className="link-empty">
                  <CartIcon size={32} />
                  <p>No other orders found for this customer</p>
                </div>
              ) : (
                <div className="link-orders-list">
                  {filteredCustomerOrders.map(customerOrder => {
                    const orderTotal = (customerOrder.total_sales_price || 0) + (customerOrder.vat_amount || 0);
                    const isSelected = selectedOrdersToLink.includes(customerOrder.id);
                    
                    return (
                      <div 
                        key={customerOrder.id}
                        className={`link-order-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleOrderSelection(customerOrder.id)}
                      >
                        <div className={`link-order-checkbox ${isSelected ? 'checked' : ''}`}>
                          {isSelected && <CheckIcon size={14} />}
                        </div>
                        <div className="link-order-details">
                          <div className="link-order-header">
                            <span className="link-order-id">
                              #{customerOrder.id?.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`link-order-status ${customerOrder.payment_status?.toLowerCase()}`}>
                              {customerOrder.payment_status}
                            </span>
                          </div>
                          <div className="link-order-meta">
                            <span className="link-order-date">
                              {new Date(customerOrder.order_date).toLocaleDateString()}
                            </span>
                            <span className="link-order-items-count">
                              {customerOrder.items?.length || 0} items
                            </span>
                          </div>
                          <div className="link-order-products">
                            {customerOrder.items?.slice(0, 3).map((item, i) => (
                              <span key={i}>{item.product_name}</span>
                            ))}
                            {customerOrder.items?.length > 3 && (
                              <span>+{customerOrder.items.length - 3} more</span>
                            )}
                          </div>
                        </div>
                        <div className="link-order-amount">
                          {formatCurrency(orderTotal)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowLinkModal(false)}
                disabled={linkingLoading}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-primary"
                disabled={linkingLoading || selectedOrdersToLink.length === 0}
                onClick={handleLinkOrders}
              >
                {linkingLoading ? 'Linking...' : `Link ${selectedOrdersToLink.length + 1} Orders`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                <PaymentIcon size={20} />
                Record Payment
              </h2>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <CloseIcon size={20} />
              </button>
            </div>
            
            <form onSubmit={handlePaymentSubmit} className="payment-form">
              <div className="form-group">
                <label>Payment Amount</label>
                <div className="amount-input-wrapper">
                  <span className="currency-prefix">{currencySymbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    autoFocus
                  />
                </div>
                {order && (() => {
                  const grandTotal = (order.total_sales_price || 0) + (order.vat_amount || 0);
                  const totalPaid = order.total_paid || 0;
                  const remaining = grandTotal - totalPaid;
                  return remaining > 0 && (
                    <div className="amount-helper">
                      <span>Outstanding: {formatCurrency(remaining)}</span>
                      <button 
                        type="button" 
                        className="btn-fill-balance"
                        onClick={() => setPaymentForm(prev => ({ ...prev, amount: remaining.toString() }))}
                      >
                        Pay Full
                      </button>
                    </div>
                  );
                })()}
              </div>

              <div className="form-group">
                <label>Payment Method</label>
                <div className="payment-method-options">
                  {['Cash', 'Card', 'Bank Transfer'].map(method => (
                    <button
                      key={method}
                      type="button"
                      className={`payment-method-btn ${paymentForm.payment_method === method ? 'active' : ''}`}
                      onClick={() => setPaymentForm(prev => ({ ...prev, payment_method: method }))}
                    >
                      {method === 'Cash' && <CashIcon size={20} />}
                      {method === 'Card' && <CreditCardIcon size={20} />}
                      {method === 'Bank Transfer' && <BankIcon size={20} />}
                      <span>{method}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Add any notes about this payment..."
                  rows={3}
                />
              </div>
            </form>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setShowPaymentModal(false)}
                disabled={paymentLoading}
              >
                Cancel
              </button>
              <button 
                type="button"
                className="btn-primary"
                disabled={paymentLoading || !paymentForm.amount}
                onClick={handlePaymentSubmit}
              >
                {paymentLoading ? 'Recording...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
