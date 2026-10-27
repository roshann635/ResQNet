/**
 * Breadth-First Search (BFS) Traversal using iterative FIFO Queue.
 *
 * NOTE: Labeled strictly as a TRAVERSAL algorithm, NOT a weighted shortest-path algorithm.
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 */
export function bfs(graph, startNodeId, targetNodeId = null) {
  const startTime = performance.now();
  const queue = [startNodeId];
  const visited = new Set([startNodeId]);
  const visitOrder = [];
  const predecessors = new Map();
  const steps = []; // For step-by-step visualization playback

  let nodesExpanded = 0;
  let edgesExamined = 0;
  let targetFound = false;

  predecessors.set(startNodeId, null);

  steps.push({
    step: 0,
    action: 'INITIALIZE',
    nodeId: startNodeId,
    explanation: `Started BFS traversal from root node ${startNodeId}. Added to FIFO queue.`,
    queueState: [...queue],
    visitedNodes: [...visited]
  });

  while (queue.length > 0) {
    const current = queue.shift();
    nodesExpanded++;
    visitOrder.push(current);

    steps.push({
      step: steps.length,
      action: 'DEQUEUE',
      nodeId: current,
      explanation: `Dequeued node ${current} for neighborhood inspection.`,
      queueState: [...queue],
      visitedNodes: [...visited]
    });

    if (targetNodeId && current === targetNodeId) {
      targetFound = true;
      steps.push({
        step: steps.length,
        action: 'TARGET_REACHED',
        nodeId: current,
        explanation: `Target node ${targetNodeId} reached during breadth-first exploration.`,
        queueState: [...queue],
        visitedNodes: [...visited]
      });
      break;
    }

    const neighbors = graph.getNeighbors(current, false); // Skips blocked edges
    for (const neighbor of neighbors) {
      edgesExamined++;
      if (!visited.has(neighbor.toNodeId)) {
        visited.add(neighbor.toNodeId);
        predecessors.set(neighbor.toNodeId, current);
        queue.push(neighbor.toNodeId);

        steps.push({
          step: steps.length,
          action: 'ENQUEUE',
          nodeId: neighbor.toNodeId,
          explanation: `Discovered unvisited neighbor ${neighbor.toNodeId} via edge ${neighbor.edgeId}. Queued for breadth expansion.`,
          queueState: [...queue],
          visitedNodes: [...visited]
        });
      }
    }
  }

  // Reconstruct unweighted hop-path if target was specified and found
  let hopPath = [];
  if (targetNodeId && targetFound) {
    let curr = targetNodeId;
    while (curr) {
      hopPath.unshift(curr);
      curr = predecessors.get(curr);
    }
  }

  const runtimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    algorithm: 'BFS',
    type: 'GRAPH_TRAVERSAL',
    isShortestPathAlgorithm: false,
    label: 'Breadth-First Search (Queue-Based Traversal)',
    startNodeId,
    targetNodeId,
    targetFound,
    visitOrder,
    reachableSet: Array.from(visited),
    unweightedHopPath: hopPath,
    nodesExpanded,
    edgesExamined,
    runtimeMs,
    graphVersion: graph.graphVersion,
    steps
  };
}

export default bfs;
