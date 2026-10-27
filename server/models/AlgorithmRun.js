import mongoose from 'mongoose';

const algorithmRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true
    },
    algorithm: {
      type: String,
      required: true,
      enum: ['BFS', 'DFS', 'DIJKSTRA', 'ASTAR', 'BACKTRACKING'],
      index: true
    },
    sourceNodeId: {
      type: String,
      required: true,
      index: true
    },
    destinationNodeId: {
      type: String,
      required: true,
      index: true
    },
    graphVersion: {
      type: Number,
      required: true,
      default: 1
    },
    routeNodeIds: {
      type: [String],
      default: []
    },
    routeCost: {
      type: Number,
      default: 0
    },
    nodesExpanded: {
      type: Number,
      default: 0
    },
    edgesExamined: {
      type: Number,
      default: 0
    },
    runtimeMs: {
      type: Number,
      default: 0
    },
    outcome: {
      type: String,
      enum: ['FOUND', 'NO_ROUTE', 'BOUNDS_EXCEEDED', 'ERROR'],
      required: true,
      index: true
    },
    limits: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    exploredNodes: {
      type: [mongoose.Schema.Types.Mixed],
      default: []
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

export const AlgorithmRun = mongoose.model('AlgorithmRun', algorithmRunSchema);
export default AlgorithmRun;
