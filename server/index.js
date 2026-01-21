const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Database Setup
const dbPath = path.resolve(__dirname, 'inventory.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    createTables();
  }
});

function createTables() {
  db.serialize(() => {
    // Products Table
    db.run(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      cost_of_production REAL NOT NULL,
      markup_percentage REAL DEFAULT 0,
      markup_amount REAL DEFAULT 0,
      sales_price REAL NOT NULL,
      profit REAL NOT NULL,
      stock_quantity INTEGER DEFAULT 0
    )`);

    db.run(`ALTER TABLE products ADD COLUMN markup_amount REAL DEFAULT 0`, (err) => {
      if (err && !String(err.message || '').includes('duplicate column')) {
        console.error('Error adding markup_amount column', err.message);
      }
    });

    db.run(`ALTER TABLE products ADD COLUMN brand_name TEXT`, (err) => {
      if (err && !String(err.message || '').includes('duplicate column')) {
        console.error('Error adding brand_name column', err.message);
      }
    });

    db.run(`ALTER TABLE products ADD COLUMN product_name TEXT`, (err) => {
      if (err && !String(err.message || '').includes('duplicate column')) {
        console.error('Error adding product_name column', err.message);
      }
    });

    db.run(`ALTER TABLE products ADD COLUMN volume_size TEXT`, (err) => {
      if (err && !String(err.message || '').includes('duplicate column')) {
        console.error('Error adding volume_size column', err.message);
      }
    });

    db.run(`ALTER TABLE products ADD COLUMN sorting_code TEXT`, (err) => {
      if (err && !String(err.message || '').includes('duplicate column')) {
        console.error('Error adding sorting_code column', err.message);
      }
    });

    db.run(`ALTER TABLE products ADD COLUMN category TEXT`, (err) => {
      if (err && !String(err.message || '').includes('duplicate column')) {
        console.error('Error adding category column', err.message);
      }
    });

    // Categories Table
    db.run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )`);

    // Orders Table
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      order_date TEXT DEFAULT CURRENT_TIMESTAMP,
      total_sales_price REAL DEFAULT 0,
      total_profit REAL DEFAULT 0
    )`);

    // Order Items Table
    db.run(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      sales_price_at_time REAL NOT NULL,
      profit_at_time REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`);
  });
}

// API Routes

// Get all products
app.get('/api/products', (req, res) => {
  db.all('SELECT * FROM products', [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Create a new product
app.post('/api/products', (req, res) => {
  const { 
    name, 
    brand_name, 
    product_name, 
    volume_size, 
    sorting_code, 
    category,
    description, 
    cost_of_production, 
    markup_percentage, 
    markup_amount, 
    stock_quantity 
  } = req.body;

  const cost = Number(cost_of_production);
  const percentProvided = markup_percentage !== undefined && markup_percentage !== null && markup_percentage !== '';
  const amountProvided = markup_amount !== undefined && markup_amount !== null && markup_amount !== '';

  if (!amountProvided && !percentProvided) {
    return res.status(400).json({ error: 'Markup percentage or markup amount is required.' });
  }

  const percentValue = percentProvided ? Number(markup_percentage) : 0;
  const amountValue = amountProvided ? Number(markup_amount) : 0;

  const appliedMarkup = amountProvided ? amountValue : (cost * percentValue / 100);
  const sales_price = cost + appliedMarkup;
  const profit = sales_price - cost;

  const sql = `INSERT INTO products (
    name, brand_name, product_name, volume_size, sorting_code, category,
    description, cost_of_production, markup_percentage, markup_amount, 
    sales_price, profit, stock_quantity
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  
  const params = [
    name, brand_name, product_name, volume_size, sorting_code, category,
    description, cost, amountProvided ? 0 : percentValue, amountProvided ? amountValue : 0, 
    sales_price, profit, stock_quantity
  ];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: { id: this.lastID, ...req.body, sales_price, profit }
    });
  });
});

// Update a product
app.put('/api/products/:id', (req, res) => {
  const { 
    name, 
    brand_name, 
    product_name, 
    volume_size, 
    sorting_code, 
    category,
    description, 
    cost_of_production, 
    markup_percentage, 
    markup_amount, 
    stock_quantity 
  } = req.body;
  const productId = req.params.id;

  const cost = Number(cost_of_production);
  const percentProvided = markup_percentage !== undefined && markup_percentage !== null && markup_percentage !== '';
  const amountProvided = markup_amount !== undefined && markup_amount !== null && markup_amount !== '';

  if (!amountProvided && !percentProvided) {
    return res.status(400).json({ error: 'Markup percentage or markup amount is required.' });
  }

  const percentValue = percentProvided ? Number(markup_percentage) : 0;
  const amountValue = amountProvided ? Number(markup_amount) : 0;

  const appliedMarkup = amountProvided ? amountValue : (cost * percentValue / 100);
  const sales_price = cost + appliedMarkup;
  const profit = sales_price - cost;

  const sql = `UPDATE products SET 
    name = ?, brand_name = ?, product_name = ?, volume_size = ?, 
    sorting_code = ?, category = ?, description = ?, cost_of_production = ?, 
    markup_percentage = ?, markup_amount = ?, sales_price = ?, profit = ?, 
    stock_quantity = ? 
    WHERE id = ?`;
    
  const params = [
    name, brand_name, product_name, volume_size, sorting_code, category,
    description, cost, amountProvided ? 0 : percentValue, amountProvided ? amountValue : 0, 
    sales_price, profit, stock_quantity, productId
  ];

  db.run(sql, params, function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({
      message: 'success',
      data: { id: productId, ...req.body, sales_price, profit }
    });
  });
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
  const productId = req.params.id;
  
  db.run(`DELETE FROM products WHERE id = ?`, [productId], function (err) {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ message: 'success', deletedId: productId });
  });
});

// Category Routes
app.get('/api/categories', (req, res) => {
  db.all('SELECT * FROM categories ORDER BY name ASC', [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

app.post('/api/categories', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  db.run('INSERT INTO categories (name) VALUES (?)', [name], function(err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Category already exists' });
      }
      return res.status(400).json({ error: err.message });
    }
    res.json({ data: { id: this.lastID, name } });
  });
});

// Get dashboard stats
app.get('/api/dashboard-stats', (req, res) => {
  const stats = {};

  // 1. Revenue over time (last 7 days or all time grouped by day)
  const revenueSql = `
    SELECT date(order_date) as date, SUM(total_sales_price) as revenue, SUM(total_profit) as profit 
    FROM orders 
    GROUP BY date(order_date) 
    ORDER BY date(order_date) ASC
  `;

  // 2. Top selling products
  const topProductsSql = `
    SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.sales_price_at_time) as total_revenue
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 5
  `;

  db.all(revenueSql, [], (err, revenueRows) => {
    if (err) return res.status(400).json({ error: err.message });
    stats.revenueChart = revenueRows;

    db.all(topProductsSql, [], (err, productRows) => {
      if (err) return res.status(400).json({ error: err.message });
      stats.topProducts = productRows;
      
      res.json({ data: stats });
    });
  });
});

// Get all orders
app.get('/api/orders', (req, res) => {
  db.all('SELECT * FROM orders ORDER BY order_date DESC', [], (err, rows) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.json({ data: rows });
  });
});

// Create a new order
app.post('/api/orders', (req, res) => {
  const { customer_name, items } = req.body; // items is an array of { product_id, quantity }

  if (!items || items.length === 0) {
    return res.status(400).json({ error: "Order must contain items" });
  }

  // We need to calculate totals and insert items transactionally
  // For simplicity in sqlite without complex transactions in node, we'll do it sequentially but ideally should be a transaction.
  
  // 1. Fetch products to get current prices
  const productIds = items.map(i => i.product_id);
  const placeholders = productIds.map(() => '?').join(',');
  
  db.all(`SELECT * FROM products WHERE id IN (${placeholders})`, productIds, (err, products) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    let total_sales_price = 0;
    let total_profit = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = products.find(p => p.id === item.product_id);
      if (!product) continue;

      const itemTotalSP = product.sales_price * item.quantity;
      const itemTotalProfit = product.profit * item.quantity;

      total_sales_price += itemTotalSP;
      total_profit += itemTotalProfit;

      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        sales_price_at_time: product.sales_price,
        profit_at_time: product.profit
      });
    }

    // 2. Insert Order
    const insertOrderSql = `INSERT INTO orders (customer_name, total_sales_price, total_profit) VALUES (?, ?, ?)`;
    db.run(insertOrderSql, [customer_name, total_sales_price, total_profit], function(err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      const orderId = this.lastID;

      // 3. Insert Order Items and Deduct Stock
      const insertItemSql = `INSERT INTO order_items (order_id, product_id, quantity, sales_price_at_time, profit_at_time) VALUES (?, ?, ?, ?, ?)`;
      const updateStockSql = `UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`;
      
      let completed = 0;
      orderItemsData.forEach(item => {
        db.run(insertItemSql, [orderId, item.product_id, item.quantity, item.sales_price_at_time, item.profit_at_time], (err) => {
            if (err) console.error('Error inserting order item:', err);
            
            // Deduct stock
            db.run(updateStockSql, [item.quantity, item.product_id], (err) => {
              if (err) console.error('Error updating stock:', err);
              
              completed++;
              if (completed === orderItemsData.length) {
                  res.json({
                      message: 'success',
                      data: { id: orderId, customer_name, total_sales_price, total_profit, items: orderItemsData }
                  });
              }
            });
        });
      });
    });
  });
});

// Get order details
app.get('/api/orders/:id', (req, res) => {
    const orderId = req.params.id;
    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        
        db.all(`
            SELECT oi.*, p.name as product_name 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ?`, 
            [orderId], 
            (err, items) => {
                if (err) {
                    return res.status(400).json({ error: err.message });
                }
                res.json({ data: { ...order, items } });
            }
        );
    });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
