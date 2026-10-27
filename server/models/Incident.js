import mongoose from 'mongoose';
import config from '../config/index.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: Object.values(config.incidentStates)
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    actorId: {
      type: String,
      default: 'SYSTEM'
    },
    note: {
      type: String,
      default: ''
    },
    routeVersion: {
      type: Number,
      default: 1
    }
  },
  { _id: false }
);

const incidentSchema = new mongoose.Schema(
  {
    incidentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    type: {
      type: String,
      required: true,
      trim: true
    },
    severity: {
      type: String,
      required: true,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
      index: true
    },
    locationNodeId: {
      type: String,
      required: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(config.incidentStates),
      default: config.incidentStates.REGISTERED,
      index: true
    },
    requiredCapabilities: {
      type: [String],
      default: []
    },
    assignedAmbulanceId: {
      type: String,
      default: null,
      index: true
    },
    destinationHospitalId: {
      type: String,
      default: null,
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    statusHistory: {
      type: [statusHistorySchema],
      default: []
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

// Pre-save middleware to update updatedAt and append initial history if empty
incidentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isNew && (!this.statusHistory || this.statusHistory.length === 0)) {
    this.statusHistory.push({
      status: this.status,
      timestamp: this.createdAt || new Date(),
      actorId: 'DISPATCHER',
      note: 'Incident registered in ResQNet system',
      routeVersion: 1
    });
  }
  next();
});

export const Incident = mongoose.model('Incident', incidentSchema);
export default Incident;
