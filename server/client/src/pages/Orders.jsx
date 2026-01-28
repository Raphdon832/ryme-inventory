import React, { useState, useEffect } from 'react';
import api from '../api';
import { SkeletonTable, SkeletonOrderCardList } from '../components/Skeleton.jsx';
import { Link, useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  CartIcon,
  TagsIcon,
  TrendingUpIcon,
  CloseIcon,
  DeleteIcon,
  EyeIcon,
  AlertCircleIcon,
  EditIcon,
  WifiOffIcon,
  RefreshIcon,
  CheckIcon,
  DownloadIcon,
  ReportsIcon,
  PrintIcon
} from '../components/CustomIcons';
import { useSettings } from '../contexts/SettingsContext';
import useScrollLock from '../hooks/useScrollLock';
import { usePageState } from '../hooks/usePageState';
import offlineManager from '../utils/offlineManager';
import { exportOrders } from '../utils/exportUtils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Orders.css';

const Orders = () => {
  const { formatCurrency } = useSettings();
  const navigate = useNavigate();
  
  // Persisted page state
  const { state: pageState, updateState: updatePageState } = usePageState('orders', {
    showAllOrders: false,
  }, { persistScroll: true, scrollContainerSelector: '.main-content' });

  const [orders, setOrders] = useState([]);
  const [offlineOrders, setOfflineOrders] = useState([]);
  const [deleteMode, setDeleteMode] = useState(false);
  const [bulkDownloadMode, setBulkDownloadMode] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedForDownload, setSelectedForDownload] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  // Use persisted state
  const showAllOrders = pageState.showAllOrders;
  const setShowAllOrders = (value) => updatePageState({ showAllOrders: value });

  // Lock scroll when any modal is open
  useScrollLock(showDeleteConfirm);

  // Subscribe to offline status
  useEffect(() => {
    const unsubscribe = offlineManager.subscribe((status) => {
      setIsOnline(status.isOnline);
      setSyncing(status.syncInProgress);
      // Reload offline orders when status changes
      loadOfflineOrders();
    });
    
    return () => unsubscribe();
  }, []);

  // Load offline orders
  const loadOfflineOrders = async () => {
    try {
      const offline = await offlineManager.getOfflineOrders();
      setOfflineOrders(offline);
    } catch (err) {
      console.error('Error loading offline orders:', err);
    }
  };

  useEffect(() => {
    loadOfflineOrders();
  }, []);

  useEffect(() => {
    const unsubscribeOrders = api.subscribe('/orders', (response) => {
      setOrders(response.data);
      setLoadingOrders(false);
    });

    return () => {
      unsubscribeOrders();
    };
  }, []);

  // Combine server orders with offline orders
  const allOrders = [
    ...offlineOrders.map(o => ({
      id: o.tempId,
      customer_name: o.customer_name,
      customer_address: o.customer_address,
      order_date: o.createdAt,
      payment_status: 'Pending',
      total_sales_price: o.items?.reduce((acc, item) => {
        const discount = item.discount_percentage || 0;
        const effectivePrice = (item.sales_price || 0) * (1 - discount / 100);
        return acc + (effectivePrice * item.quantity);
      }, 0) || 0,
      total_profit: 0,
      items: o.items || [],
      _offline: true,
      _syncStatus: o.status
    })),
    ...orders
  ];

  // Apply default sorting (newest first) to all views
  const sortedAllOrders = [...allOrders].sort((a, b) => {
    const dateA = new Date(a.order_date);
    const dateB = new Date(b.order_date);
    return dateB - dateA;
  });

  const toggleOrderSelection = (orderId) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const toggleDownloadSelection = (orderId) => {
    setSelectedForDownload(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const cancelBulkDownloadMode = () => {
    setBulkDownloadMode(false);
    setSelectedForDownload([]);
  };

  // Generate bulk invoice PDF
  const generateBulkInvoicePDF = async () => {
    if (selectedForDownload.length === 0) return;
    setGeneratingPDF(true);
    
    try {
      // Get full order details for selected orders
      const selectedOrderData = sortedAllOrders.filter(o => selectedForDownload.includes(o.id) && !o._offline);
      if (selectedOrderData.length === 0) {
        alert('Please select at least one synced order (offline orders cannot be included).');
        setGeneratingPDF(false);
        return;
      }

      console.log('Selected order data:', selectedOrderData);

      // Fetch complete order details with items
      const fullOrders = await Promise.all(
        selectedOrderData.map(async (order) => {
          try {
            const response = await api.get(`/orders/${order.id}`);
            console.log(`Order ${order.id} fetched:`, response.data);
            // API returns { data: { ...order, items } }, so access response.data.data
            const orderData = response.data.data || response.data;
            return { ...order, ...orderData, id: order.id };
          } catch (err) {
            console.error(`Failed to fetch order ${order.id}:`, err);
            return order;
          }
        })
      );

      console.log('Full orders:', fullOrders);

      // Filter out any null/undefined orders
      const validOrders = fullOrders.filter(o => o && o.id);
      if (validOrders.length === 0) {
        alert('No valid orders to include in PDF.');
        setGeneratingPDF(false);
        return;
      }

      // Load logo
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
      
      const primaryColor = [20, 20, 20];
      const secondaryColor = [100, 100, 100];
      const lightGray = [248, 249, 250];
      const textGray = [156, 163, 175];
      const accentColor = [37, 99, 235];
      const successColor = [16, 185, 129];
      const warningColor = [245, 158, 11];
      
      const safeCurrency = (val) => formatCurrency(val).replace(/[^\x00-\x7F]/g, "N");
      
      // Safe date parser for Firestore timestamps or date strings
      const parseDate = (dateValue) => {
        if (!dateValue) return new Date();
        if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
        if (dateValue._seconds) return new Date(dateValue._seconds * 1000);
        const parsed = new Date(dateValue);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      };

      // Generate individual invoice pages
      validOrders.forEach((order, orderIndex) => {
        if (orderIndex > 0) doc.addPage();

        // Header
        if (logoImg) {
          const logoWidth = 40;
          const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
          doc.addImage(logoImg, 'PNG', 20, 12, logoWidth, logoHeight);
        } else {
          doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...primaryColor);
          doc.text("Ryme Interiors", 20, 26);
        }

        const isPaid = order.payment_status === 'Paid';
        const invoicePrefix = isPaid ? 'Sales Invoice' : 'Invoice';
        const orderDateObj = parseDate(order.order_date);
        const datePart = orderDateObj.toISOString().slice(0, 7).replace('-', '');
        const orderId = order.id || order._id || `${orderIndex + 1}`;
        const idHash = orderId.slice(0, 2).toUpperCase() + orderId.slice(-2).toUpperCase();
        const invoiceNum = `${invoicePrefix} ${datePart}-00-${idHash}`;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...primaryColor);
        doc.text(invoiceNum, pageWidth - 20, 26, { align: 'right' });

        doc.setDrawColor(240, 240, 240);
        doc.setLineWidth(0.5);
        doc.line(20, 35, pageWidth - 20, 35);

        // Info section
        const startY = 50;
        const col2X = pageWidth / 2 + 10;

        doc.setFontSize(9);
        doc.setTextColor(...textGray);
        doc.text('Date', 20, startY);
        doc.setTextColor(...primaryColor);
        doc.setFont('helvetica', 'bold');
        const orderDate = orderDateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
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

        // Table
        const tableStartY = row2Y + 25;
        const hasItemDiscounts = order.items?.some(item => (item.discount_percentage || 0) > 0);
        const tableColumn = hasItemDiscounts
          ? ["S/N", "ITEM", "QTY", "RATE", "SUBTOTAL", "DISC.", "FINAL"]
          : ["S/N", "ITEM", "QTY", "RATE", "AMOUNT"];

        const tableRows = [];
        order.items?.forEach((item, index) => {
          const discount = item.discount_percentage || 0;
          const price = item.sales_price_at_time || item.sales_price || 0;
          const originalTotal = price * item.quantity;
          const effectiveTotal = (price * (1 - discount / 100)) * item.quantity;
          const itemData = [index + 1, item.product_name, item.quantity, safeCurrency(price)];
          if (hasItemDiscounts) {
            itemData.push(safeCurrency(originalTotal));
            itemData.push(discount > 0 ? `-${discount}%` : "-");
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
          styles: { fontSize: 9, cellPadding: 2, textColor: primaryColor, font: 'helvetica', valign: 'middle' },
          headStyles: { fillColor: lightGray, textColor: textGray, fontSize: 8, fontStyle: 'bold' },
        });

        // Totals
        const totalsRightMargin = pageWidth - 20;
        const totalsLabelX = totalsRightMargin - 50;
        let currentY = doc.lastAutoTable.finalY + 15;

        // Ensure we don't start totals too close to the bottom
        if (currentY > pageHeight - 60) {
            doc.addPage();
            currentY = 25;
        }

        // Helper function for drawing total rows
        const drawTotalRow = (label, valueRaw, isBold = false, isDiscount = false) => {
          // Check for page overflow
          if (currentY > pageHeight - 40) {
              doc.addPage();
              currentY = 25;
          }
          doc.setFontSize(9);
          doc.setFont('helvetica', isBold ? 'bold' : 'normal');
          doc.setTextColor(...(isBold ? primaryColor : secondaryColor));
          doc.text(label, totalsLabelX, currentY, { align: 'right' });
          const displayValue = typeof valueRaw === 'number' ? safeCurrency(valueRaw) : String(valueRaw).replace(/[^\x00-\x7F]/g, "N");
          doc.setTextColor(...(isDiscount ? [239, 68, 68] : primaryColor));
          doc.text(displayValue, totalsRightMargin, currentY, { align: 'right' });
          currentY += 8;
        };

        const subtotal = order.subtotal || order.total_sales_price;
        drawTotalRow('Sub total', subtotal);
        
        // Order-level discount
        if (order.discount && order.discount.value > 0) {
          const total = order.total_sales_price;
          const discountAmount = subtotal - total;
          if (discountAmount > 0) {
            drawTotalRow('Discount', `-${safeCurrency(discountAmount)}`, false, true);
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
        drawTotalRow('Total', grandTotal, true);
        drawTotalRow('Amount due', grandTotal, true);

        // Page number
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textGray);
        doc.text(`Page ${orderIndex + 1} of ${validOrders.length + 1}`, pageWidth / 2, pageHeight - 15, { align: 'center' });
      });

      // ===== SUMMARY PAGE =====
      doc.addPage();
      
      // Summary Header
      if (logoImg) {
        const logoWidth = 35;
        const logoHeight = (logoImg.height * logoWidth) / logoImg.width;
        doc.addImage(logoImg, 'PNG', 20, 12, logoWidth, logoHeight);
      }

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Invoice Summary Report', pageWidth - 20, 22, { align: 'right' });

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textGray);
      doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - 20, 30, { align: 'right' });

      doc.setDrawColor(240, 240, 240);
      doc.setLineWidth(0.5);
      doc.line(20, 38, pageWidth - 20, 38);

      // Calculate summary stats
      let totalAmount = 0;
      let totalVAT = 0;
      let totalItemDiscounts = 0;
      let totalOrderDiscounts = 0;
      let totalItems = 0;
      const itemCounts = {};

      validOrders.forEach(order => {
        totalAmount += order.total_sales_price || 0;
        totalVAT += order.vat_amount || 0;

        // Order-level discount
        if (order.discount && order.discount.value > 0) {
          const subtotal = order.subtotal || order.total_sales_price;
          totalOrderDiscounts += subtotal - order.total_sales_price;
        }

        order.items?.forEach(item => {
          totalItems += item.quantity;
          const itemName = item.product_name || 'Unknown Item';
          itemCounts[itemName] = (itemCounts[itemName] || 0) + item.quantity;

          // Item-level discount
          const discount = item.discount_percentage || 0;
          if (discount > 0) {
            const price = item.sales_price_at_time || item.sales_price || 0;
            const originalTotal = price * item.quantity;
            const discountedTotal = (price * (1 - discount / 100)) * item.quantity;
            totalItemDiscounts += originalTotal - discountedTotal;
          }
        });
      });

      const totalDiscounts = totalItemDiscounts + totalOrderDiscounts;
      const grandTotal = totalAmount + totalVAT;

      // Summary Stats Section
      let summaryY = 50;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Overview', 20, summaryY);
      summaryY += 12;

      // Stats grid - customer relevant info only
      const statsData = [
        { label: 'Total Invoices', value: validOrders.length.toString(), color: accentColor },
        { label: 'Total Items Purchased', value: totalItems.toString(), color: accentColor },
      ];

      const statWidth = (pageWidth - 50) / 2;
      statsData.forEach((stat, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = 20 + (col * (statWidth + 10));
        const y = summaryY + (row * 22);

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y - 4, statWidth, 18, 3, 3, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textGray);
        doc.text(stat.label, x + 5, y + 3);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...stat.color);
        doc.text(stat.value, x + 5, y + 11);
      });

      summaryY += 30; // Reduced since we only have 1 row now

      // Discounts Section - show total savings to customer
      if (totalDiscounts > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('Your Savings', 20, summaryY);
        summaryY += 10;

        doc.setFillColor(240, 253, 244); // Light green for savings
        doc.roundedRect(20, summaryY - 3, pageWidth - 40, 28, 3, 3, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...primaryColor);

        if (totalItemDiscounts > 0) {
          doc.text(`Item Discounts: ${safeCurrency(totalItemDiscounts)}`, 25, summaryY + 6);
        }
        if (totalOrderDiscounts > 0) {
          doc.text(`Order Discounts: ${safeCurrency(totalOrderDiscounts)}`, 25, summaryY + 14);
        }

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...successColor);
        doc.text(`Total Saved: ${safeCurrency(totalDiscounts)}`, 25, summaryY + 22);

        summaryY += 38;
      }

      // VAT Section
      if (totalVAT > 0) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primaryColor);
        doc.text('VAT Charged', 20, summaryY);
        summaryY += 10;

        doc.setFillColor(248, 250, 252);
        doc.roundedRect(20, summaryY - 3, pageWidth - 40, 14, 3, 3, 'F');

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...primaryColor);
        doc.text(`VAT (7.5%): ${safeCurrency(totalVAT)}`, 25, summaryY + 6);

        summaryY += 22;
      }

      // Pie Chart - Items Purchased Distribution
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...primaryColor);
      doc.text('Items Purchased', 20, summaryY);
      summaryY += 10;

      // Sort items and handle "Others" category
      const allSortedItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1]);
      
      let chartItems = allSortedItems.slice(0, 5);
      const remainingItems = allSortedItems.slice(5);
      
      if (remainingItems.length > 0) {
        const othersCount = remainingItems.reduce((acc, curr) => acc + curr[1], 0);
        chartItems.push(['Others', othersCount]);
      }

      // Pie chart colors
      const pieColors = [
        [59, 130, 246],   // Blue
        [16, 185, 129],   // Green
        [245, 158, 11],   // Amber
        [239, 68, 68],    // Red
        [139, 92, 246],   // Purple
        [107, 114, 128],  // Gray for "Others"
      ];

      const centerX = 55;
      const centerY = summaryY + 40;
      const radius = 30;
      let startAngle = -Math.PI / 2;

      chartItems.forEach((item, i) => {
        const percentage = item[1] / totalItems;
        if (percentage <= 0) return;
        
        const endAngle = startAngle + (percentage * 2 * Math.PI);
        const color = item[0] === 'Others' ? [107, 114, 128] : pieColors[i % pieColors.length];

        doc.setFillColor(...color);
        
        // Use enough segments to make it look perfectly circular
        const segments = Math.max(10, Math.ceil(percentage * 150));
        for (let j = 0; j < segments; j++) {
          const sAngle = startAngle + (j / segments) * (endAngle - startAngle);
          const eAngle = startAngle + ((j + 1) / segments) * (endAngle - startAngle);
          
          doc.triangle(
            centerX, centerY,
            centerX + radius * Math.cos(sAngle), centerY + radius * Math.sin(sAngle),
            centerX + radius * Math.cos(eAngle), centerY + radius * Math.sin(eAngle),
            'F'
          );
        }

        startAngle = endAngle;
      });

      // Legend
      const legendX = 100;
      let legendY = summaryY + 15;

      chartItems.forEach((item, i) => {
        const percentage = ((item[1] / totalItems) * 100).toFixed(1);
        const color = item[0] === 'Others' ? [107, 114, 128] : pieColors[i % pieColors.length];
        
        doc.setFillColor(...color);
        doc.roundedRect(legendX, legendY - 3, 8, 8, 1, 1, 'F');

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...primaryColor);
        const displayName = item[0].length > 25 ? item[0].substring(0, 22) + '...' : item[0];
        doc.text(`${displayName} (${item[1]})`, legendX + 12, legendY + 2);

        doc.setTextColor(...textGray);
        doc.text(`${percentage}%`, pageWidth - 25, legendY + 2, { align: 'right' });

        legendY += 11;
      });

      // Grand Total Box
      const totalBoxY = pageHeight - 50;
      doc.setFillColor(...accentColor);
      doc.roundedRect(20, totalBoxY, pageWidth - 40, 25, 4, 4, 'F');

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(255, 255, 255);
      doc.text('Total Amount Due', 30, totalBoxY + 10);

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(safeCurrency(grandTotal), pageWidth - 30, totalBoxY + 16, { align: 'right' });

      // Page number
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textGray);
      doc.text(`Page ${validOrders.length + 1} of ${validOrders.length + 1}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

      // Save PDF
      const fileName = `Bulk_Invoices_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      // Reset selection
      setBulkDownloadMode(false);
      setSelectedForDownload([]);
    } catch (error) {
      console.error('Error generating bulk PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedOrders.length === 0) return;
    setDeleting(true);
    
    try {
      // Separate offline and server orders
      const offlineIds = selectedOrders.filter(id => id.toString().startsWith('offline_'));
      const serverIds = selectedOrders.filter(id => !id.toString().startsWith('offline_'));
      
      // Delete offline orders
      for (const id of offlineIds) {
        await offlineManager.deleteOfflineOrder(id);
      }
      
      // Delete server orders
      if (serverIds.length > 0) {
        await api.deleteMultipleOrders(serverIds);
      }
      
      setSelectedOrders([]);
      setDeleteMode(false);
      setShowDeleteConfirm(false);
      loadOfflineOrders();
    } catch (error) {
      console.error('Error deleting orders:', error);
    } finally {
      setDeleting(false);
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline || syncing) return;
    setSyncing(true);
    try {
      await offlineManager.syncPendingOperations();
      loadOfflineOrders();
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncing(false);
    }
  };

  const cancelDeleteMode = () => {
    setDeleteMode(false);
    setSelectedOrders([]);
  };

  // Stats (only count paid orders for revenue and profit)
  const totalOrders = orders.length;
  const paidOrders = orders.filter(o => o.payment_status !== 'Pending');
  const totalRevenue = paidOrders.reduce((acc, o) => acc + o.total_sales_price, 0);
  const totalProfit = paidOrders.reduce((acc, o) => acc + o.total_profit, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  return (
    <div className="orders-container">
      <div className="orders-header">
        <div className="orders-title">
          <h1>Orders</h1>
          <p>Create and manage customer orders</p>
        </div>
        <div className="orders-header-actions" style={{ display: 'flex', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="secondary" 
              onClick={() => exportOrders(sortedAllOrders, 'csv')}
              title="Export as CSV"
              style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <ReportsIcon size={16} /> <span className="hide-mobile">CSV</span>
            </button>
            <button 
              className="secondary" 
              onClick={() => exportOrders(sortedAllOrders, 'pdf')}
              title="Export as PDF"
              style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', borderRadius: '10px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <DownloadIcon size={16} /> <span className="hide-mobile">PDF</span>
            </button>
            <button 
              className={`secondary ${bulkDownloadMode ? 'active' : ''}`}
              onClick={() => bulkDownloadMode ? cancelBulkDownloadMode() : setBulkDownloadMode(true)}
              title="Bulk Download Invoices"
              style={{ padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', height: '42px', borderRadius: '10px', background: bulkDownloadMode ? 'var(--primary-color)' : 'var(--bg-surface)', border: '1px solid var(--border-color)', color: bulkDownloadMode ? 'white' : 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <PrintIcon size={16} /> <span className="hide-mobile">Bulk</span>
            </button>
          </div>
          <Link to="/orders/new" className="btn-primary btn-animate hover-lift" style={{ height: '42px', display: 'flex', alignItems: 'center' }}>
            <PlusIcon size={16} /> New Order
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-widget border-blue animate-slide-up delay-100">
          <div className="stat-header">
            <div className="stat-icon blue">
              <CartIcon />
            </div>
          </div>
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{new Intl.NumberFormat('en-US').format(totalOrders)}</div>
        </div>

        <div className="stat-widget border-purple animate-slide-up delay-200">
          <div className="stat-header">
            <div className="stat-icon purple">
              <TagsIcon />
            </div>
          </div>
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">{formatCurrency(totalRevenue)}</div>
        </div>

        <div className="stat-widget border-green animate-slide-up delay-300">
          <div className="stat-header">
            <div className="stat-icon green">
              <TrendingUpIcon />
            </div>
          </div>
          <div className="stat-label">Total Profit</div>
          <div className="stat-value">{formatCurrency(totalProfit)}</div>
        </div>

        <div className="stat-widget border-orange animate-slide-up delay-400">
          <div className="stat-header">
            <div className="stat-icon orange">
              <TagsIcon />
            </div>
          </div>
          <div className="stat-label">Avg. Order Value</div>
          <div className="stat-value">{formatCurrency(avgOrderValue)}</div>
        </div>
      </div>

      {/* Orders List */}
      <div className="card animate-fade-in delay-200">
        <div className="flex justify-between" style={{ marginBottom: '20px', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0 }}>
              {bulkDownloadMode ? 'Select Invoices to Download' : 'Order History'}
            </h3>
            <span style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>
              {bulkDownloadMode 
                ? `${selectedForDownload.length} invoice${selectedForDownload.length !== 1 ? 's' : ''} selected`
                : `${allOrders.length} orders`
              }
              {!bulkDownloadMode && offlineOrders.length > 0 && (
                <span className="offline-count-badge">
                  <WifiOffIcon size={10} /> {offlineOrders.length} offline
                </span>
              )}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {bulkDownloadMode ? (
              <>
                <button 
                  className="icon-btn-circle btn-animate"
                  onClick={cancelBulkDownloadMode}
                  title="Cancel"
                >
                  <CloseIcon size={18} />
                </button>
                <button 
                  className="btn-primary btn-animate"
                  onClick={generateBulkInvoicePDF}
                  disabled={selectedForDownload.length === 0 || generatingPDF}
                  style={{ 
                    padding: '8px 16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    opacity: selectedForDownload.length === 0 ? 0.5 : 1
                  }}
                  title={`Download ${selectedForDownload.length} invoice${selectedForDownload.length !== 1 ? 's' : ''}`}
                >
                  {generatingPDF ? (
                    <><span className="btn-spinner"></span> Generating...</>
                  ) : (
                    <><DownloadIcon size={16} /> Download ({selectedForDownload.length})</>
                  )}
                </button>
              </>
            ) : (
              <>
                {offlineOrders.length > 0 && isOnline && (
                  <button 
                    className="icon-btn-circle sync-btn btn-animate"
                    onClick={handleSyncNow}
                    disabled={syncing}
                    title="Sync offline orders"
                  >
                    <RefreshIcon size={18} className={syncing ? 'spinning' : ''} />
                  </button>
                )}
                {deleteMode ? (
                  <>
                    <button 
                      className="icon-btn-circle btn-animate"
                      onClick={cancelDeleteMode}
                      title="Cancel"
                    >
                      <CloseIcon size={18} />
                    </button>
                    <button 
                      className="icon-btn-circle danger btn-animate"
                      onClick={() => setShowDeleteConfirm(true)}
                      disabled={selectedOrders.length === 0}
                      title={`Delete ${selectedOrders.length} selected`}
                    >
                      <DeleteIcon size={18} />
                      {selectedOrders.length > 0 && (
                        <span className="delete-count animate-pop-in">{selectedOrders.length}</span>
                      )}
                    </button>
                  </>
                ) : (
                  <button 
                    className="icon-btn-circle btn-animate"
                    onClick={() => setDeleteMode(true)}
                    title="Delete orders"
                  >
                    <DeleteIcon size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        
        {/* Desktop Table View */}
        <div className="table-container desktop-only">
          {loadingOrders ? (
            <SkeletonTable rows={8} cols={7} />
          ) : (
          <table>
            <thead>
              <tr>
                {(deleteMode || bulkDownloadMode) && <th style={{ width: '40px' }}></th>}
                <th>Order ID</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total Sales</th>
                <th>Total Profit</th>
                <th>Status</th>
                {!deleteMode && !bulkDownloadMode && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedAllOrders.map(order => {
                const isSelected = selectedOrders.includes(order.id);
                const isSelectedForDownload = selectedForDownload.includes(order.id);
                const isOffline = order._offline;
                const isSelectable = bulkDownloadMode ? !isOffline : true;
                return (
                <tr 
                  key={order.id} 
                  className={`${deleteMode && isSelected ? 'row-selected' : ''} ${bulkDownloadMode && isSelectedForDownload ? 'row-selected download-selected' : ''} ${isOffline ? 'offline-row' : ''} ${bulkDownloadMode && isOffline ? 'not-selectable' : ''}`}
                  onClick={
                    deleteMode 
                      ? () => toggleOrderSelection(order.id) 
                      : bulkDownloadMode && isSelectable
                        ? () => toggleDownloadSelection(order.id)
                        : undefined
                  }
                  style={(deleteMode || (bulkDownloadMode && isSelectable)) ? { cursor: 'pointer' } : undefined}
                >
                  {(deleteMode || bulkDownloadMode) && (
                    <td>
                      {bulkDownloadMode && isOffline ? (
                        <div className="table-checkbox disabled" title="Offline orders cannot be included">
                          <WifiOffIcon size={10} />
                        </div>
                      ) : (
                        <div className={`table-checkbox ${deleteMode ? (isSelected ? 'checked' : '') : (isSelectedForDownload ? 'checked download' : '')}`}>
                          {(deleteMode ? isSelected : isSelectedForDownload) && <CheckIcon size={12} />}
                        </div>
                      )}
                    </td>
                  )}
                  <td>
                    <span className={`badge ${isOffline ? 'badge-offline' : 'badge-info'}`}>
                      {isOffline ? (
                        <><WifiOffIcon size={10} /> Offline</>
                      ) : (
                        <>#{String(order.id).slice(0, 8)}...</>
                      )}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{order.customer_name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {new Date(order.order_date).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(order.total_sales_price)}</td>
                  <td>
                    <span style={{ fontWeight: 600, color: order.total_profit >= 0 ? 'var(--success-text)' : 'var(--danger-text)' }}>
                      {formatCurrency(order.total_profit, { showSign: true })}
                    </span>
                  </td>
                  <td>
                    {isOffline ? (
                      <span className="badge badge-offline-status">
                        <WifiOffIcon size={10} /> Pending Sync
                      </span>
                    ) : (
                    (() => {
                        const status = order.payment_status || 'Paid';
                        const isPaid = status === 'Paid';
                        return (
                            <span className={`badge ${isPaid ? 'badge-success' : 'badge-warning'}`} 
                                  style={{ 
                                    backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                                    color: isPaid ? '#10B981' : '#F59E0B',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontWeight: 600,
                                    fontSize: '12px'
                                  }}>
                              {status}
                            </span>
                        );
                    })()
                    )}
                  </td>
                  {!deleteMode && !bulkDownloadMode && (
                    <td>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <Link 
                          to={`/orders/${order.id}`} 
                          className="table-action-btn"
                          title="View Details"
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <EyeIcon size={18} />
                        </Link>
                        {order.payment_status !== 'Paid' && (
                          <Link
                            to={`/orders/edit/${order.id}`}
                            className="table-action-btn edit-btn"
                            title="Edit Order"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary-color)' }}
                          >
                            <EditIcon size={16} />
                          </Link>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              )})}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={(deleteMode || bulkDownloadMode) ? 7 : 7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
                    <CartIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontWeight: 500 }}>No orders yet</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Create your first order to get started</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          )}
        </div>

        {/* Mobile Card View */}
        {loadingOrders ? (
          <SkeletonOrderCardList count={3} />
        ) : (
        <div className="orders-list-mobile mobile-only">
          {sortedAllOrders.length === 0 ? (
            <div className="empty-orders-mobile">
              <CartIcon size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>No orders yet</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>Create your first order to get started</p>
            </div>
          ) : (
            <>
              {sortedAllOrders
                .slice(0, showAllOrders ? sortedAllOrders.length : 3)
                .map(order => {
                  const status = order._offline ? 'Pending Sync' : (order.payment_status || 'Paid');
                  const isPaid = status === 'Paid';
                  const isOffline = order._offline;
                  const isSelected = selectedOrders.includes(order.id);
                  const isSelectedForDownload = selectedForDownload.includes(order.id);
                  const isSelectableForDownload = !isOffline;
                  
                  // Bulk download mode
                  if (bulkDownloadMode) {
                    return (
                      <div 
                        key={order.id} 
                        className={`order-card-mobile selectable ${isSelectedForDownload ? 'selected download-selected' : ''} ${isOffline ? 'offline not-selectable' : ''}`}
                        onClick={isSelectableForDownload ? () => toggleDownloadSelection(order.id) : undefined}
                        style={!isSelectableForDownload ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                      >
                        <div className="order-card-checkbox">
                          {isOffline ? (
                            <div className="checkbox disabled" title="Offline orders cannot be included">
                              <WifiOffIcon size={12} />
                            </div>
                          ) : (
                            <div className={`checkbox ${isSelectedForDownload ? 'checked download' : ''}`}>
                              {isSelectedForDownload && <CheckIcon size={14} />}
                            </div>
                          )}
                        </div>
                        <div className="order-card-content">
                          <div className="order-card-header">
                            <span className="order-card-customer">{order.customer_name}</span>
                            <span className={`order-card-status ${isOffline ? 'offline' : (isPaid ? 'paid' : 'pending')}`}>
                              {isOffline && <WifiOffIcon size={10} />} {status}
                            </span>
                          </div>
                          <div className="order-card-id">
                            {isOffline ? (
                              <><WifiOffIcon size={10} /> Offline Order</>
                            ) : (
                              <>#{String(order.id).slice(0, 8)}</>
                            )}
                          </div>
                          <div className="order-card-date">
                            {new Date(order.order_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="order-card-footer">
                            <div className="order-card-amount">
                              <span className="order-card-amount-label">Total</span>
                              <span className="order-card-amount-value">{formatCurrency(order.total_sales_price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="order-card-profit">
                              <span className="order-card-amount-label">Profit</span>
                              <span className={`order-card-profit-value ${order.total_profit >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(order.total_profit, { showSign: true, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Delete mode
                  if (deleteMode) {
                    return (
                      <div 
                        key={order.id} 
                        className={`order-card-mobile selectable ${isSelected ? 'selected' : ''} ${isOffline ? 'offline' : ''}`}
                        onClick={() => toggleOrderSelection(order.id)}
                      >
                        <div className="order-card-checkbox">
                          <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                            {isSelected && <CheckIcon size={14} />}
                          </div>
                        </div>
                        <div className="order-card-content">
                          <div className="order-card-header">
                            <span className="order-card-customer">{order.customer_name}</span>
                            <span className={`order-card-status ${isOffline ? 'offline' : (isPaid ? 'paid' : 'pending')}`}>
                              {isOffline && <WifiOffIcon size={10} />} {status}
                            </span>
                          </div>
                          <div className="order-card-id">
                            {isOffline ? (
                              <><WifiOffIcon size={10} /> Offline Order</>
                            ) : (
                              <>#{String(order.id).slice(0, 8)}</>
                            )}
                          </div>
                          <div className="order-card-date">
                            {new Date(order.order_date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="order-card-footer">
                            <div className="order-card-amount">
                              <span className="order-card-amount-label">Total</span>
                              <span className="order-card-amount-value">{formatCurrency(order.total_sales_price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            </div>
                            <div className="order-card-profit">
                              <span className="order-card-amount-label">Profit</span>
                              <span className={`order-card-profit-value ${order.total_profit >= 0 ? 'positive' : 'negative'}`}>
                                {formatCurrency(order.total_profit, { showSign: true, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  // Non-delete mode - use Link for server orders, div for offline
                  if (isOffline) {
                    return (
                      <div key={order.id} className="order-card-mobile offline" onClick={() => navigate(`/orders/edit/${order.id}`)}>
                        <div className="order-card-header">
                          <span className="order-card-customer">{order.customer_name}</span>
                          <span className="order-card-status offline">
                            <WifiOffIcon size={10} /> Pending Sync
                          </span>
                        </div>
                        <div className="order-card-id">
                          <WifiOffIcon size={10} /> Offline Order
                        </div>
                        <div className="order-card-date">
                          {new Date(order.order_date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div className="order-card-footer">
                          <div className="order-card-amount">
                            <span className="order-card-amount-label">Total</span>
                            <span className="order-card-amount-value">{formatCurrency(order.total_sales_price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                          </div>
                          <div className="order-card-profit">
                            <span className="order-card-amount-label">Items</span>
                            <span className="order-card-profit-value">{order.items?.length || 0}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                            <EditIcon size={16} style={{ color: 'var(--primary-color)' }} />
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return (
                    <Link to={`/orders/${order.id}`} key={order.id} className="order-card-mobile">
                      <div className="order-card-header">
                        <span className="order-card-customer">{order.customer_name}</span>
                        <span className={`order-card-status ${isPaid ? 'paid' : 'pending'}`}>
                          {status}
                        </span>
                      </div>
                      <div className="order-card-id">
                        #{String(order.id).slice(0, 8)}
                      </div>
                      <div className="order-card-date">
                        {new Date(order.order_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div className="order-card-footer">
                        <div className="order-card-amount">
                          <span className="order-card-amount-label">Total</span>
                          <span className="order-card-amount-value">{formatCurrency(order.total_sales_price, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="order-card-profit">
                          <span className="order-card-amount-label">Profit</span>
                          <span className={`order-card-profit-value ${order.total_profit >= 0 ? 'positive' : 'negative'}`}>
                            {formatCurrency(order.total_profit, { showSign: true, minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginLeft: 'auto' }}>
                          {order.payment_status !== 'Paid' && (
                            <button
                              type="button"
                              className="order-card-edit-btn"
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); navigate(`/orders/edit/${order.id}`); }}
                              style={{ background: 'none', border: 'none', color: 'var(--primary-color)', padding: '4px', display: 'flex' }}
                            >
                              <EditIcon size={16} />
                            </button>
                          )}
                          <EyeIcon className="order-card-arrow" style={{ margin: 0 }} />
                        </div>
                      </div>
                    </Link>
                  );
                })
              }
              {allOrders.length > 3 && (
                <button 
                  className="view-all-orders-btn"
                  onClick={() => setShowAllOrders(!showAllOrders)}
                >
                  {showAllOrders 
                    ? 'Show Less' 
                    : `View All ${allOrders.length} Orders`
                  }
                </button>
              )}
              <div className="view-all-orders">
                <span className="view-all-text">
                  {showAllOrders 
                    ? `Showing all ${allOrders.length} orders`
                    : allOrders.length > 3 
                      ? `Showing 3 of ${allOrders.length} orders` 
                      : `${allOrders.length} order${allOrders.length === 1 ? '' : 's'} total`
                  }
                </span>
              </div>
            </>
          )}
        </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <div className="modal-header">
              <h3 style={{ margin: 0, color: 'var(--danger-text)' }}>
                <AlertCircleIcon style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                Delete Orders
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ margin: '0 0 12px 0', fontSize: '15px' }}>
                Are you sure you want to delete {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''}?
              </p>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Deleted orders will be moved to the recycle bin and permanently deleted after 50 days.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={handleDeleteSelected} disabled={deleting}>
                {deleting ? (
                  <><span className="btn-spinner"></span> Deleting...</>
                ) : (
                  <><DeleteIcon size={16} /> Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;
