/**
 * Hand-Verifiable Test Graph Fixture
 *
 * Topology:
 * 6 Nodes: A, B, C, D, E, F
 * Coordinates arranged linearly/grid-wise with predictable Euclidean distances.
 *
 * Directed Edges (with base weights):
 *  (A -> B): 2.0, (B -> A): 2.0
 *  (A -> C): 5.0, (C -> A): 5.0
 *  (B -> C): 1.0, (C -> B): 1.0
 *  (B -> D): 4.0, (D -> B): 4.0
 *  (C -> D): 2.0, (D -> C): 2.0
 *  (C -> E): 6.0, (E -> C): 6.0
 *  (D -> E): 1.0, (E -> D): 1.0
 *  (D -> F): 5.0, (F -> D): 5.0
 *  (E -> F): 2.0, (F -> E): 2.0
 *
 * Hand-computed shortest paths from A to F:
 *  - Primary shortest path: A -> B -> C -> D -> E -> F
 *    Accumulated costs:
 *      A: 0
 *      B: 2.0
 *      C: 2.0 + 1.0 = 3.0
 *      D: 3.0 + 2.0 = 5.0
 *      E: 5.0 + 1.0 = 6.0
 *      F: 6.0 + 2.0 = 8.0
 *    Total Cost = 8.0
 *
 *  - Alternative paths from A to F:
 *      1. A -> B -> C -> D -> E -> F (Cost: 8.0)
 *      2. A -> B -> D -> E -> F (Cost: 2 + 4 + 1 + 2 = 9.0)
 *      3. A -> C -> D -> E -> F (Cost: 5 + 2 + 1 + 2 = 10.0)
 *      4. A -> B -> D -> F (Cost: 2 + 4 + 5 = 11.0)
 *      5. A -> C -> E -> F (Cost: 5 + 6 + 2 = 13.0)
 *
 *  - Blocked Edge Simulation:
 *      If edge (D -> E) is BLOCKED:
 *      Shortest Path becomes: A -> B -> D -> F (Cost: 11.0)
 *      (Or A -> C -> E -> F with cost 13.0, but 11.0 is lower)
 */

export const handVerifiableNodes = [
  { nodeId: 'TEST-A', label: 'Point Alpha', latitude: 19.9900, longitude: 73.7800, zone: 'TestZone', active: true },
  { nodeId: 'TEST-B', label: 'Point Beta', latitude: 19.9910, longitude: 73.7810, zone: 'TestZone', active: true },
  { nodeId: 'TEST-C', label: 'Point Gamma', latitude: 19.9910, longitude: 73.7800, zone: 'TestZone', active: true },
  { nodeId: 'TEST-D', label: 'Point Delta', latitude: 19.9920, longitude: 73.7820, zone: 'TestZone', active: true },
  { nodeId: 'TEST-E', label: 'Point Epsilon', latitude: 19.9930, longitude: 73.7810, zone: 'TestZone', active: true },
  { nodeId: 'TEST-F', label: 'Point Zeta', latitude: 19.9940, longitude: 73.7830, zone: 'TestZone', active: true }
];

export const handVerifiableEdges = [
  { edgeId: 'T-AB', fromNodeId: 'TEST-A', toNodeId: 'TEST-B', baseCost: 2.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-BA', fromNodeId: 'TEST-B', toNodeId: 'TEST-A', baseCost: 2.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-AC', fromNodeId: 'TEST-A', toNodeId: 'TEST-C', baseCost: 5.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-CA', fromNodeId: 'TEST-C', toNodeId: 'TEST-A', baseCost: 5.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-BC', fromNodeId: 'TEST-B', toNodeId: 'TEST-C', baseCost: 1.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-CB', fromNodeId: 'TEST-C', toNodeId: 'TEST-B', baseCost: 1.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-BD', fromNodeId: 'TEST-B', toNodeId: 'TEST-D', baseCost: 4.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-DB', fromNodeId: 'TEST-D', toNodeId: 'TEST-B', baseCost: 4.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-CD', fromNodeId: 'TEST-C', toNodeId: 'TEST-D', baseCost: 2.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-DC', fromNodeId: 'TEST-D', toNodeId: 'TEST-C', baseCost: 2.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-CE', fromNodeId: 'TEST-C', toNodeId: 'TEST-E', baseCost: 6.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-EC', fromNodeId: 'TEST-E', toNodeId: 'TEST-C', baseCost: 6.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-DE', fromNodeId: 'TEST-D', toNodeId: 'TEST-E', baseCost: 1.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-ED', fromNodeId: 'TEST-E', toNodeId: 'TEST-D', baseCost: 1.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-DF', fromNodeId: 'TEST-D', toNodeId: 'TEST-F', baseCost: 5.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-FD', fromNodeId: 'TEST-F', toNodeId: 'TEST-D', baseCost: 5.0, condition: 'NORMAL', multiplier: 1.0, active: true },

  { edgeId: 'T-EF', fromNodeId: 'TEST-E', toNodeId: 'TEST-F', baseCost: 2.0, condition: 'NORMAL', multiplier: 1.0, active: true },
  { edgeId: 'T-FE', fromNodeId: 'TEST-F', toNodeId: 'TEST-E', baseCost: 2.0, condition: 'NORMAL', multiplier: 1.0, active: true }
];

export const handVerifiableExpected = {
  source: 'TEST-A',
  destination: 'TEST-F',
  shortestPath: ['TEST-A', 'TEST-B', 'TEST-C', 'TEST-D', 'TEST-E', 'TEST-F'],
  shortestCost: 8.0,
  alternativePathsMaxCost12: [
    { path: ['TEST-A', 'TEST-B', 'TEST-C', 'TEST-D', 'TEST-E', 'TEST-F'], cost: 8.0 },
    { path: ['TEST-A', 'TEST-B', 'TEST-D', 'TEST-E', 'TEST-F'], cost: 9.0 },
    { path: ['TEST-A', 'TEST-C', 'TEST-D', 'TEST-E', 'TEST-F'], cost: 10.0 },
    { path: ['TEST-A', 'TEST-B', 'TEST-D', 'TEST-F'], cost: 11.0 }
  ],
  blockedEdge: 'T-DE',
  shortestPathAfterBlock: ['TEST-A', 'TEST-B', 'TEST-C', 'TEST-D', 'TEST-F'],
  shortestCostAfterBlock: 10.0
};
