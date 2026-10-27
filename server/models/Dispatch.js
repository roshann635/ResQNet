import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema(
  {
    dispatchId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    incidentId: {
      type: String,
      required: true,
      index: true
    },
    ambulanceId: {
      type: String,
      required: true,
      index: true
    },
    routeNodeIds: {
      type: [String],
      required: true,
      default: []
    },
    routeCost: {
      type: Number,
      required: true,
      min: 0
    },
    algorithm: {
      type: String,
      required: true,
      trim: true
    },
    hospitalId: {
      type: String,
      default: null,
      index: true
    },
    graphVersion: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'COMPLETED', 'REROUTED', 'CANCELLED'],
      default: 'ACTIVE',
      index: true
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
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

export const Dispatch = mongoose.model('Dispatch', dispatchSchema);
export default Dispatch;
