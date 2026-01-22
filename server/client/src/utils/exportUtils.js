import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {string} fileName - File name without extension
 */
export const exportToCSV = (data, fileName) => {
  const csv = Papa.unparse(data);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  saveAs(blob, `${fileName}.csv`);
};

/**
 * Export data to PDF
 * @param {Array} columns - Table columns { header: string, dataKey: string }
 * @param {Array} data - Table data
 * @param {Object} options - { title: string, fileName: string, subtitle: string }
 */
export const exportToPDF = (columns, data, options = {}) => {
  const { title = 'Report', fileName = 'report', subtitle = '', orientation = 'portrait' } = options;
  const doc = new jsPDF({ orientation });

  // Add Title
  doc.setFontSize(20);
  doc.setTextColor(40);
  doc.text(title, 14, 22);

  // Add Subtitle/Date
  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(subtitle || `Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

  // Add Table
  autoTable(doc, {
    columns,
    body: data,
    startY: 35,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [37, 99, 235], textColor: 255 }, // Theme primary color
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { top: 35 },
  });

  doc.save(`${fileName}.pdf`);
};

/**
 * Formatter for Inventory Data
 */
export const exportInventory = (products, type = 'pdf') => {
  const data = products.map((p, index) => ({
    sn: index + 1,
    sku: p.sku || 'N/A',
    name: p.product_name || p.name,
    category: p.category || 'Uncategorized',
    brand: p.brand_name || 'N/A',
    stock: p.stock_quantity,
    price: p.sales_price,
    cost: p.cost_of_production || 0,
    value: (p.stock_quantity * p.sales_price).toFixed(2),
    status: p.stock_quantity <= (p.min_stock_threshold || 5) ? 'Low Stock' : 'In Stock'
  }));

  if (type === 'csv') {
    // For CSV, we can also add S/N
    exportToCSV(data, 'inventory_report');
  } else {
    const columns = [
      { header: 'S/N', dataKey: 'sn' },
      { header: 'SKU', dataKey: 'sku' },
      { header: 'Brand', dataKey: 'brand' },
      { header: 'Product Name', dataKey: 'name' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Stock', dataKey: 'stock' },
      { header: 'Price', dataKey: 'price' },
      { header: 'Cost', dataKey: 'cost' },
      { header: 'Value', dataKey: 'value' },
      { header: 'Status', dataKey: 'status' }
    ];
    exportToPDF(columns, data, { title: 'Inventory Report', fileName: 'inventory_report' });
  }
};

/**
 * Formatter for Orders Data
 */
export const exportOrders = (orders, type = 'pdf') => {
  const data = orders.map((o, index) => ({
    sn: index + 1,
    id: o.orderId || o.id?.substring(0, 8) || 'N/A',
    date: new Date(o.order_date?.seconds * 1000 || o.order_date).toLocaleDateString(),
    customer: o.customer_name || 'Walk-in',
    items: o.items?.length || 0,
    total: o.total_sales_price || 0,
    profit: o.total_profit || 0,
    payment: o.payment_status || 'Pending',
    status: o.status || 'Processing'
  }));

  if (type === 'csv') {
    exportToCSV(data, 'orders_report');
  } else {
    const columns = [
      { header: 'S/N', dataKey: 'sn' },
      { header: 'Order ID', dataKey: 'id' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Customer', dataKey: 'customer' },
      { header: 'Items', dataKey: 'items' },
      { header: 'Total', dataKey: 'total' },
      { header: 'Profit', dataKey: 'profit' },
      { header: 'Payment', dataKey: 'payment' },
      { header: 'Status', dataKey: 'status' }
    ];
    exportToPDF(columns, data, { title: 'Orders Report', fileName: 'orders_report' });
  }
};

/**
 * Formatter for Financial Report
 */
export const exportFinancialReport = (data, type = 'pdf') => {
  // Financial data usually comes from Analytics calculations
  const { summary, transactions = [] } = data;
  
  if (type === 'csv') {
    const csvData = transactions.map((t, index) => ({
      sn: index + 1,
      date: t.date,
      type: t.type,
      reference: t.reference,
      revenue: t.revenue || 0,
      cost: t.cost || 0,
      profit: (t.revenue || 0) - (t.cost || 0),
      paymentMethod: t.method
    }));
    exportToCSV(csvData, 'financial_report');
  } else {
    const columns = [
      { header: 'S/N', dataKey: 'sn' },
      { header: 'Date', dataKey: 'date' },
      { header: 'Type', dataKey: 'type' },
      { header: 'Reference', dataKey: 'reference' },
      { header: 'Revenue', dataKey: 'revenue' },
      { header: 'Cost', dataKey: 'cost' },
      { header: 'Profit', dataKey: 'profit' }
    ];

    const tableData = transactions.map((t, index) => ({
      sn: index + 1,
      ...t,
      profit: (t.revenue || 0) - (t.cost || 0)
    }));

    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text('Financial Report', 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

    // Summary section
    doc.setFontSize(14);
    doc.text('Summary', 14, 45);
    doc.setFontSize(10);
    doc.text(`Total Revenue: ${summary.totalRevenue}`, 14, 55);
    doc.text(`Total Cost: ${summary.totalCost}`, 14, 62);
    doc.text(`Total Profit: ${summary.totalProfit}`, 14, 69);
    doc.text(`Profit Margin: ${summary.margin}%`, 14, 76);

    autoTable(doc, {
      columns,
      body: tableData,
      startY: 85,
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save('financial_report.pdf');
  }
};

/**
 * Formatter for Tax & Financial Data
 */
export const exportTaxReport = (financials, type = 'pdf') => {
  const { revenue, profit, taxType, pitDetails, citRate, calculateCIT, calculateEDT, calculateVAT, totalTaxLiability, netProfitAfterTax } = financials;
  
  const reportTitle = `Tax Compliance Report (${taxType === 'CIT' ? 'Corporate' : 'Individual/PIT'})`;
  const fileName = `tax_report_${new Date().toISOString().split('T')[0]}`;
  
  if (type === 'csv') {
    const csvData = [
      { Label: 'Status', Value: taxType === 'CIT' ? 'Corporate Entity' : 'Individual/Sole Proprietorship' },
      { Label: 'Total Revenue', Value: revenue },
      { Label: 'Total Profit (Assessable)', Value: profit },
      { Label: 'Tax Liability', Value: totalTaxLiability },
      { Label: 'VAT (7.5%)', Value: calculateVAT() },
      { Label: 'Net After Tax', Value: netProfitAfterTax }
    ];
    exportToCSV(csvData, fileName);
  } else {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 0);
    doc.text('RYME INVENTORY SYSTEM', 14, 20);
    
    doc.setFontSize(14);
    doc.text(reportTitle, 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${new Date().toLocaleDateString('en-NG')}`, 14, 38);
    doc.line(14, 42, 196, 42);

    // Summary Section
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Financial Summary', 14, 52);
    
    autoTable(doc, {
      startY: 56,
      body: [
        ['Annual Revenue', `N${revenue.toLocaleString()}`],
        ['Gross Assessable Profit', `N${profit.toLocaleString()}`],
        ['Total Tax Liability', `N${totalTaxLiability.toLocaleString()}`],
        ['Net Profit After Tax', `N${netProfitAfterTax.toLocaleString()}`]
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
    });

    // Breakdown Section
    const breakdownStartY = doc.lastAutoTable.finalY + 15;
    doc.text('Detailed Breakdown', 14, breakdownStartY);

    const breakdownBody = taxType === 'CIT' ? [
        ['CIT (Company Income Tax)', `${(citRate * 100)}% of Profit`, `N${calculateCIT().toLocaleString()}`],
        ['EDT (Education Tax)', '3.0% of Profit', `N${calculateEDT().toLocaleString()}`],
        ['VAT (Value Added Tax)', '7.5% of Revenue', `N${calculateVAT().toLocaleString()}`]
    ] : [
        ['Consolidated Relief Allowance', 'Higher of 200k/1% GI + 20% GI', `(N${pitDetails.cra.toLocaleString()})`],
        ['Statutory Pension', '8% of Gross Income', `(N${pitDetails.pension.toLocaleString()})`],
        ['PIT (Personal Income Tax)', 'Graduated Scale (7%-24%)', `N${pitDetails.finalTax.toLocaleString()}`],
        ['VAT (Value Added Tax)', '7.5% of Revenue', `N${calculateVAT().toLocaleString()}`]
    ];

    autoTable(doc, {
      startY: breakdownStartY + 4,
      head: [['Tax Component', 'Rate/Basis', 'Amount']],
      body: breakdownBody,
      theme: 'striped',
      headStyles: { fillColor: [0, 0, 0] },
      styles: { fontSize: 9 }
    });

    // Footer
    const footerY = doc.lastAutoTable.finalY + 20;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Disclaimer: This report is an automated assessment based on transactions in RYME Inventory.', 14, footerY);
    doc.text('It should be used for compliance guidance only. Consult a certified tax professional for official filing.', 14, footerY + 5);

    doc.save(`${fileName}.pdf`);
  }
};
