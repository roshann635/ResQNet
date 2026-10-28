import mongoose from 'mongoose';

const ambulanceSchema = new mongoose.Schema(
  {
    ambulanceId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    callSign: {
      type: String,
      default: ''
    },
    label: {
      type: String,
      default: ''
    },
    currentNodeId: {
      type: String,
      required: true,
      index: true
    },
    baseStationNodeId: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      default: 'Available',
      index: true
    },
    type: {
      type: String,
      default: 'BLS',
      index: true
    },
    vehicleType: {
      type: String,
      default: 'BLS'
    },
    capabilities: {
      type: [String],
      default: []
    },
    crew: {
      type: Array,
      default: []
    },
    fuelPct: {
      type: Number,
      default: 0.9,
      min: 0.0,
      max: 1.0
    },
    utilizationRate: {
      type: Number,
      default: 0.20
    },
    reliabilityScore: {
      type: Number,
      default: 0.95
    },
    totalDispatches: {
      type: Number,
      default: 0
    },
    activeIncidentId: {
      type: String,
      default: null,
      index: true
    },
    updatedAt: {
      type: Date,
      default: Date.now
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

ambulanceSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (!this.label && this.callSign) this.label = this.callSign;
  if (!this.callSign && this.label) this.callSign = this.label;
  if (!this.vehicleType && this.type) this.vehicleType = this.type;
  if (!this.type && this.vehicleType) this.type = this.vehicleType;
  next();
});

export const Ambulance = mongoose.model('Ambulance', ambulanceSchema);
export default Ambulance;
