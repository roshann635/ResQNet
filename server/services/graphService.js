import { Graph } from '../dsa/Graph.js';
import { HashTable } from '../dsa/HashTable.js';
import { BPlusTree } from '../dsa/BPlusTree.js';
import { RoadNode, RoadEdge, Hospital, Ambulance, Incident, AuditLog } from '../models/index.js';
import config from '../config/index.js';

let activeGraph = null;
let activeHashTable = null;
let activeBPlusTree = null;

/**
 * Initializes and synchronizes in-memory DSA structures from MongoDB.
 */
export async function initializeGraphService() {
  const nodes = await RoadNode.find({ active: true }).lean();
  const edges = await RoadEdge.find({ active: true }).lean();

  activeGraph = new Graph();
  for (const node of nodes) {
    activeGraph.addNode(node);
  }
  for (const edge of edges) {
    activeGraph.addEdge(edge);
  }

  // Initialize Custom Hash Table symbol table
  activeHashTable = new HashTable(32, 0.75);
  const hospitals = await Hospital.find().lean();
  const ambulances = await Ambulance.find().lean();
  const incidents = await Incident.find().lean();

  hospitals.forEach((h) => activeHashTable.insert(h.hospitalId, h));
  ambulances.forEach((a) => activeHashTable.insert(a.ambulanceId, a));
  incidents.forEach((i) => activeHashTable.insert(i.incidentId, i));
  nodes.forEach((n) => activeHashTable.insert(n.nodeId, n));

  // Initialize Custom B+ Tree (Order 4) indexing facilities and nodes
  activeBPlusTree = new BPlusTree(4);
  hospitals.forEach((h) => activeBPlusTree.insert(h.hospitalId, { type: 'HOSPITAL', ...h }));
  nodes.forEach((n) => activeBPlusTree.insert(n.nodeId, { type: 'ROAD_NODE', ...n }));

  console.log(`[GraphService] In-memory graph loaded: ${nodes.length} nodes, ${edges.length} edges (v${activeGraph.graphVersion}).`);
  console.log(`[GraphService] In-memory HashTable loaded with ${activeHashTable.size} keys.`);
  console.log(`[GraphService] In-memory B+ Tree built with ${activeBPlusTree.size} entries.`);

  return activeGraph;
}

export function getGraph() {
  if (!activeGraph) {
    throw new Error('GraphService Error: Graph has not been initialized. Call initializeGraphService() first.');
  }
  return activeGraph;
}

export function getHashTable() {
  return activeHashTable;
}

export function getBPlusTree() {
  return activeBPlusTree;
}

/**
 * Updates a road edge condition in both MongoDB and in-memory Graph.
 * Increments graphVersion.
 */
export async function updateRoadCondition(edgeId, condition, multiplier = null, actorId = 'DISPATCHER') {
  const graph = getGraph();
  const dbEdge = await RoadEdge.findOne({ edgeId });

  if (!dbEdge) {
    const err = new Error(`Edge with ID '${edgeId}' not found.`);
    err.statusCode = 404;
    throw err;
  }

  const validConditions = Object.values(config.roadConditions);
  if (!validConditions.includes(condition)) {
    const err = new Error(`Invalid condition '${condition}'. Allowed: ${validConditions.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const previousCondition = dbEdge.condition;
  dbEdge.condition = condition;

  if (condition === config.roadConditions.CONGESTED) {
    dbEdge.multiplier = multiplier || config.congestionMultiplier;
  } else if (condition === config.roadConditions.NORMAL || condition === config.roadConditions.REOPENED) {
    dbEdge.condition = config.roadConditions.NORMAL;
    dbEdge.multiplier = 1.0;
  }
  dbEdge.updatedAt = new Date();
  await dbEdge.save();

  // Update in-memory graph structure and increment version
  const updateInfo = graph.setEdgeCondition(edgeId, dbEdge.condition, dbEdge.multiplier);

  // Write audit entry
  const audit = new AuditLog({
    logId: `LOG-ROAD-${Date.now()}`,
    actorId,
    eventType: 'ROAD_CONDITION_UPDATED',
    entityType: 'ROAD_EDGE',
    entityId: edgeId,
    timestamp: new Date(),
    details: {
      edgeId,
      previousCondition,
      newCondition: dbEdge.condition,
      multiplier: dbEdge.multiplier,
      graphVersion: updateInfo.graphVersion
    },
    outcome: 'SUCCESS',
    isSynthetic: dbEdge.isSynthetic
  });
  await audit.save();

  return {
    edge: dbEdge,
    graphVersion: updateInfo.graphVersion,
    previousCondition
  };
}

export default {
  initializeGraphService,
  getGraph,
  getHashTable,
  getBPlusTree,
  updateRoadCondition
};
