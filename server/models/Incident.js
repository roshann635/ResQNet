import mongoose from 'mongoose';
import config from '../config/index.js';

const statusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true
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
      default: 'Registered',
      index: true
    },
    requiredCapabilities: {
      type: [String],
      default: []
    },
    assignedAmbulanceId: {
      type: String,
      default: null
    },
    destinationHospitalId: {
      type: String,
      default: null,
      index: true
    },
    reportedBy: {
      type: String,
      default: null,
      index: true
    },
    patientCount: {
      type: Number,
      default: 1
    },
    symptoms: {
      type: [String],
      default: []
    },
    triageExplanation: {
      type: String,
      default: ''
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
    },
    scenario: {
      type: String,
      default: 'default',
      index: true
    }
  },
  {
    timestamps: false
  }
);

// One active incident per ambulance partial index
incidentSchema.index(
  { assignedAmbulanceId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      assignedAmbulanceId: { $type: 'string' },
      status: {
        $in: [
          'AMBULANCE_ASSIGNED', 'VEHICLE_EN_ROUTE', 'RE_ROUTING', 'AT_SCENE', 'TRANSPORTING',
          'AmbulanceAssigned', 'EnRoute', 'Rerouting', 'AtScene', 'Transporting'
        ]
      }
    }
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
