import mongoose from 'mongoose';
import config from '../config/index.js';

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
    nodeId: {
      type: String,
      required: true,
      index: true
    },
    capabilities: {
      type: [String],
      default: []
    },
    capacity: {
      type: Number,
      required: true,
      min: 0
    },
    availableSlots: {
      type: Number,
      required: true,
      min: 0
    },
    status: {
      type: String,
      enum: ['NORMAL_OPS', 'DIVERTING', 'AT_CAPACITY'],
      default: 'NORMAL_OPS',
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
    }
  },
  {
    timestamps: false
  }
);

hospitalSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.availableSlots <= 0) {
    this.status = 'AT_CAPACITY';
  } else if (this.status === 'AT_CAPACITY' && this.availableSlots > 0) {
    this.status = 'NORMAL_OPS';
  }
  next();
});

export const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
