import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

/**
 * Hospital Data Adapter (Local Simulator)
 * Reads synthetic hospital capacity timeline from /data/hospitals/hospital_capacity_timeline.json
 */
class HospitalDataAdapter {
  constructor() {
    this.capacityTimeline = [];
    this._loadData();
  }

  _loadData() {
    try {
      const timelinePath = path.join(DATA_DIR, 'hospitals/hospital_capacity_timeline.json');
      if (fs.existsSync(timelinePath)) {
        this.capacityTimeline = JSON.parse(fs.readFileSync(timelinePath, 'utf-8'));
      }
    } catch (err) {
      console.error('[HospitalDataAdapter] Error loading hospital capacity timeline:', err.message);
    }
  }

  /**
   * Retrieves hourly capacity record for a given hospital, day of week, and hour.
   * @param {string} hospitalId e.g. 'HOSP-007'
   * @param {number} dayOfWeek 0 (Sun) to 6 (Sat)
   * @param {number} hour 0 to 23
   * @returns {Object|null}
   */
  getHourlyCapacity(hospitalId, dayOfWeek, hour) {
    return this.capacityTimeline.find(
      (entry) =>
        entry.hospitalId === hospitalId &&
        entry.dayOfWeek === dayOfWeek &&
        entry.hour === hour
    ) || null;
  }

  /**
   * Retrieves the full 7-day timeline for a specific hospital.
   * @param {string} hospitalId
   * @returns {Array} 168 timeline points
   */
  getTimelineForHospital(hospitalId) {
    return this.capacityTimeline.filter((entry) => entry.hospitalId === hospitalId);
  }

  /**
   * Applies timeline data at the given simulation time to MongoDB Hospital models.
   * @param {number} dayOfWeek 
   * @param {number} hour 
   * @param {Object} HospitalModel Mongoose model
   * @returns {Promise<number>} Number of hospitals updated
   */
  async syncCapacities(dayOfWeek, hour, HospitalModel) {
    const points = this.capacityTimeline.filter(
      (p) => p.dayOfWeek === dayOfWeek && p.hour === hour
    );
    let updatedCount = 0;
    for (const pt of points) {
      await HospitalModel.findOneAndUpdate(
        { hospitalId: pt.hospitalId },
        {
          $set: {
            availableBeds: pt.availableBeds,
            availableIcu: pt.availableIcu,
            availableSlots: pt.availableBeds,
            loadFactor: pt.loadFactor
          }
        }
      );
      updatedCount++;
    }
    return updatedCount;
  }
}

export const hospitalDataAdapter = new HospitalDataAdapter();
export default hospitalDataAdapter;
