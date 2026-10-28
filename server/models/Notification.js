import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    notificationId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    recipientId: {
      type: String,
      required: true,
      index: true
    },
    channel: {
      type: String,
      enum: ['SMS', 'EMAIL'],
      required: true
    },
    destination: {
      type: String,
      required: true
    },
    subject: {
      type: String,
      default: null
    },
    message: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['Queued', 'Sent', 'Delivered', 'Failed'],
      default: 'Delivered'
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true
    },
    incidentId: {
      type: String,
      default: null,
      index: true
    },
    role: {
      type: String,
      default: null,
      index: true
    },
    isSynthetic: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: false }
);

export const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
