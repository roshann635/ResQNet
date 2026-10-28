import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

/**
 * Maps & Traffic Adapter (Local Simulator)
 * Reads synthetic traffic profiles and scheduled road events from /data/traffic
 */
class MapsTrafficAdapter {
  constructor() {
    this.trafficProfiles = [];
    this.roadEvents = [];
    this._loadData();
  }

  _loadData() {
    try {
      const profilesPath = path.join(DATA_DIR, 'traffic/traffic_profiles.json');
      if (fs.existsSync(profilesPath)) {
        this.trafficProfiles = JSON.parse(fs.readFileSync(profilesPath, 'utf-8'));
      }
      const eventsPath = path.join(DATA_DIR, 'traffic/road_events.json');
      if (fs.existsSync(eventsPath)) {
        this.roadEvents = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
      }
    } catch (err) {
      console.error('[MapsTrafficAdapter] Error loading synthetic traffic data:', err.message);
    }
  }

  /**
   * Retrieves congestion multiplier for a specific zone, hour, and day type.
   * @param {string} zoneId - e.g. 'Z-01'
   * @param {number} hour - 0 to 23
   * @param {string} dayType - 'Weekday', 'Weekend', 'Festival'
   * @returns {number} Congestion multiplier (>= 1.0)
   */
  getCongestionMultiplier(zoneId, hour, dayType = 'Weekday') {
    const profile = this.trafficProfiles.find(
      (p) => p.zoneId === zoneId && p.hour === hour && p.dayType.toLowerCase() === dayType.toLowerCase()
    );
    return profile ? profile.congestionMultiplier : 1.0;
  }

  /**
   * Retrieves all scripted road events active at the given timestamp.
   * @param {Date|string} timestamp
   * @returns {Array} List of active road events
   */
  getActiveRoadEvents(timestamp = new Date()) {
    const time = new Date(timestamp).getTime();
    return this.roadEvents.filter((ev) => {
      const start = new Date(ev.startTime).getTime();
      const end = new Date(ev.endTime).getTime();
      return ev.active === true || (time >= start && time <= end);
    });
  }

  /**
   * Returns metadata summary of available traffic profiles.
   */
  getProfileSummary() {
    return {
      totalProfiles: this.trafficProfiles.length,
      totalEvents: this.roadEvents.length,
      zones: [...new Set(this.trafficProfiles.map((p) => p.zoneId))],
      dayTypes: [...new Set(this.trafficProfiles.map((p) => p.dayType))]
    };
  }
}

export const mapsTrafficAdapter = new MapsTrafficAdapter();
export default mapsTrafficAdapter;
