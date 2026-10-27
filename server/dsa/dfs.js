/**
 * Depth-First Search (DFS) Traversal using an explicit iterative LIFO Stack.
 *
 * NOTE: Labeled strictly as a TRAVERSAL algorithm, NOT a shortest-path algorithm.
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 */
export function dfs(graph, startNodeId, targetNodeId = null) {
  const startTime = performance.now();
  const stack = [startNodeId];
  const visited = new Set();
  const visitOrder = [];
  const predecessors = new Map();
  const steps = [];

  let nodesExpanded = 0;
  let edgesExamined = 0;
  let targetFound = false;

  predecessors.set(startNodeId, null);

  steps.push({
    step: 0,
    action: 'INITIALIZE',
    nodeId: startNodeId,
    explanation: `Pushed start node ${startNodeId} onto the LIFO depth stack.`,
    stackState: [...stack],
    visitedNodes: []
  });

  while (stack.length > 0) {
    const current = stack.pop();

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);
    visitOrder.push(current);
    nodesExpanded++;

    steps.push({
      step: steps.length,
      action: 'POP_AND_VISIT',
      nodeId: current,
      explanation: `Popped node ${current} from stack and marked as visited.`,
      stackState: [...stack],
      visitedNodes: [...visited]
    });

    if (targetNodeId && current === targetNodeId) {
      targetFound = true;
      steps.push({
        step: steps.length,
        action: 'TARGET_REACHED',
        nodeId: current,
        explanation: `Target node ${targetNodeId} reached during depth-first traversal.`,
        stackState: [...stack],
        visitedNodes: [...visited]
      });
      break;
    }

    // Get neighbors in deterministic reverse order so left-to-right is popped first
    const neighbors = graph.getNeighbors(current, false);
    for (let i = neighbors.length - 1; i >= 0; i--) {
      const neighbor = neighbors[i];
      edgesExamined++;
      if (!visited.has(neighbor.toNodeId)) {
        if (!predecessors.has(neighbor.toNodeId)) {
          predecessors.set(neighbor.toNodeId, current);
        }
        stack.push(neighbor.toNodeId);

        steps.push({
          step: steps.length,
          action: 'PUSH_NEIGHBOR',
          nodeId: neighbor.toNodeId,
          explanation: `Pushed unvisited neighbor ${neighbor.toNodeId} onto stack for deeper exploration.`,
          stackState: [...stack],
          visitedNodes: [...visited]
        });
      }
    }
  }

  let discoveryPath = [];
  if (targetNodeId && targetFound) {
    let curr = targetNodeId;
    while (curr) {
      discoveryPath.unshift(curr);
      curr = predecessors.get(curr);
    }
  }

  const runtimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    algorithm: 'DFS',
    type: 'GRAPH_TRAVERSAL',
    isShortestPathAlgorithm: false,
    label: 'Depth-First Search (Iterative Stack Traversal)',
    startNodeId,
    targetNodeId,
    targetFound,
    visitOrder,
    reachableSet: Array.from(visited),
    discoveryPath,
    nodesExpanded,
    edgesExamined,
    runtimeMs,
    graphVersion: graph.graphVersion,
    steps
  };
}

export default dfs;
