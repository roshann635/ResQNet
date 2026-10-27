import { MinHeap } from './MinHeap.js';

/**
 * Heuristics for A* Pathfinding.
 */
export const Heuristics = {
  /**
   * Euclidean Distance in km based on latitude/longitude planar approximation.
   * Admissible when road costs are calculated from Euclidean ground distance.
   */
  EUCLIDEAN: {
    id: 'EUCLIDEAN',
    name: 'Euclidean Coordinate Distance',
    isAdmissible: true,
    calculate: (lat1, lon1, lat2, lon2) => {
      const dLat = (lat2 - lat1) * 111.0;
      const dLon = (lon2 - lon1) * 111.0 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
      return Math.sqrt(dLat * dLat + dLon * dLon);
    }
  },

  /**
   * Great-Circle Haversine Distance on spherical earth.
   * Admissible for geographic distance units.
   */
  HAVERSINE: {
    id: 'HAVERSINE',
    name: 'Haversine Great-Circle Distance',
    isAdmissible: true,
    calculate: (lat1, lon1, lat2, lon2) => {
      const R = 6371.0; // Earth radius in km
      const toRad = Math.PI / 180;
      const dLat = (lat2 - lat1) * toRad;
      const dLon = (lon2 - lon1) * toRad;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    }
  },

  /**
   * Manhattan Distance (Grid based).
   * Labeled "experimental" as it may overestimate diagonal distances and violate admissibility.
   */
  MANHATTAN: {
    id: 'MANHATTAN',
    name: 'Manhattan Grid Distance (Experimental)',
    isAdmissible: false,
    calculate: (lat1, lon1, lat2, lon2) => {
      const dLat = Math.abs(lat2 - lat1) * 111.0;
      const dLon = Math.abs(lon2 - lon1) * 111.0 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
      return dLat + dLon;
    }
  }
};

/**
 * A* Pathfinding Algorithm in Pure JavaScript.
 *
 * Uses: f(n) = g(n) + h(n)
 *  - g(n): exact cumulative cost from start to node n
 *  - h(n): estimated heuristic cost from node n to destination
 *  - f(n): total estimated cost through node n
 *
 * Requirements:
 *  - Explicit g, h, f values per node
 *  - Selectable heuristic (Euclidean, Haversine, Manhattan)
 *  - Table of g/h/f evaluations
 *  - Same performance & metrics report as Dijkstra
 */
export function astar(graph, sourceNodeId, destinationNodeId, heuristicKey = 'EUCLIDEAN') {
  const startTime = performance.now();

  const sourceNode = graph.getNode(sourceNodeId);
  const destNode = graph.getNode(destinationNodeId);

  if (!sourceNode) {
    throw new Error(`A* Error: Source node '${sourceNodeId}' does not exist.`);
  }
  if (!destNode) {
    throw new Error(`A* Error: Destination node '${destinationNodeId}' does not exist.`);
  }

  const heuristic = Heuristics[heuristicKey] || Heuristics.EUCLIDEAN;

  const gScore = new Map();
  const fScore = new Map();
  const hScore = new Map();
  const predecessors = new Map();
  const visited = new Set();
  const steps = [];
  const ghfTable = [];

  let nodesExpanded = 0;
  let edgesExamined = 0;

  for (const nodeId of graph.nodes.keys()) {
    gScore.set(nodeId, Infinity);
    fScore.set(nodeId, Infinity);
    predecessors.set(nodeId, null);
  }

  const initialH = heuristic.calculate(
    sourceNode.latitude,
    sourceNode.longitude,
    destNode.latitude,
    destNode.longitude
  );

  gScore.set(sourceNodeId, 0.0);
  hScore.set(sourceNodeId, initialH);
  fScore.set(sourceNodeId, initialH);

  // MinHeap sorted by f(n)
  const openSet = new MinHeap((a, b) => a.f - b.f);
  openSet.insert({ nodeId: sourceNodeId, g: 0.0, h: initialH, f: initialH });

  ghfTable.push({
    nodeId: sourceNodeId,
    g: 0.0,
    h: Math.round(initialH * 100) / 100,
    f: Math.round(initialH * 100) / 100
  });

  steps.push({
    step: 0,
    action: 'INITIALIZE',
    nodeId: sourceNodeId,
    g: 0.0,
    h: Math.round(initialH * 100) / 100,
    f: Math.round(initialH * 100) / 100,
    explanation: `Initialized A* search using ${heuristic.name}. Initial estimate f(start) = ${initialH.toFixed(2)} km.`,
    visitedNodes: [],
    frontier: [{ nodeId: sourceNodeId, f: initialH }]
  });

  let found = false;

  while (!openSet.isEmpty()) {
    const currentEntry = openSet.extractMin();
    const current = currentEntry.nodeId;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    nodesExpanded++;

    steps.push({
      step: steps.length,
      action: 'EXPAND_BEST_F',
      nodeId: current,
      g: Math.round(gScore.get(current) * 100) / 100,
      h: Math.round((hScore.get(current) || 0) * 100) / 100,
      f: Math.round(fScore.get(current) * 100) / 100,
      explanation: `Expanded node ${current} with lowest f = ${fScore.get(current).toFixed(2)} (g=${gScore.get(current).toFixed(2)}, h=${(hScore.get(current) || 0).toFixed(2)}).`,
      visitedNodes: Array.from(visited),
      frontier: openSet.heap.map((h) => ({ nodeId: h.nodeId, f: h.f }))
    });

    if (current === destinationNodeId) {
      found = true;
      steps.push({
        step: steps.length,
        action: 'DESTINATION_REACHED',
        nodeId: current,
        g: Math.round(gScore.get(current) * 100) / 100,
        h: 0,
        f: Math.round(gScore.get(current) * 100) / 100,
        explanation: `Destination ${destinationNodeId} reached! Shortest path verified with cost ${gScore.get(current).toFixed(2)} km.`,
        visitedNodes: Array.from(visited),
        frontier: []
      });
      break;
    }

    const neighbors = graph.getNeighbors(current, false); // Skips blocked edges
    for (const neighbor of neighbors) {
      edgesExamined++;

      if (visited.has(neighbor.toNodeId)) {
        continue;
      }

      const tentativeG = gScore.get(current) + neighbor.weight;
      if (tentativeG < gScore.get(neighbor.toNodeId)) {
        const neighborNode = graph.getNode(neighbor.toNodeId);
        const h = heuristic.calculate(
          neighborNode.latitude,
          neighborNode.longitude,
          destNode.latitude,
          destNode.longitude
        );
        const f = tentativeG + h;

        predecessors.set(neighbor.toNodeId, current);
        gScore.set(neighbor.toNodeId, tentativeG);
        hScore.set(neighbor.toNodeId, h);
        fScore.set(neighbor.toNodeId, f);

        openSet.insert({ nodeId: neighbor.toNodeId, g: tentativeG, h, f });

        ghfTable.push({
          nodeId: neighbor.toNodeId,
          g: Math.round(tentativeG * 100) / 100,
          h: Math.round(h * 100) / 100,
          f: Math.round(f * 100) / 100
        });

        steps.push({
          step: steps.length,
          action: 'EVALUATE_NEIGHBOR',
          nodeId: neighbor.toNodeId,
          fromNodeId: current,
          edgeId: neighbor.edgeId,
          g: Math.round(tentativeG * 100) / 100,
          h: Math.round(h * 100) / 100,
          f: Math.round(f * 100) / 100,
          explanation: `Evaluated neighbor ${neighbor.toNodeId}: tentative g=${tentativeG.toFixed(2)}, h=${h.toFixed(2)}, f=${f.toFixed(2)}. Added to priority frontier.`,
          visitedNodes: Array.from(visited),
          frontier: openSet.heap.map((item) => ({ nodeId: item.nodeId, f: item.f }))
        });
      }
    }
  }

  const runtimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  if (!found) {
    return {
      algorithm: 'ASTAR',
      heuristic: {
        id: heuristic.id,
        name: heuristic.name,
        isAdmissible: heuristic.isAdmissible
      },
      sourceNodeId,
      destinationNodeId,
      path: [],
      cost: Infinity,
      found: false,
      outcome: 'NO_ROUTE',
      explanation: `No traversable path exists from ${sourceNodeId} to ${destinationNodeId}.`,
      nodesExpanded,
      edgesExamined,
      runtimeMs,
      graphVersion: graph.graphVersion,
      ghfTable,
      steps
    };
  }

  // Reconstruct path
  const path = [];
  let curr = destinationNodeId;
  while (curr) {
    path.unshift(curr);
    curr = predecessors.get(curr);
  }

  const totalCost = Math.round(gScore.get(destinationNodeId) * 100) / 100;

  return {
    algorithm: 'ASTAR',
    heuristic: {
      id: heuristic.id,
      name: heuristic.name,
      isAdmissible: heuristic.isAdmissible
    },
    sourceNodeId,
    destinationNodeId,
    path,
    cost: totalCost,
    found: true,
    outcome: 'FOUND',
    explanation: `A* optimal route found via ${path.length} nodes with cost ${totalCost.toFixed(2)} km using heuristic ${heuristic.name}.`,
    nodesExpanded,
    edgesExamined,
    runtimeMs,
    graphVersion: graph.graphVersion,
    ghfTable,
    steps
  };
}

export default astar;
