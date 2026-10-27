import mongoose from 'mongoose';

const roadNodeSchema = new mongoose.Schema(
  {
    nodeId: {
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
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    },
    zone: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    active: {
      type: Boolean,
      default: true
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

export const RoadNode = mongoose.model('RoadNode', roadNodeSchema);
export default RoadNode;
