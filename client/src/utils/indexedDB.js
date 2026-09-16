import { openDB } from 'idb';

const DB_NAME = 'kisan_offline_db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Products store for offline marketplace browsing
      if (!db.objectStoreNames.contains('products')) {
        const productStore = db.createObjectStore('products', { keyPath: 'id' });
        productStore.createIndex('category', 'category', { unique: false });
      }

      // Last viewed mandi / market prices
      if (!db.objectStoreNames.contains('market_prices')) {
        db.createObjectStore('market_prices', { keyPath: 'id' });
      }

      // Offline cart
      if (!db.objectStoreNames.contains('cart')) {
        db.createObjectStore('cart', { keyPath: 'product_id' });
      }

      // Offline pending sync actions (e.g. cart updates made offline)
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

// --- Product Catalog Offline Caching ---
export const cacheProducts = async (products) => {
  try {
    const db = await initDB();
    const tx = db.transaction('products', 'readwrite');
    for (const p of products) {
      await tx.store.put(p);
    }
    await tx.done;
  } catch (err) {
    console.warn('[IndexedDB] Failed to cache products:', err);
  }
};

export const getCachedProducts = async () => {
  try {
    const db = await initDB();
    return await db.getAll('products');
  } catch (err) {
    console.warn('[IndexedDB] Failed to retrieve cached products:', err);
    return [];
  }
};

// --- Market Prices Offline Caching ---
export const cachePrices = async (prices) => {
  try {
    const db = await initDB();
    const tx = db.transaction('market_prices', 'readwrite');
    for (const item of prices) {
      await tx.store.put({ id: item.commodity || item.id, ...item, cachedAt: Date.now() });
    }
    await tx.done;
  } catch (err) {
    console.warn('[IndexedDB] Failed to cache prices:', err);
  }
};

export const getCachedPrices = async () => {
  try {
    const db = await initDB();
    return await db.getAll('market_prices');
  } catch (err) {
    console.warn('[IndexedDB] Failed to retrieve cached prices:', err);
    return [];
  }
};

// --- Offline Cart Management ---
export const getOfflineCart = async () => {
  try {
    const db = await initDB();
    return await db.getAll('cart');
  } catch (err) {
    console.warn('[IndexedDB] Failed to get offline cart:', err);
    return [];
  }
};

export const saveOfflineCartItem = async (item) => {
  try {
    const db = await initDB();
    await db.put('cart', item);
  } catch (err) {
    console.warn('[IndexedDB] Failed to save cart item:', err);
  }
};

export const removeOfflineCartItem = async (productId) => {
  try {
    const db = await initDB();
    await db.delete('cart', productId);
  } catch (err) {
    console.warn('[IndexedDB] Failed to remove cart item:', err);
  }
};

export const clearOfflineCart = async () => {
  try {
    const db = await initDB();
    await db.clear('cart');
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear offline cart:', err);
  }
};

// --- Sync Queue for Offline Reconnection ---
export const queueSyncAction = async (action) => {
  try {
    const db = await initDB();
    await db.add('sync_queue', {
      action, // e.g. { type: 'ADD_TO_CART', payload: { product_id, quantity_kg } }
      timestamp: Date.now()
    });
  } catch (err) {
    console.warn('[IndexedDB] Failed to queue sync action:', err);
  }
};

export const getPendingSyncActions = async () => {
  try {
    const db = await initDB();
    return await db.getAll('sync_queue');
  } catch (err) {
    console.warn('[IndexedDB] Failed to retrieve sync queue:', err);
    return [];
  }
};

export const clearSyncQueue = async () => {
  try {
    const db = await initDB();
    await db.clear('sync_queue');
  } catch (err) {
    console.warn('[IndexedDB] Failed to clear sync queue:', err);
  }
};
