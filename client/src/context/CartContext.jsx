import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';
import useOnlineStatus from '../hooks/useOnlineStatus';
import {
  getOfflineCart,
  saveOfflineCartItem,
  removeOfflineCartItem,
  clearOfflineCart,
  queueSyncAction,
  getPendingSyncActions,
  clearSyncQueue
} from '../utils/indexedDB';
import toast from 'react-hot-toast';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const { isOnline, wasOffline } = useOnlineStatus();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load cart on mount or auth change
  const fetchCart = useCallback(async () => {
    setLoading(true);
    try {
      if (isOnline && isAuthenticated) {
        const res = await api.get('/cart');
        const cartData = res.data.data?.items || res.data.data || [];
        setItems(cartData);
        // Mirror to offline storage
        await clearOfflineCart();
        for (const it of cartData) {
          await saveOfflineCartItem(it);
        }
      } else {
        // Load from IndexedDB
        const offlineData = await getOfflineCart();
        setItems(offlineData);
      }
    } catch (err) {
      console.warn('[Cart] Server fetch failed, falling back to IndexedDB:', err);
      const offlineData = await getOfflineCart();
      setItems(offlineData);
    } finally {
      setLoading(false);
    }
  }, [isOnline, isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Re-sync when reconnecting online
  useEffect(() => {
    const syncOfflineQueue = async () => {
      if (isOnline && wasOffline && isAuthenticated) {
        setIsSyncing(true);
        try {
          const pending = await getPendingSyncActions();
          if (pending.length > 0) {
            toast.loading(`Syncing ${pending.length} offline cart operation(s)...`, { id: 'cart-sync' });
            for (const item of pending) {
              const { action } = item;
              if (action.type === 'ADD') {
                await api.post('/cart', { product_id: action.productId, quantity_kg: action.quantity });
              } else if (action.type === 'REMOVE') {
                await api.delete(`/cart/${action.productId}`);
              }
            }
            await clearSyncQueue();
            toast.success('Cart synchronized with farm cloud!', { id: 'cart-sync' });
            await fetchCart();
          }
        } catch (err) {
          console.error('[Cart Sync Error]:', err);
          toast.error('Failed to sync offline cart changes', { id: 'cart-sync' });
        } finally {
          setIsSyncing(false);
        }
      }
    };

    syncOfflineQueue();
  }, [isOnline, wasOffline, isAuthenticated, fetchCart]);

  const addToCart = async (product, quantity = 1) => {
    const productId = product.id || product.product_id;
    const cartItem = {
      product_id: productId,
      product: product,
      name: product.name,
      price_per_kg: product.price_per_kg,
      image_url: product.image_url,
      quantity_kg: quantity,
      category: product.category,
      unit: product.unit || 'kg'
    };

    // Optimistic local update
    setItems(prev => {
      const existing = prev.find(i => (i.product_id === productId || i.id === productId));
      if (existing) {
        return prev.map(i =>
          (i.product_id === productId || i.id === productId)
            ? { ...i, quantity_kg: i.quantity_kg + quantity }
            : i
        );
      }
      return [...prev, cartItem];
    });

    await saveOfflineCartItem(cartItem);

    if (isOnline && isAuthenticated) {
      try {
        await api.post('/cart', { product_id: productId, quantity_kg: quantity });
        toast.success(`Added ${quantity}kg ${product.name} to cart`);
      } catch (err) {
        console.warn('Online add failed, queuing for sync:', err);
        await queueSyncAction({ type: 'ADD', productId, quantity });
        toast.success(`Saved ${product.name} to offline cart (will sync when online)`);
      }
    } else {
      await queueSyncAction({ type: 'ADD', productId, quantity });
      toast.success(`Saved ${product.name} to offline cart`);
    }
  };

  const removeFromCart = async (productId) => {
    setItems(prev => prev.filter(i => (i.product_id !== productId && i.id !== productId)));
    await removeOfflineCartItem(productId);

    if (isOnline && isAuthenticated) {
      try {
        await api.delete(`/cart/${productId}`);
        toast.success('Item removed from cart');
      } catch (err) {
        await queueSyncAction({ type: 'REMOVE', productId });
      }
    } else {
      await queueSyncAction({ type: 'REMOVE', productId });
    }
  };

  const updateQuantity = async (productId, quantity) => {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    setItems(prev =>
      prev.map(i =>
        (i.product_id === productId || i.id === productId)
          ? { ...i, quantity_kg: quantity }
          : i
      )
    );
    const item = items.find(i => (i.product_id === productId || i.id === productId));
    if (item) {
      await saveOfflineCartItem({ ...item, quantity_kg: quantity });
    }
    if (isOnline && isAuthenticated) {
      try {
        await api.put(`/cart/${productId}`, { quantity_kg: quantity });
      } catch (e) {
        await queueSyncAction({ type: 'ADD', productId, quantity });
      }
    }
  };

  const clear = async () => {
    setItems([]);
    await clearOfflineCart();
    if (isOnline && isAuthenticated) {
      try {
        await api.delete('/cart');
      } catch (e) {}
    }
  };

  const cartCount = items.reduce((acc, curr) => acc + (Number(curr.quantity_kg) || 1), 0);
  const totalAmount = items.reduce((acc, curr) => {
    const price = Number(curr.price_per_kg) || Number(curr.product?.price_per_kg) || 0;
    const qty = Number(curr.quantity_kg) || 1;
    return acc + (price * qty);
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        cartCount,
        totalAmount,
        loading,
        isSyncing,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart: clear,
        refreshCart: fetchCart
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
