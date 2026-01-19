import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  runTransaction,
  where,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import offlineManager from './utils/offlineManager';

// Re-export db for use in other components
export { db };

const productsRef = collection(db, 'products');
const ordersRef = collection(db, 'orders');
const activityLogRef = collection(db, 'activity_log');
const recycleBinRef = collection(db, 'recycle_bin');

const normalizeDoc = (snap) => ({ id: snap.id, ...snap.data() });

// Helper to check if we're online
const isOnline = () => navigator.onLine;

// Helper to wrap operations with offline support
const withOfflineSupport = async (method, path, payload, operation) => {
  if (!isOnline()) {
    // Queue the operation for later sync
    await offlineManager.addToQueue({
      type: path.split('/')[1], // 'products', 'orders', etc.
      method,
      path,
      payload,
      queuedAt: new Date().toISOString()
    });
    
    // Return a temporary response for optimistic UI
    return { 
      data: { 
        data: { 
          id: `temp_${Date.now()}`, 
          ...payload,
          _offline: true 
        } 
      },
      _queued: true
    };
  }
  
  // If online, execute the operation normally
  return operation();
};

const computePricing = ({ cost_of_production, markup_percentage, markup_amount }) => {
  const cost = Number(cost_of_production || 0);
  const percentProvided = markup_percentage !== undefined && markup_percentage !== null && markup_percentage !== '';
  const amountProvided = markup_amount !== undefined && markup_amount !== null && markup_amount !== '';

  if (!amountProvided && !percentProvided) {
    throw new Error('Markup percentage or markup amount is required.');
  }

  const percentValue = percentProvided ? Number(markup_percentage) : 0;
  const amountValue = amountProvided ? Number(markup_amount) : 0;
  const appliedMarkup = amountProvided ? amountValue : (cost * percentValue / 100);
  const sales_price = cost + appliedMarkup;
  const profit = sales_price - cost;

  return {
    cost_of_production: cost,
    markup_percentage: amountProvided ? 0 : percentValue,
    markup_amount: amountProvided ? amountValue : 0,
    sales_price,
    profit
  };
};

const api = {
  async get(path) {
    if (path === '/products') {
      const snapshot = await getDocs(productsRef);
      return { data: { data: snapshot.docs.map(normalizeDoc) } };
    }

    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      const snapshot = await getDoc(doc(productsRef, id));
      return { data: { data: snapshot.exists() ? normalizeDoc(snapshot) : null } };
    }

    if (path === '/orders') {
      const snapshot = await getDocs(query(ordersRef, orderBy('order_date', 'desc')));
      return { data: { data: snapshot.docs.map(normalizeDoc) } };
    }

    if (path.startsWith('/orders/')) {
      const id = path.split('/')[2];
      const snapshot = await getDoc(doc(ordersRef, id));
      return { data: { data: snapshot.exists() ? normalizeDoc(snapshot) : null } };
    }

    if (path === '/dashboard-stats') {
      const ordersSnapshot = await getDocs(ordersRef);
      const orders = ordersSnapshot.docs.map(normalizeDoc);

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

      return { data: { data: { revenueChart, topProducts } } };
    }

    throw new Error(`Unknown GET endpoint: ${path}`);
  },

  subscribe(path, callback) {
    if (path === '/products') {
      return onSnapshot(productsRef, (snapshot) => {
        const data = snapshot.docs.map(normalizeDoc);
        callback({ data });
      });
    }

    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      return onSnapshot(doc(productsRef, id), (snapshot) => {
        const data = snapshot.exists() ? normalizeDoc(snapshot) : null;
        callback({ data });
      });
    }

    if (path === '/orders') {
      const q = query(ordersRef, orderBy('order_date', 'desc'));
      return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(normalizeDoc);
        callback({ data });
      });
    }

    if (path.startsWith('/orders/')) {
      const id = path.split('/')[2];
      return onSnapshot(doc(ordersRef, id), (snapshot) => {
        const data = snapshot.exists() ? normalizeDoc(snapshot) : null;
        callback({ data });
      });
    }

    if (path === '/dashboard-stats') {
      return onSnapshot(ordersRef, (snapshot) => {
        const orders = snapshot.docs.map(normalizeDoc);
        
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

        callback({ data: { revenueChart, topProducts } });
      });
    }

    throw new Error(`Unknown SUBSCRIBE endpoint: ${path}`);
  },

  async post(path, payload) {
    if (path === '/products') {
      const pricing = computePricing(payload);
      const docRef = await addDoc(productsRef, {
        // Segmented product identity fields
        brand_name: payload.brand_name || '',
        product_name: payload.product_name || '',
        volume_size: payload.volume_size || '',
        sorting_code: payload.sorting_code || '',
        // Combined display name
        name: payload.name,
        description: payload.description || '',
        stock_quantity: Number(payload.stock_quantity || 0),
        ...pricing
      });

      const snapshot = await getDoc(docRef);
      return { data: { data: normalizeDoc(snapshot) } };
    }

    if (path === '/orders') {
      const { customer_name, customer_address, items, discount } = payload;
      if (!customer_name || !items || items.length === 0) {
        throw new Error('Order must contain items.');
      }

      const productSnapshots = await Promise.all(
        items.map((item) => getDoc(doc(productsRef, String(item.product_id))))
      );

      const batch = writeBatch(db);
      const orderItems = [];
      let total_sales_price = 0;
      let total_profit = 0;

      items.forEach((item, index) => {
        const snapshot = productSnapshots[index];
        if (!snapshot.exists()) {
          throw new Error('Product not found for order item.');
        }

        const product = normalizeDoc(snapshot);
        const quantity = Number(item.quantity || 0);
        if (product.stock_quantity < quantity) {
          throw new Error(`Insufficient stock for ${product.name}.`);
        }
        
        const discountPct = Number(item.discount_percentage) || 0;
        const effectivePrice = product.sales_price * (1 - discountPct / 100);
        const lineTotal = effectivePrice * quantity;
        const lineProfit = (effectivePrice - product.cost_of_production) * quantity;

        total_sales_price += lineTotal;
        total_profit += lineProfit;

        orderItems.push({
          product_id: product.id,
          product_name: product.name,
          quantity,
          sales_price_at_time: product.sales_price,
          discount_percentage: discountPct,
          profit_at_time: (effectivePrice - product.cost_of_production),
          sorting_code: product.sorting_code
        });

        // Stock is NOT reduced here anymore. It will be reduced when marked as Paid.
      });

      // Apply Discount
      let discountAmount = 0;
      if (discount && discount.value > 0) {
        if (discount.type === 'percentage') {
          discountAmount = total_sales_price * (discount.value / 100);
        } else if (discount.type === 'fixed') {
          discountAmount = discount.value;
        }
      }

      const final_total_sales_price = total_sales_price - discountAmount;
      const final_total_profit = total_profit - discountAmount;

      const orderDoc = await addDoc(ordersRef, {
        customer_name,
        customer_address: customer_address || '',
        order_date: new Date().toISOString(),
        payment_status: 'Pending', // Default status
        subtotal: total_sales_price,
        discount: discount || { type: 'none', value: 0 },
        total_sales_price: final_total_sales_price,
        total_profit: final_total_profit,
        items: orderItems
      });

      // Log activity
      await api.logActivity('create', 'order', `New order created for ${customer_name} - ${orderItems.length} items`, { id: orderDoc.id, customer_name, total_sales_price: final_total_sales_price });

      const snapshot = await getDoc(orderDoc);
      return { data: { data: normalizeDoc(snapshot) } };
    }

    throw new Error(`Unknown POST endpoint: ${path}`);
  },

  async put(path, payload) {
    if (path.startsWith('/orders/')) {
       // e.g. /orders/123
       const id = path.split('/')[2];
       
       if (payload.action === 'mark_paid') {
         // Run as a transaction to ensure stock is available and reduced atomically
         await runTransaction(db, async (transaction) => {
            const orderRef = doc(ordersRef, id);
            const orderSnap = await transaction.get(orderRef);
            
            if (!orderSnap.exists()) {
              throw new Error("Order not found");
            }

            const orderData = orderSnap.data();
            if (orderData.payment_status === 'Paid') {
               throw new Error("Order is already paid");
            }

            // First, read all product data
            const productUpdates = [];
            for (const item of orderData.items) {
               const productRef = doc(productsRef, String(item.product_id));
               const productSnap = await transaction.get(productRef);
               
               if (!productSnap.exists()) {
                 throw new Error(`Product ${item.product_name} not found`);
               }
               
               const productData = productSnap.data();
               const currentStock = Number(productData.stock_quantity || 0);
               
               if (currentStock < item.quantity) {
                 throw new Error(`Insufficient stock for ${item.product_name}. Available: ${currentStock}`);
               }
               
               productUpdates.push({
                 ref: productRef,
                 newStock: currentStock - item.quantity
               });
            }

            // Then submit all writes
            for (const update of productUpdates) {
               transaction.update(update.ref, {
                 stock_quantity: update.newStock
               });
            }

            // Update order status
            transaction.update(orderRef, {
              payment_status: 'Paid',
              paid_at: new Date().toISOString()
            });
         });

         const snapshot = await getDoc(doc(ordersRef, id));
         return { data: { data: normalizeDoc(snapshot) } };
       }

       // General order update
       const { customer_name, customer_address, items, discount } = payload;
       
       // Get the existing order to compare changes
       const existingOrderSnap = await getDoc(doc(ordersRef, id));
       const existingOrder = existingOrderSnap.exists() ? existingOrderSnap.data() : null;
       const existingItems = existingOrder?.items || [];
       
       // Calculate new totals
       let total_sales_price = 0;
       let total_profit = 0;
       const orderItems = [];

       const productSnapshots = await Promise.all(
         items.map(item => getDoc(doc(productsRef, String(item.product_id))))
       );

       items.forEach((item, index) => {
         const snapshot = productSnapshots[index];
         if (!snapshot.exists()) {
           throw new Error('Product not found for order item.');
         }

         const product = normalizeDoc(snapshot);
         const quantity = Number(item.quantity || 0);

         const discountPct = Number(item.discount_percentage) || 0;
         const effectivePrice = product.sales_price * (1 - discountPct / 100);
         const lineTotal = effectivePrice * quantity;
         const lineProfit = (effectivePrice - product.cost_of_production) * quantity;

         total_sales_price += lineTotal;
         total_profit += lineProfit;

         orderItems.push({
           product_id: product.id,
           product_name: product.name,
           quantity,
           sales_price_at_time: product.sales_price,
           discount_percentage: discountPct,
           profit_at_time: (effectivePrice - product.cost_of_production),
           sorting_code: product.sorting_code
         });
       });

       let discountAmount = 0;
       if (discount && discount.value > 0) {
         if (discount.type === 'percentage') {
           discountAmount = total_sales_price * (discount.value / 100);
         } else if (discount.type === 'fixed') {
           discountAmount = discount.value;
         }
       }

       const final_total_sales_price = total_sales_price - discountAmount;
       const final_total_profit = total_profit - discountAmount;

       const orderRef = doc(ordersRef, id);
       await updateDoc(orderRef, {
         customer_name,
         customer_address: customer_address || '',
         subtotal: total_sales_price,
         discount: discount || { type: 'none', value: 0 },
         total_sales_price: final_total_sales_price,
         total_profit: final_total_profit,
         items: orderItems,
         updated_at: new Date().toISOString()
       });

       // Calculate what changed (added/removed/modified items)
       const changes = {
         added: [],
         removed: [],
         modified: []
       };

       // Find added/modified items
       orderItems.forEach(newItem => {
         const existingItem = existingItems.find(e => e.product_id === newItem.product_id);
         if (!existingItem) {
           changes.added.push({ product_name: newItem.product_name, quantity: newItem.quantity });
         } else if (existingItem.quantity !== newItem.quantity || existingItem.discount_percentage !== newItem.discount_percentage) {
           changes.modified.push({
             product_name: newItem.product_name,
             old_quantity: existingItem.quantity,
             new_quantity: newItem.quantity,
             old_discount: existingItem.discount_percentage || 0,
             new_discount: newItem.discount_percentage || 0
           });
         }
       });

       // Find removed items
       existingItems.forEach(existingItem => {
         const stillExists = orderItems.find(n => n.product_id === existingItem.product_id);
         if (!stillExists) {
           changes.removed.push({ product_name: existingItem.product_name, quantity: existingItem.quantity });
         }
       });

       // Log activity with detailed changes
       await api.logActivity('update', 'order', `Order #${id.slice(0, 8)} updated - ${orderItems.length} items`, { 
         id, 
         customer_name, 
         total_sales_price: final_total_sales_price,
         changes,
         items: orderItems
       });

       const snapshot = await getDoc(orderRef);
       return { data: { data: normalizeDoc(snapshot) } };
    }

    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      const pricing = computePricing(payload);
      const docRef = doc(productsRef, id);
      await updateDoc(docRef, {
        // Segmented product identity fields
        brand_name: payload.brand_name || '',
        product_name: payload.product_name || '',
        volume_size: payload.volume_size || '',
        sorting_code: payload.sorting_code || '',
        // Combined display name
        name: payload.name,
        description: payload.description || '',
        stock_quantity: Number(payload.stock_quantity || 0),
        ...pricing
      });
      const snapshot = await getDoc(docRef);
      return { data: { data: normalizeDoc(snapshot) } };
    }

    throw new Error(`Unknown PUT endpoint: ${path}`);
  },

  async delete(path) {
    if (path.startsWith('/products/')) {
      const id = path.split('/')[2];
      
      // Get product data before deleting for activity log
      const productSnap = await getDoc(doc(productsRef, id));
      const productData = productSnap.exists() ? normalizeDoc(productSnap) : null;
      
      await deleteDoc(doc(productsRef, id));
      
      // Log activity
      if (productData) {
        await api.logActivity('delete', 'product', productData.name, productData);
      }
      
      return { data: { data: { id } } };
    }

    if (path.startsWith('/orders/')) {
      const id = path.split('/')[2];
      
      // Get order data before deleting for recycle bin
      const orderSnap = await getDoc(doc(ordersRef, id));
      if (!orderSnap.exists()) {
        throw new Error('Order not found');
      }
      
      const orderData = normalizeDoc(orderSnap);
      
      // Move to recycle bin
      await addDoc(recycleBinRef, {
        ...orderData,
        original_id: id,
        deleted_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000).toISOString(), // 50 days
        type: 'order'
      });
      
      // Delete from orders
      await deleteDoc(doc(ordersRef, id));
      
      // Log activity
      await api.logActivity('delete', 'order', `Order #${id.slice(0, 8)} - ${orderData.customer_name}`, orderData);
      
      return { data: { data: { id } } };
    }

    if (path.startsWith('/recycle-bin/')) {
      const id = path.split('/')[2];
      await deleteDoc(doc(recycleBinRef, id));
      
      // Log permanent deletion
      await api.logActivity('permanent_delete', 'recycle_bin', `Permanently deleted item #${id.slice(0, 8)}`);
      
      return { data: { data: { id } } };
    }

    throw new Error(`Unknown DELETE endpoint: ${path}`);
  },

  // Activity Log functions
  async logActivity(action, entity_type, description, data = null) {
    await addDoc(activityLogRef, {
      action,
      entity_type,
      description,
      data: data ? JSON.stringify(data) : null,
      timestamp: new Date().toISOString()
    });
  },

  async getActivityLog() {
    const snapshot = await getDocs(query(activityLogRef, orderBy('timestamp', 'desc')));
    return snapshot.docs.map(normalizeDoc);
  },

  async getRecycleBin() {
    const snapshot = await getDocs(query(recycleBinRef, orderBy('deleted_at', 'desc')));
    return snapshot.docs.map(normalizeDoc);
  },

  async restoreFromRecycleBin(id) {
    const recycleBinDocRef = doc(recycleBinRef, id);
    const snap = await getDoc(recycleBinDocRef);
    
    if (!snap.exists()) {
      throw new Error('Item not found in recycle bin');
    }
    
    const data = snap.data();
    const { original_id, deleted_at, expires_at, type, ...originalData } = data;
    
    if (type === 'order') {
      // Restore to orders collection
      await addDoc(ordersRef, {
        ...originalData,
        restored_at: new Date().toISOString()
      });
    }
    
    // Remove from recycle bin
    await deleteDoc(recycleBinDocRef);
    
    // Log activity
    await api.logActivity('restore', type, `Restored ${type} #${original_id.slice(0, 8)}`, originalData);
    
    return { success: true };
  },

  async deleteMultipleOrders(orderIds) {
    const results = await Promise.all(
      orderIds.map(id => api.delete(`/orders/${id}`))
    );
    return results;
  },

  async cleanupExpiredRecycleBin() {
    const now = new Date().toISOString();
    const snapshot = await getDocs(recycleBinRef);
    const batch = writeBatch(db);
    let count = 0;
    
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.expires_at && data.expires_at < now) {
        batch.delete(docSnap.ref);
        count++;
      }
    });
    
    if (count > 0) {
      await batch.commit();
      await api.logActivity('auto_cleanup', 'recycle_bin', `Auto-deleted ${count} expired items`);
    }
    
    return count;
  }
};

export default api;
