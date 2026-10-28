import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    hospitalId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    tier: {
      type: String,
      default: 'Primary'
    },
    nodeId: {
      type: String,
      required: true,
      index: true
    },
    zone: {
      type: String,
      default: ''
    },
    capabilities: {
      type: [String],
      default: []
    },
    totalBeds: {
      type: Number,
      default: 100
    },
    icuBeds: {
      type: Number,
      default: 15
    },
    availableBeds: {
      type: Number,
      default: 20
    },
    availableIcu: {
      type: Number,
      default: 4
    },
    capacity: {
      type: Number,
      default: 100
    },
    availableSlots: {
      type: Number,
      default: 20
    },
    status: {
      type: String,
      default: 'Open',
      index: true
    },
    address: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
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

hospitalSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.totalBeds !== undefined) this.capacity = this.totalBeds;
  if (this.availableBeds !== undefined) this.availableSlots = this.availableBeds;
  next();
});

export const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
