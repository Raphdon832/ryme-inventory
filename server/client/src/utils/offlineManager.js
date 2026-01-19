/**
 * Offline Manager - Handles offline queue and sync operations
 */

const DB_NAME = 'RymeOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'pendingOperations';

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
    const status = {
      isOnline: this.isOnline,
      pendingCount,
      syncInProgress: this.syncInProgress
    };
    
    this.listeners.forEach(callback => callback(status));
  }

  // Sync pending operations with server
  async syncPendingOperations() {
    if (!this.isOnline || this.syncInProgress) return;
    
    this.syncInProgress = true;
    this.notifyListeners();
    
    try {
      const pending = await this.getPendingOperations();
      
      // Sort by timestamp to maintain order
      pending.sort((a, b) => a.timestamp - b.timestamp);
      
      for (const operation of pending) {
        try {
          await this.executeOperation(operation);
          await this.markCompleted(operation.id);
        } catch (error) {
          console.error('Failed to sync operation:', error);
          await this.markFailed(operation.id, error.message);
        }
      }
    } finally {
      this.syncInProgress = false;
      this.notifyListeners();
    }
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
    return {
      isOnline: this.isOnline,
      pendingCount,
      syncInProgress: this.syncInProgress
    };
  }
}

// Singleton instance
const offlineManager = new OfflineManager();

export default offlineManager;
