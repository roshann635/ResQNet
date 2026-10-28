import { Notification } from '../models/Notification.js';
import { eventBus } from '../services/eventBus.js';

/**
 * SMS / Email Adapter (Local Simulator)
 * Writes notifications to the MongoDB Notification collection and publishes to SSE stream.
 * Drives the in-app "Outbox" screen without requiring external third-party SMS/SMTP gateways.
 */
let notifSeqCounter = 0;

class NotifyAdapter {
  /**
   * Simulates sending an SMS.
   * @param {Object} params
   * @param {string} params.recipientId - e.g. user ID or phone
   * @param {string} params.phone - phone number e.g. '+91 9000010001'
   * @param {string} params.message - text message
   * @param {string} [params.incidentId] - optional associated incident ID
   * @param {string} [params.role] - target role e.g. 'citizen', 'operator'
   * @returns {Promise<Object>} Created notification document
   */

  async sendSMS({ recipientId, phone, message, incidentId = null, role = 'citizen' }) {
    notifSeqCounter++;
    const notificationId = `NOTIF-SMS-${Date.now()}-${notifSeqCounter}`;
    const notification = new Notification({
      notificationId,
      recipientId: recipientId || phone,
      channel: 'SMS',
      destination: phone,
      subject: null,
      message,
      status: 'Delivered',
      incidentId,
      role,
      timestamp: new Date(),
      isSynthetic: false
    });

    await notification.save();

    // Broadcast live over SSE
    eventBus.broadcast(
      'NOTIFICATION',
      {
        notificationId,
        channel: 'SMS',
        destination: phone,
        message,
        incidentId,
        role,
        timestamp: notification.timestamp
      },
      { incidentId, targetUserId: recipientId, role }
    );

    return notification;
  }

  /**
   * Simulates sending an Email.
   * @param {Object} params
   * @param {string} params.recipientId
   * @param {string} params.email
   * @param {string} params.subject
   * @param {string} params.message
   * @param {string} [params.incidentId]
   * @param {string} [params.role]
   * @returns {Promise<Object>}
   */
  async sendEmail({ recipientId, email, subject, message, incidentId = null, role = 'hospital_staff' }) {
    notifSeqCounter++;
    const notificationId = `NOTIF-EML-${Date.now()}-${notifSeqCounter}`;
    const notification = new Notification({
      notificationId,
      recipientId: recipientId || email,
      channel: 'EMAIL',
      destination: email,
      subject: subject || 'ResQNet Emergency Notification',
      message,
      status: 'Delivered',
      incidentId,
      role,
      timestamp: new Date(),
      isSynthetic: false
    });

    await notification.save();

    // Broadcast live over SSE
    eventBus.broadcast(
      'NOTIFICATION',
      {
        notificationId,
        channel: 'EMAIL',
        destination: email,
        subject,
        message,
        incidentId,
        role,
        timestamp: notification.timestamp
      },
      { incidentId, targetUserId: recipientId, role }
    );

    return notification;
  }

  /**
   * Retrieves outbox items filtered by user role and identity.
   * @param {Object} filter
   * @param {string} [filter.role]
   * @param {string} [filter.userId]
   * @param {string} [filter.incidentId]
   * @param {number} [filter.page=1]
   * @param {number} [filter.limit=50]
   */
  async getOutbox({ role, userId, incidentId, page = 1, limit = 50 }) {
    const query = {};

    if (role === 'citizen' && userId) {
      query.$or = [{ recipientId: userId }, { role: 'citizen' }];
    } else if (role === 'hospital_staff' && userId) {
      query.$or = [{ recipientId: userId }, { role: 'hospital_staff' }];
    }
    // operator & admin can view all outbox records

    if (incidentId) {
      query.incidentId = incidentId;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Notification.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      Notification.countDocuments(query)
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }
}

export const notifyAdapter = new NotifyAdapter();
export default notifyAdapter;
