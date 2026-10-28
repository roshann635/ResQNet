import { Graph } from '../dsa/Graph.js';
import { HashTable } from '../dsa/HashTable.js';
import { BPlusTree } from '../dsa/BPlusTree.js';
import { RoadNode, RoadEdge, Hospital, Ambulance, Incident, AuditLog } from '../models/index.js';
import config from '../config/index.js';
import { generateCityDenseGraph } from '../seed/cityDenseGenerator.js';

let activeScenario = 'default';
const graphs = new Map();
const hashTables = new Map();
const bPlusTrees = new Map();
const showcasePairsMap = new Map();

// Default 40-node scenario showcase pairs
const defaultShowcasePairs = [
  {
    id: 'default-short',
    name: 'Campus Loop (Short)',
    description: 'Internal campus route from Main Gate to Sports Arena (~1.1 km).',
    sourceNodeId: 'N-01',
    destinationNodeId: 'N-04',
    category: 'short'
  },
  {
    id: 'default-medium',
    name: 'Campus to Metro Civic Center (Medium)',
    description: 'Cross-district route from Campus Gate to Central Hospital Hub (~2.7 km).',
    sourceNodeId: 'N-01',
    destinationNodeId: 'N-15',
    category: 'medium'
  },
  {
    id: 'default-long',
    name: 'North Ring to South Aerodrome (Long)',
    description: 'Full north-to-south arterial transit across 6 city zones (~6.4 km).',
    sourceNodeId: 'N-12',
    destinationNodeId: 'N-37',
    category: 'long'
  },
  {
    id: 'default-island-bottleneck',
    name: 'St. Jude Island Causeway (Bottleneck)',
    description: 'Route to St. Jude Island Hospital (N-40) crossing the single causeway bridge (E-39-40).',
    sourceNodeId: 'N-15',
    destinationNodeId: 'N-40',
    bridgeEdgeId: 'E-39-40',
    category: 'unreachable-when-bridge-blocked'
  }
];

/**
 * Initializes and synchronizes in-memory DSA structures from MongoDB.
 * Supports multi-scenario architectures ('default' and 'city-dense').
 */
export async function initializeGraphService() {
  // 1. Initialize DEFAULT Scenario
  const defaultNodes = await RoadNode.find({ active: true, scenario: { $ne: 'city-dense' } }).lean();
  const defaultEdges = await RoadEdge.find({ active: true, scenario: { $ne: 'city-dense' } }).lean();

  const defaultGraph = new Graph();
  for (const node of defaultNodes) {
    defaultGraph.addNode(node);
  }
  for (const edge of defaultEdges) {
    defaultGraph.addEdge(edge);
  }

  const defaultHashTable = new HashTable(32, 0.75);
  const defaultHospitals = await Hospital.find({ scenario: { $ne: 'city-dense' } }).lean();
  const defaultAmbulances = await Ambulance.find({ scenario: { $ne: 'city-dense' } }).lean();
  const defaultIncidents = await Incident.find({ scenario: { $ne: 'city-dense' } }).lean();

  defaultHospitals.forEach((h) => defaultHashTable.insert(h.hospitalId, h));
  defaultAmbulances.forEach((a) => defaultHashTable.insert(a.ambulanceId, a));
  defaultIncidents.forEach((i) => defaultHashTable.insert(i.incidentId, i));
  defaultNodes.forEach((n) => defaultHashTable.insert(n.nodeId, n));

  const defaultBPlusTree = new BPlusTree(4);
  defaultHospitals.forEach((h) => defaultBPlusTree.insert(h.hospitalId, { type: 'HOSPITAL', ...h }));
  defaultNodes.forEach((n) => defaultBPlusTree.insert(n.nodeId, { type: 'ROAD_NODE', ...n }));

  graphs.set('default', defaultGraph);
  hashTables.set('default', defaultHashTable);
  bPlusTrees.set('default', defaultBPlusTree);
  showcasePairsMap.set('default', defaultShowcasePairs);

  console.log(`[GraphService] Default graph loaded: ${defaultNodes.length} nodes, ${defaultEdges.length} edges (v${defaultGraph.graphVersion}).`);

  // 2. Initialize CITY-DENSE Scenario (if present in database or fallback to in-memory generator)
  const cityDenseNodeCount = await RoadNode.countDocuments({ scenario: 'city-dense' });
  let cityNodes = [];
  let cityEdges = [];
  let cityShowcasePairs = [];

  if (cityDenseNodeCount > 0) {
    cityNodes = await RoadNode.find({ active: true, scenario: 'city-dense' }).lean();
    cityEdges = await RoadEdge.find({ active: true, scenario: 'city-dense' }).lean();
    const cityData = generateCityDenseGraph(1337);
    cityShowcasePairs = cityData.showcasePairs;
  } else {
    // Generate in-memory so city-dense is immediately available even before seed:city
    const cityData = generateCityDenseGraph(1337);
    cityNodes = cityData.nodes;
    cityEdges = cityData.edges;
    cityShowcasePairs = cityData.showcasePairs;
  }

  const cityGraph = new Graph();
  for (const node of cityNodes) {
    cityGraph.addNode(node);
  }
  for (const edge of cityEdges) {
    cityGraph.addEdge(edge);
  }

  const cityHashTable = new HashTable(256, 0.75);
  const cityHospitals = await Hospital.find({ scenario: 'city-dense' }).lean();
  const cityAmbulances = await Ambulance.find({ scenario: 'city-dense' }).lean();
  const cityIncidents = await Incident.find({ scenario: 'city-dense' }).lean();

  cityHospitals.forEach((h) => cityHashTable.insert(h.hospitalId, h));
  cityAmbulances.forEach((a) => cityHashTable.insert(a.ambulanceId, a));
  cityIncidents.forEach((i) => cityHashTable.insert(i.incidentId, i));
  cityNodes.forEach((n) => cityHashTable.insert(n.nodeId, n));

  const cityBPlusTree = new BPlusTree(4);
  cityHospitals.forEach((h) => cityBPlusTree.insert(h.hospitalId, { type: 'HOSPITAL', ...h }));
  cityNodes.forEach((n) => cityBPlusTree.insert(n.nodeId, { type: 'ROAD_NODE', ...n }));

  graphs.set('city-dense', cityGraph);
  hashTables.set('city-dense', cityHashTable);
  bPlusTrees.set('city-dense', cityBPlusTree);
  showcasePairsMap.set('city-dense', cityShowcasePairs);

  console.log(`[GraphService] City-Dense graph loaded: ${cityNodes.length} nodes, ${cityEdges.length} edges (v${cityGraph.graphVersion}).`);
  console.log(`[GraphService] In-memory DSA engines ready for ${graphs.size} scenarios.`);

  return defaultGraph;
}

export function getGraph(scenario = null) {
  const target = scenario || activeScenario;
  const g = graphs.get(target);
  if (!g) {
    if (graphs.has('default')) return graphs.get('default');
    throw new Error(`GraphService Error: Graph for scenario '${target}' has not been initialized.`);
  }
  return g;
}

export function getHashTable(scenario = null) {
  const target = scenario || activeScenario;
  return hashTables.get(target) || hashTables.get('default');
}

export function getBPlusTree(scenario = null) {
  const target = scenario || activeScenario;
  return bPlusTrees.get(target) || bPlusTrees.get('default');
}

export function getActiveScenario() {
  return activeScenario;
}

export function setActiveScenario(scenarioName) {
  if (!graphs.has(scenarioName)) {
    throw new Error(`Scenario '${scenarioName}' is not available.`);
  }
  activeScenario = scenarioName;
  console.log(`[GraphService] Active scenario switched to: ${scenarioName}`);
  return activeScenario;
}

export function getShowcasePairs(scenario = null) {
  const target = scenario || activeScenario;
  return showcasePairsMap.get(target) || showcasePairsMap.get('default') || [];
}

export function getAvailableScenarios() {
  return [
    {
      id: 'default',
      name: 'Nashik Academic Campus',
      description: '40 vertices across 6 academic/medical zones with 116 directed edges and bottleneck bridge to St. Jude Island.',
      nodeCount: graphs.get('default')?.nodes?.size || 40,
      edgeCount: graphs.get('default')?.edges?.size || 116,
      showcasePairs: showcasePairsMap.get('default') || []
    },
    {
      id: 'city-dense',
      name: 'City-Dense Metropolitan',
      description: 'Dense metropolitan road network with 1,520 vertices, ~4,000 edges, river barrier, 3 bridges, arterial diagonals, and ring expressway.',
      nodeCount: graphs.get('city-dense')?.nodes?.size || 1520,
      edgeCount: graphs.get('city-dense')?.edges?.size || 4260,
      showcasePairs: showcasePairsMap.get('city-dense') || []
    }
  ];
}

/**
 * Updates a road edge condition in both MongoDB and in-memory Graph.
 * Increments graphVersion.
 */
export async function updateRoadCondition(edgeId, condition, multiplier = null, actorId = 'DISPATCHER') {
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

  // Find corresponding in-memory graph
  const targetScenario = dbEdge.scenario || 'default';
  const graph = getGraph(targetScenario);
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
      scenario: targetScenario,
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
  getActiveScenario,
  setActiveScenario,
  getShowcasePairs,
  getAvailableScenarios,
  updateRoadCondition
};
