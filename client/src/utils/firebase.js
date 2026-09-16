// Firebase Web Push Notification Client
import api from '../api/axios';

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('[Push] This browser does not support desktop notifications');
    return { success: false, reason: 'unsupported' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('[Push] Notification permission granted.');
      // Generate client push identifier
      let token = localStorage.getItem('fcm_token');
      if (!token) {
        token = `fcm_demo_${Math.random().toString(36).substring(2)}_${Date.now()}`;
        localStorage.setItem('fcm_token', token);
      }

      // Register with backend
      try {
        await api.post('/notifications/token', {
          fcm_token: token,
          language: 'en'
        });
      } catch (err) {
        console.warn('[Push] Failed to register token with backend:', err.message);
      }

      return { success: true, token };
    } else {
      console.log('[Push] Notification permission denied or dismissed');
      return { success: false, reason: permission };
    }
  } catch (err) {
    console.error('[Push] Error requesting notification permission:', err);
    return { success: false, error: err.message };
  }
};
