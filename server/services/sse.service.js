const { EventEmitter } = require('events');

class SSEService extends EventEmitter {
  constructor() {
    super();
    // Map of userId -> Set of express res objects
    this.clients = new Map();
  }

  /**
   * Register a new SSE client
   * @param {object} req 
   * @param {object} res 
   * @param {number|string} userId 
   */
  register(req, res, userId) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE Stream Connected', timestamp: new Date().toISOString() })}\n\n`);

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(res);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeat);
      if (this.clients.has(userId)) {
        this.clients.get(userId).delete(res);
        if (this.clients.get(userId).size === 0) {
          this.clients.delete(userId);
        }
      }
    });
  }

  /**
   * Broadcast an event to targeted users or all connected clients
   * @param {string} eventType 
   * @param {object} data 
   * @param {Array<number|string>} [targetUserIds] 
   */
  broadcast(eventType, data, targetUserIds = null) {
    const payload = JSON.stringify({
      type: eventType,
      data,
      timestamp: new Date().toISOString()
    });

    const eventString = `event: ${eventType}\ndata: ${payload}\n\n`;

    if (Array.isArray(targetUserIds) && targetUserIds.length > 0) {
      targetUserIds.forEach(uid => {
        const userClients = this.clients.get(uid);
        if (userClients) {
          userClients.forEach(res => {
            try { res.write(eventString); } catch(e) {}
          });
        }
      });
    } else {
      // Broadcast to all
      for (const userClients of this.clients.values()) {
        userClients.forEach(res => {
          try { res.write(eventString); } catch(e) {}
        });
      }
    }
  }
}

module.exports = new SSEService();
