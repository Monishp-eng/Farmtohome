import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([
    {
      id: 'notif-1',
      title: '🌾 Fair Pricing Alert',
      body: 'Tomato prices updated across Salem & Hosur mandis. +8% demand forecast.',
      time: '10m ago',
      read: false,
      type: 'market'
    },
    {
      id: 'notif-2',
      title: '🚚 Direct Cold Transit Active',
      body: 'Driver Murugan K. is en route to Farm Gate for batch #F2H-8491.',
      time: '1h ago',
      read: false,
      type: 'logistics'
    },
    {
      id: 'notif-3',
      title: '⚡ Instant Escrow Ready',
      body: '₹4,850 payout scheduled for disbursement upon buyer doorstep OTP verification.',
      time: '3h ago',
      read: true,
      type: 'payout'
    }
  ]);

  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const addNotification = useCallback((notification) => {
    const newNotif = {
      id: `notif-${Date.now()}`,
      time: 'Just now',
      read: false,
      ...notification
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Native browser notification if granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, {
          body: newNotif.body,
          icon: '/icons/icon-192.png'
        });
      } catch (e) {
        // Ignore native notification error
      }
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isOpen,
        setIsOpen,
        markAsRead,
        markAllAsRead,
        clearAll,
        addNotification
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
