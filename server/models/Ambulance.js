import mongoose from 'mongoose';
import config from '../config/index.js';

const ambulanceSchema = new mongoose.Schema(
  {
    ambulanceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    currentNodeId: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'DISPATCHED', 'EN_ROUTE', 'AT_SCENE', 'TRANSPORTING', 'MAINTENANCE', 'OFFLINE'],
      default: 'AVAILABLE',
      index: true
    },
    vehicleType: {
      type: String,
      enum: config.ambulanceTypes,
      required: true,
      index: true
    },
    capabilities: {
      type: [String],
      default: []
    },
    utilizationRate: {
      type: Number,
      min: 0.0,
      max: 1.0,
      default: 0.20
    },
    reliabilityScore: {
      type: Number,
      min: 0.0,
      max: 1.0,
      default: 0.95
    },
    totalDispatches: {
      type: Number,
      default: 0,
      min: 0
    },
    activeIncidentId: {
      type: String,
      default: null,
      index: true
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    },
    isSynthetic: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: false
  }
);

ambulanceSchema.pre('save', function (next) {
  this.lastUpdatedAt = new Date();
  next();
});

export const Ambulance = mongoose.model('Ambulance', ambulanceSchema);
export default Ambulance;
