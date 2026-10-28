import { EventEmitter } from 'events';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.clients = new Set();
  }

  /**
   * Registers a client SSE connection.
   */
  addClient(client) {
    this.clients.add(client);
    // Send immediate initial sync event
    client.res.write(`event: CONNECTED\ndata: ${JSON.stringify({ message: 'Connected to ResQNet Live Event Stream', clientId: client.id, timestamp: new Date() })}\n\n`);
  }

  /**
   * Removes a client SSE connection.
   */
  removeClient(clientId) {
    for (const client of this.clients) {
      if (client.id === clientId) {
        this.clients.delete(client);
        break;
      }
    }
  }

  /**
   * Broadcasts an event to connected SSE clients based on role/scope rules.
   * @param {string} eventName - e.g. 'INCIDENT_UPDATE', 'AMBULANCE_MOVED', 'REROUTE_EVENT', 'ROAD_CONDITION_CHANGED'
   * @param {Object} data - Payload
   * @param {Object} [filterMeta] - Optional metadata for role filtering
   */
  broadcast(eventName, data, filterMeta = {}) {
    const payload = typeof data === 'object' && data !== null ? { event: eventName, ...data } : { event: eventName, data };
    const rawData = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n` +
                    `data: ${JSON.stringify(payload)}\n\n`;

    for (const client of this.clients) {
      const user = client.user;
      let allowed = true;

      if (user) {
        // Role-based event filtering
        if (user.role === 'citizen') {
          // Citizens only receive events related to their own incident
          if (filterMeta.incidentId && filterMeta.reportedBy && filterMeta.reportedBy !== user.userId) {
            allowed = false;
          }
          if (filterMeta.citizenOnly && filterMeta.targetUserId !== user.userId) {
            allowed = false;
          }
        } else if (user.role === 'hospital_staff') {
          // Hospital staff only receive events related to their hospital or incoming dispatches
          if (filterMeta.hospitalId && filterMeta.hospitalId !== user.hospitalId) {
            allowed = false;
          }
        }
        // Operator, Admin, and Evaluator receive all operational events
      }

      if (allowed) {
        try {
          client.res.write(rawData);
        } catch (err) {
          this.clients.delete(client);
        }
      }
    }

    // Also emit internally for Node listeners
    this.emit(eventName, data);
  }

  /**
   * Returns current count of connected SSE listeners.
   */
  getClientCount() {
    return this.clients.size;
  }
}

export const eventBus = new EventBus();

// Heartbeat every 20 seconds to prevent connection timeouts
setInterval(() => {
  for (const client of eventBus.clients) {
    try {
      client.res.write(': heartbeat\n\n');
    } catch {
      eventBus.clients.delete(client);
    }
  }
}, 20000);

export default eventBus;
