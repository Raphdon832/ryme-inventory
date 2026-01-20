/**
 * Offline Manager - Handles offline queue and sync operations
 */

import soundManager from './soundManager';

const DB_NAME = 'RymeOfflineDB';
const DB_VERSION = 2;
const STORE_NAME = 'pendingOperations';
const OFFLINE_ORDERS_STORE = 'offlineOrders';

class OfflineManager {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.listeners = new Set();
    this.syncInProgress = false;
    
    // Listen to online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Initialize IndexedDB
    this.initDB();
  }

  // Initialize IndexedDB for storing pending operations
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => {
        console.error('Failed to open offline database');
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Store for offline-created orders (for optimistic UI)
        if (!db.objectStoreNames.contains(OFFLINE_ORDERS_STORE)) {
          const ordersStore = db.createObjectStore(OFFLINE_ORDERS_STORE, { 
            keyPath: 'tempId'
          });
          ordersStore.createIndex('status', 'status', { unique: false });
          ordersStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // Ensure DB is ready
  async ensureDB() {
    if (!this.db) {
      await this.initDB();
    }
    return this.db;
  }

  // Add a pending operation to the queue
  async addToQueue(operation) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      const item = {
        ...operation,
        timestamp: Date.now(),
        status: 'pending',
        retryCount: 0
      };
      
      const request = store.add(item);
      
      request.onsuccess = () => {
        this.notifyListeners();
        resolve(request.result);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get all pending operations
  async getPendingOperations() {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('pending');
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Get count of pending operations
  async getPendingCount() {
    const pending = await this.getPendingOperations();
    return pending.length;
  }

  // Mark operation as completed
  async markCompleted(id) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Mark operation as failed
  async markFailed(id, error) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = item.retryCount >= 3 ? 'failed' : 'pending';
          item.retryCount += 1;
          item.lastError = error;
          store.put(item);
        }
        this.notifyListeners();
        resolve();
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Save an offline order for optimistic UI
  async saveOfflineOrder(orderData) {
    const db = await this.ensureDB();
    const tempId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_ORDERS_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_ORDERS_STORE);
      
      const offlineOrder = {
        tempId,
        ...orderData,
        _offline: true,
        status: 'pending_sync',
        createdAt: new Date().toISOString()
      };
      
      const request = store.add(offlineOrder);
      
      request.onsuccess = () => {
        this.notifyListeners();
        resolve(offlineOrder);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // Get all offline orders
  async getOfflineOrders() {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_ORDERS_STORE], 'readonly');
      const store = transaction.objectStore(OFFLINE_ORDERS_STORE);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Get a specific offline order by tempId
  async getOfflineOrder(tempId) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_ORDERS_STORE], 'readonly');
      const store = transaction.objectStore(OFFLINE_ORDERS_STORE);
      const request = store.get(tempId);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Update an offline order
  async updateOfflineOrder(tempId, updates) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_ORDERS_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_ORDERS_STORE);
      const getRequest = store.get(tempId);
      
      getRequest.onsuccess = () => {
        const order = getRequest.result;
        if (order) {
          const updated = { ...order, ...updates, updatedAt: new Date().toISOString() };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => {
            this.notifyListeners();
            resolve(updated);
          };
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Offline order not found'));
        }
      };
      
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Delete an offline order (after successful sync)
  async deleteOfflineOrder(tempId) {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([OFFLINE_ORDERS_STORE], 'readwrite');
      const store = transaction.objectStore(OFFLINE_ORDERS_STORE);
      const request = store.delete(tempId);
      
      request.onsuccess = () => {
        this.notifyListeners();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get count of offline orders pending sync
  async getOfflineOrdersCount() {
    const orders = await this.getOfflineOrders();
    return orders.filter(o => o.status === 'pending_sync').length;
  }

  // Clear all completed/failed operations
  async clearCompleted() {
    const db = await this.ensureDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('status');
      
      const cursorRequest = index.openCursor(IDBKeyRange.only('failed'));
      
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          this.notifyListeners();
          resolve();
        }
      };
      
      cursorRequest.onerror = () => reject(cursorRequest.error);
    });
  }

  // Handle coming back online
  handleOnline() {
    this.isOnline = true;
    this.notifyListeners();
    // Play notification that we're back online and about to sync
    this.syncPendingOperations();
  }

  // Handle going offline
  handleOffline() {
    this.isOnline = false;
    this.notifyListeners();
  }

  // Subscribe to status changes
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // Notify all listeners
  async notifyListeners() {
    const pendingCount = await this.getPendingCount();
    const offlineOrdersCount = await this.getOfflineOrdersCount();
    const status = {
      isOnline: this.isOnline,
      pendingCount,
      offlineOrdersCount,
      totalPending: pendingCount + offlineOrdersCount,
      syncInProgress: this.syncInProgress
    };
    
    this.listeners.forEach(callback => callback(status));
  }

  // Sync pending operations with server
  async syncPendingOperations() {
    if (!this.isOnline || this.syncInProgress) return;
    
    this.syncInProgress = true;
    this.notifyListeners();
    
    let syncedCount = 0;
    let failedCount = 0;
    
    try {
      // First, sync offline orders
      const ordersSynced = await this.syncOfflineOrders();
      syncedCount += ordersSynced;
      
      // Then sync other pending operations
      const pending = await this.getPendingOperations();
      
      // Sort by timestamp to maintain order
      pending.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const operation of pending) {
        try {
          await this.executeOperation(operation);
          await this.markCompleted(operation.id);
          syncedCount++;
        } catch (error) {
          console.error('Failed to sync operation:', error);
          await this.markFailed(operation.id, error.message);
          failedCount++;
        }
      }
      
      // Play appropriate sound based on results
      if (syncedCount > 0 && failedCount === 0) {
        soundManager.playSync();
      } else if (failedCount > 0) {
        soundManager.playError();
      }
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
  }

  // Sync offline orders specifically
  async syncOfflineOrders() {
    const offlineOrders = await this.getOfflineOrders();
    const pendingOrders = offlineOrders.filter(o => o.status === 'pending_sync');
    let syncedCount = 0;
    
    for (const order of pendingOrders) {
      try {
        // Import api module for sync
        const apiModule = await import('../api.js');
        const api = apiModule.default;
        
        // Prepare order payload (remove offline-specific fields)
        const { tempId, _offline, status, createdAt, updatedAt, ...orderPayload } = order;
        
        if (order.isEdit && order.originalId) {
          // This was an edit to an existing order
          await api.put(`/orders/${order.originalId}`, orderPayload);
        } else {
          // This was a new order
          await api.post('/orders', orderPayload);
        }
        
        // Mark as synced and delete
        await this.deleteOfflineOrder(order.tempId);
        console.log(`Synced offline order: ${order.tempId}`);
        syncedCount++;
      } catch (error) {
        console.error(`Failed to sync offline order ${order.tempId}:`, error);
        // Update status to failed after retries
        await this.updateOfflineOrder(order.tempId, { 
          status: 'sync_failed', 
          lastError: error.message 
        });
      }
    }
    
    return syncedCount;
  }

  // Execute a single operation
  async executeOperation(operation) {
    const { type, method, path, payload } = operation;
    
    // Import api module - this is fine since sync only happens when online
    // and the module is already loaded
    const apiModule = await import('../api.js');
    const api = apiModule.default;
    
    switch (method) {
      case 'POST':
        return api.post(path, payload);
      case 'PUT':
        return api.put(path, payload);
      case 'DELETE':
        return api.delete(path);
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  // Get current status
  async getStatus() {
    const pendingCount = await this.getPendingCount();
    const offlineOrdersCount = await this.getOfflineOrdersCount();
    return {
      isOnline: this.isOnline,
      pendingCount,
      offlineOrdersCount,
      totalPending: pendingCount + offlineOrdersCount,
      syncInProgress: this.syncInProgress
    };
  }
}

// Singleton instance
const offlineManager = new OfflineManager();

export default offlineManager;
