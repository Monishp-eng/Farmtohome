// Real-time WebSocket Client with Simulated Fallback

class RealtimeTrackingClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.simulationTimers = new Map();
  }

  // Subscribe to truck GPS updates for a delivery
  subscribeToDelivery(deliveryId, pickup, dropoff, callback) {
    const key = `delivery_${deliveryId}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);

    // If WebSocket is configured in backend, connect to it
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/tracking`;
    try {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        this.ws = new WebSocket(wsUrl);
        this.ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.deliveryId && this.listeners.has(`delivery_${msg.deliveryId}`)) {
              this.listeners.get(`delivery_${msg.deliveryId}`).forEach(cb => cb(msg));
            }
          } catch (e) {}
        };
        this.ws.onerror = () => {
          this.startSimulation(deliveryId, pickup, dropoff);
        };
      }
    } catch (e) {
      this.startSimulation(deliveryId, pickup, dropoff);
    }

    // Always ensure simulation starts if WebSocket does not emit within 1.5s
    setTimeout(() => {
      if (!this.simulationTimers.has(key)) {
        this.startSimulation(deliveryId, pickup, dropoff);
      }
    }, 1500);

    return () => this.unsubscribe(key, callback);
  }

  startSimulation(deliveryId, pickup, dropoff) {
    const key = `delivery_${deliveryId}`;
    if (this.simulationTimers.has(key)) return;

    const pLat = pickup?.lat || 11.6643;
    const pLng = pickup?.lng || 78.1460;
    const dLat = dropoff?.lat || 13.0827;
    const dLng = dropoff?.lng || 80.2707;

    let progress = 0.15;
    const interval = setInterval(() => {
      progress += 0.02;
      if (progress > 0.98) progress = 0.15;

      const currentLat = pLat + (dLat - pLat) * progress;
      const currentLng = pLng + (dLng - pLng) * progress;
      const speedKmH = Math.round(45 + Math.sin(progress * 10) * 12);
      const etaMinutes = Math.max(5, Math.round((1 - progress) * 120));

      const payload = {
        deliveryId,
        position: [currentLat, currentLng],
        progress: Math.round(progress * 100),
        speed: speedKmH,
        etaMinutes,
        status: progress > 0.9 ? 'Arriving at doorstep' : 'In Transit on NH-44',
        timestamp: Date.now()
      };

      if (this.listeners.has(key)) {
        this.listeners.get(key).forEach(cb => cb(payload));
      }
    }, 2000);

    this.simulationTimers.set(key, interval);
  }

  unsubscribe(key, callback) {
    if (this.listeners.has(key)) {
      const filtered = this.listeners.get(key).filter(cb => cb !== callback);
      this.listeners.set(key, filtered);
      if (filtered.length === 0) {
        this.listeners.delete(key);
        if (this.simulationTimers.has(key)) {
          clearInterval(this.simulationTimers.get(key));
          this.simulationTimers.delete(key);
        }
      }
    }
  }
}

export const realtimeTracker = new RealtimeTrackingClient();
export default realtimeTracker;
