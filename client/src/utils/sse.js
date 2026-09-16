// Server-Sent Events (SSE) Client with Dynamic Fallback for Market Ticker

class PriceStreamClient {
  constructor() {
    this.eventSource = null;
    this.listeners = [];
    this.timer = null;
    this.commodities = [
      { name: 'Tomato (Hybrid)', mandi: 'Salem Mandi', price: 34, change: +5.2, trend: 'up' },
      { name: 'Onion (Nashik Red)', mandi: 'Lasalgaon', price: 28, change: -2.1, trend: 'down' },
      { name: 'Potato (Jyoti)', mandi: 'Agra Mandi', price: 22, change: +1.4, trend: 'up' },
      { name: 'Green Chilli', mandi: 'Guntur APMC', price: 65, change: +8.3, trend: 'up' },
      { name: 'Turmeric (Finger)', mandi: 'Erode Mandi', price: 140, change: +3.0, trend: 'up' },
      { name: 'Wheat (Sharbati)', mandi: 'Sehore Mandi', price: 42, change: -0.8, trend: 'down' },
      { name: 'Basmati Rice', mandi: 'Karnal Mandi', price: 95, change: +2.5, trend: 'up' },
      { name: 'Banana (Robusta)', mandi: 'Theni Market', price: 25, change: +4.1, trend: 'up' }
    ];
  }

  subscribe(callback) {
    this.listeners.push(callback);

    // Initial emit
    callback(this.commodities);

    // Try connecting to SSE endpoint
    try {
      if (!this.eventSource) {
        this.eventSource = new EventSource('/api/market/stream');
        this.eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.broadcast(data);
          } catch (e) {}
        };
        this.eventSource.onerror = () => {
          this.startSimulation();
        };
      }
    } catch (e) {
      this.startSimulation();
    }

    if (!this.timer) {
      this.startSimulation();
    }

    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
      if (this.listeners.length === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
      }
    };
  }

  startSimulation() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      // Simulate minor real-world tick fluctuations
      const updated = this.commodities.map(c => {
        const delta = (Math.random() - 0.48) * 0.8;
        const newPrice = Math.max(10, Math.round((c.price + delta) * 10) / 10);
        const changeDelta = Math.round((delta / c.price * 100) * 10) / 10;
        return {
          ...c,
          price: newPrice,
          change: Math.round((c.change + changeDelta) * 10) / 10,
          trend: delta >= 0 ? 'up' : 'down'
        };
      });
      this.commodities = updated;
      this.broadcast(updated);
    }, 4000);
  }

  broadcast(data) {
    this.listeners.forEach(cb => cb(data));
  }
}

export const priceStream = new PriceStreamClient();
export default priceStream;
