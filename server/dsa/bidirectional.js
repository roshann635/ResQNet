import { MinHeap } from './MinHeap.js';

/**
 * Bidirectional Dijkstra Shortest Path Algorithm in Pure JavaScript.
 *
 * Simultaneously expands forward from source and backward from destination.
 * Detects the optimal meeting node when frontiers intersect.
 *
 * Time Complexity: O(((V + E) log V) / 2) - expands significantly fewer nodes
 * Space Complexity: O(V)
 */
export function bidirectionalDijkstra(graph, sourceNodeId, destinationNodeId) {
  const startTime = performance.now();

  if (!graph.getNode(sourceNodeId)) {
    throw new Error(`Bidirectional Error: Source node '${sourceNodeId}' does not exist.`);
  }
  if (!graph.getNode(destinationNodeId)) {
    throw new Error(`Bidirectional Error: Destination node '${destinationNodeId}' does not exist.`);
  }

  if (sourceNodeId === destinationNodeId) {
    return {
      path: [sourceNodeId],
      cost: 0,
      nodesExpanded: 1,
      edgesExamined: 0,
      runtimeMs: 0.05,
      meetingNodeId: sourceNodeId,
      exploredOrder: [{ nodeId: sourceNodeId, direction: 'both' }],
      outcome: 'SUCCESS'
    };
  }

  // Forward state
  const distF = new Map();
  const prevF = new Map();
  const visitedF = new Set();
  const heapF = new MinHeap((a, b) => a.priority - b.priority);

  // Backward state
  const distB = new Map();
  const prevB = new Map();
  const visitedB = new Set();
  const heapB = new MinHeap((a, b) => a.priority - b.priority);

  for (const nodeId of graph.nodes.keys()) {
    distF.set(nodeId, Infinity);
    prevF.set(nodeId, null);
    distB.set(nodeId, Infinity);
    prevB.set(nodeId, null);
  }

  distF.set(sourceNodeId, 0.0);
  heapF.insert({ nodeId: sourceNodeId }, 0.0);

  distB.set(destinationNodeId, 0.0);
  heapB.insert({ nodeId: destinationNodeId }, 0.0);

  // Reverse adjacency map for backward search
  const revAdj = new Map();
  for (const nodeId of graph.nodes.keys()) {
    revAdj.set(nodeId, []);
  }
  for (const edge of graph.edges.values()) {
    if (edge.active && edge.condition !== 'blocked') {
      const mult = edge.condition === 'congested' ? (edge.multiplier || 2.0) : 1.0;
      const cost = edge.baseCost * mult;
      revAdj.get(edge.toNodeId)?.push({
        toNodeId: edge.fromNodeId,
        edgeId: edge.edgeId,
        cost
      });
    }
  }

  let bestCost = Infinity;
  let meetingNode = null;
  let nodesExpanded = 0;
  let edgesExamined = 0;

  const exploredOrder = [];

  while (!heapF.isEmpty() && !heapB.isEmpty()) {
    // Check stopping condition: sum of min keys exceeds bestCost found so far
    const minF = heapF.peek()?.priority || 0;
    const minB = heapB.peek()?.priority || 0;
    if (minF + minB >= bestCost) {
      break;
    }

    // Expand Forward Step
    const currF = heapF.extractMin();
    const uF = currF.nodeId;
    const dF = currF.priority;

    if (!visitedF.has(uF)) {
      visitedF.add(uF);
      nodesExpanded++;
      exploredOrder.push({ nodeId: uF, direction: 'forward', cost: dF });

      if (visitedB.has(uF)) {
        const total = dF + distB.get(uF);
        if (total < bestCost) {
          bestCost = total;
          meetingNode = uF;
        }
      }

      const neighbors = graph.getAdjacentEdges(uF);
      for (const edge of neighbors) {
        edgesExamined++;
        const v = edge.toNodeId;
        const alt = dF + edge.effectiveCost;
        if (alt < distF.get(v)) {
          distF.set(v, alt);
          prevF.set(v, uF);
          heapF.insert({ nodeId: v }, alt);

          if (visitedB.has(v)) {
            const total = alt + distB.get(v);
            if (total < bestCost) {
              bestCost = total;
              meetingNode = v;
            }
          }
        }
      }
    }

    // Expand Backward Step
    const currB = heapB.extractMin();
    const uB = currB.nodeId;
    const dB = currB.priority;

    if (!visitedB.has(uB)) {
      visitedB.add(uB);
      nodesExpanded++;
      exploredOrder.push({ nodeId: uB, direction: 'backward', cost: dB });

      if (visitedF.has(uB)) {
        const total = distF.get(uB) + dB;
        if (total < bestCost) {
          bestCost = total;
          meetingNode = uB;
        }
      }

      const backwardNeighbors = revAdj.get(uB) || [];
      for (const edge of backwardNeighbors) {
        edgesExamined++;
        const v = edge.toNodeId;
        const alt = dB + edge.cost;
        if (alt < distB.get(v)) {
          distB.set(v, alt);
          prevB.set(v, uB);
          heapB.insert({ nodeId: v }, alt);

          if (visitedF.has(v)) {
            const total = distF.get(v) + alt;
            if (total < bestCost) {
              bestCost = total;
              meetingNode = v;
            }
          }
        }
      }
    }
  }

  const runtimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  if (!meetingNode || bestCost === Infinity) {
    return {
      path: [],
      cost: Infinity,
      nodesExpanded,
      edgesExamined,
      runtimeMs,
      meetingNodeId: null,
      exploredOrder,
      outcome: 'NO_PATH_FOUND'
    };
  }

  // Reconstruct path: source -> ... -> meetingNode -> ... -> destination
  const forwardPath = [];
  let curr = meetingNode;
  while (curr) {
    forwardPath.unshift(curr);
    curr = prevF.get(curr);
  }

  const backwardPath = [];
  curr = prevB.get(meetingNode);
  while (curr) {
    backwardPath.push(curr);
    curr = prevB.get(curr);
  }

  const completePath = [...forwardPath, ...backwardPath];

  return {
    path: completePath,
    cost: Math.round(bestCost * 100) / 100,
    nodesExpanded,
    edgesExamined,
    runtimeMs,
    meetingNodeId: meetingNode,
    exploredOrder,
    outcome: 'SUCCESS'
  };
}

export default bidirectionalDijkstra;
