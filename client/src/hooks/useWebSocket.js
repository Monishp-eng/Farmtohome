import { useState, useEffect } from 'react';
import { realtimeTracker } from '../utils/websocket';

export const useDeliveryTracking = (deliveryId, pickup, dropoff) => {
  const [trackingData, setTrackingData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!deliveryId) return;

    setIsConnected(true);
    const unsubscribe = realtimeTracker.subscribeToDelivery(
      deliveryId,
      pickup,
      dropoff,
      (data) => {
        setTrackingData(data);
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [deliveryId, pickup?.lat, pickup?.lng, dropoff?.lat, dropoff?.lng]);

  return { trackingData, isConnected };
};

export default useDeliveryTracking;
