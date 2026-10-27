import { MinHeap } from './MinHeap.js';

/**
 * Dijkstra's Single-Source Shortest Path Algorithm using Custom Binary MinHeap.
 *
 * Requirements:
 *  - Strict rejection of negative weights.
 *  - Returns path, cost, nodesExpanded, edgesExamined, runtimeMs, or clear no-route result.
 *  - Detailed step-by-step exploration log for visual playback.
 *
 * Time Complexity: O((V + E) log V)
 * Space Complexity: O(V)
 */
export function dijkstra(graph, sourceNodeId, destinationNodeId) {
  const startTime = performance.now();

  if (!graph.getNode(sourceNodeId)) {
    throw new Error(`Dijkstra Error: Source node '${sourceNodeId}' does not exist in graph.`);
  }
  if (!graph.getNode(destinationNodeId)) {
    throw new Error(`Dijkstra Error: Destination node '${destinationNodeId}' does not exist in graph.`);
  }

  const distances = new Map();
  const predecessors = new Map();
  const visited = new Set();
  const steps = [];

  let nodesExpanded = 0;
  let edgesExamined = 0;

  // Initialize distances to Infinity
  for (const nodeId of graph.nodes.keys()) {
    distances.set(nodeId, Infinity);
    predecessors.set(nodeId, null);
  }
  distances.set(sourceNodeId, 0.0);

  // MinHeap storing { nodeId, priority: distance }
  const minHeap = new MinHeap((a, b) => a.priority - b.priority);
  minHeap.insert({ nodeId: sourceNodeId }, 0.0);

  steps.push({
    step: 0,
    action: 'INITIALIZE',
    nodeId: sourceNodeId,
    cost: 0.0,
    explanation: `Initialized Dijkstra from source ${sourceNodeId} with cost 0.0. All other node costs set to ∞.`,
    visitedNodes: [],
    frontier: [{ nodeId: sourceNodeId, cost: 0.0 }]
  });

  let found = false;

  while (!minHeap.isEmpty()) {
    const minEntry = minHeap.extractMin();
    const current = minEntry.nodeId;
    const currentDist = minEntry.priority;

    // Skip stale heap entries
    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    nodesExpanded++;

    steps.push({
      step: steps.length,
      action: 'EXPAND_MIN',
      nodeId: current,
      cost: Math.round(currentDist * 100) / 100,
      explanation: `Extracted node ${current} with minimum tentative cost ${currentDist.toFixed(2)} km. Marked settled.`,
      visitedNodes: Array.from(visited),
      frontier: minHeap.heap.map((h) => ({ nodeId: h.nodeId, cost: h.priority }))
    });

    if (current === destinationNodeId) {
      found = true;
      steps.push({
        step: steps.length,
        action: 'DESTINATION_REACHED',
        nodeId: current,
        cost: Math.round(currentDist * 100) / 100,
        explanation: `Optimal shortest path found to destination ${destinationNodeId} with confirmed cost ${currentDist.toFixed(2)} km.`,
        visitedNodes: Array.from(visited),
        frontier: []
      });
      break;
    }

    const neighbors = graph.getNeighbors(current, false); // Skips blocked roads
    for (const neighbor of neighbors) {
      edgesExamined++;

      if (neighbor.weight < 0) {
        throw new Error(`Dijkstra Error: Negative edge weight detected on ${neighbor.edgeId}: ${neighbor.weight}`);
      }

      if (visited.has(neighbor.toNodeId)) {
        continue;
      }

      const tentativeDistance = currentDist + neighbor.weight;
      const currentKnownDist = distances.get(neighbor.toNodeId);

      if (tentativeDistance < currentKnownDist) {
        distances.set(neighbor.toNodeId, tentativeDistance);
        predecessors.set(neighbor.toNodeId, current);
        minHeap.insert({ nodeId: neighbor.toNodeId }, tentativeDistance);

        steps.push({
          step: steps.length,
          action: 'RELAX_EDGE',
          nodeId: neighbor.toNodeId,
          fromNodeId: current,
          edgeId: neighbor.edgeId,
          cost: Math.round(tentativeDistance * 100) / 100,
          explanation: `Relaxed edge ${current} -> ${neighbor.toNodeId} (weight: ${neighbor.weight.toFixed(2)} km). Improved tentative cost to ${tentativeDistance.toFixed(2)} km.`,
          visitedNodes: Array.from(visited),
          frontier: minHeap.heap.map((h) => ({ nodeId: h.nodeId, cost: h.priority }))
        });
      }
    }
  }

  const runtimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  if (!found) {
    return {
      algorithm: 'DIJKSTRA',
      sourceNodeId,
      destinationNodeId,
      path: [],
      cost: Infinity,
      found: false,
      outcome: 'NO_ROUTE',
      explanation: `No traversable path exists from ${sourceNodeId} to ${destinationNodeId}. Road segments may be blocked or disconnected.`,
      nodesExpanded,
      edgesExamined,
      runtimeMs,
      graphVersion: graph.graphVersion,
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

  const totalCost = Math.round(distances.get(destinationNodeId) * 100) / 100;

  return {
    algorithm: 'DIJKSTRA',
    sourceNodeId,
    destinationNodeId,
    path,
    cost: totalCost,
    found: true,
    outcome: 'FOUND',
    explanation: `Optimal shortest route discovered consisting of ${path.length} nodes with total cost ${totalCost.toFixed(2)} km.`,
    nodesExpanded,
    edgesExamined,
    runtimeMs,
    graphVersion: graph.graphVersion,
    steps
  };
}

export default dijkstra;
