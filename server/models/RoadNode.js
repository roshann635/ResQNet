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
    lat: {
      type: Number
    },
    lng: {
      type: Number
    },
    type: {
      type: String,
      default: 'junction'
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
    },
    scenario: {
      type: String,
      default: 'default',
      index: true
    },
    landmark: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: false
  }
);

export const RoadNode = mongoose.model('RoadNode', roadNodeSchema);
export default RoadNode;
