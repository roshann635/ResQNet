import mongoose from 'mongoose';
import config from '../config/index.js';

const roadEdgeSchema = new mongoose.Schema(
  {
    edgeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    fromNodeId: {
      type: String,
      required: true,
      index: true
    },
    toNodeId: {
      type: String,
      required: true,
      index: true
    },
    baseCost: {
      type: Number,
      required: true,
      min: 0
    },
    condition: {
      type: String,
      enum: Object.values(config.roadConditions),
      default: config.roadConditions.NORMAL,
      index: true
    },
    multiplier: {
      type: Number,
      default: 1.0,
      min: 0
    },
    active: {
      type: Boolean,
      default: true
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

// Virtual for effective weight
roadEdgeSchema.virtual('effectiveWeight').get(function () {
  if (this.condition === config.roadConditions.BLOCKED || !this.active) {
    return Infinity;
  }
  if (this.condition === config.roadConditions.CONGESTED) {
    return this.baseCost * (this.multiplier || config.congestionMultiplier);
  }
  return this.baseCost;
});

roadEdgeSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.condition === config.roadConditions.CONGESTED && (!this.multiplier || this.multiplier === 1.0)) {
    this.multiplier = config.congestionMultiplier;
  } else if (this.condition === config.roadConditions.NORMAL || this.condition === config.roadConditions.REOPENED) {
    this.multiplier = 1.0;
  }
  next();
});

export const RoadEdge = mongoose.model('RoadEdge', roadEdgeSchema);
export default RoadEdge;
