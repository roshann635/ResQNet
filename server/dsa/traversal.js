/**
 * Unweighted Graph Traversal Module (Pure JavaScript).
 *
 * Implements:
 *  1. BFS Traversal (Iterative FIFO Queue) with levels and reachable set.
 *  2. DFS Traversal (Iterative LIFO Stack).
 *  3. DFS Traversal (Recursive Variant with depth tracking).
 *
 * NOTE: Labeled strictly as UNWEIGHTED TRAVERSAL, NEVER as cost-optimal shortest path.
 *
 * Time Complexity: O(V + E)
 * Space Complexity: O(V)
 */

export function bfsTraversal(graph, startNodeId, targetNodeId = null) {
  const startTime = performance.now();
  if (!graph.getNode(startNodeId)) {
    throw new Error(`BFS Error: Start node '${startNodeId}' does not exist.`);
  }

  const queue = [startNodeId];
  const visited = new Set([startNodeId]);
  const visitOrder = [];
  const parentMap = new Map();
  const levels = new Map();
  const steps = [];

  let nodesExpanded = 0;
  let edgesExamined = 0;
  let targetFound = false;

  parentMap.set(startNodeId, null);
  levels.set(startNodeId, 0);

  steps.push({
    step: 0,
    action: 'INITIALIZE',
    nodeId: startNodeId,
    level: 0,
    explanation: `Started unweighted BFS from node ${startNodeId} at level 0.`,
    queueState: [...queue],
    visitedNodes: [...visited]
  });

  while (queue.length > 0) {
    const current = queue.shift();
    nodesExpanded++;
    visitOrder.push(current);
    const currentLevel = levels.get(current);

    if (targetNodeId && current === targetNodeId) {
      targetFound = true;
      break;
    }

    const adjacentEdges = graph.getAdjacentEdges(current);
    for (const edge of adjacentEdges) {
      edgesExamined++;
      const v = edge.toNodeId;
      if (!visited.has(v)) {
        visited.add(v);
        parentMap.set(v, current);
        levels.set(v, currentLevel + 1);
        queue.push(v);

        steps.push({
          step: steps.length,
          action: 'ENQUEUE',
          from: current,
          to: v,
          level: currentLevel + 1,
          explanation: `Discovered node ${v} at level ${currentLevel + 1}.`,
          queueState: [...queue],
          visitedNodes: [...visited]
        });
      }
    }
  }

  const path = [];
  if (targetFound) {
    let curr = targetNodeId;
    while (curr) {
      path.unshift(curr);
      curr = parentMap.get(curr);
    }
  }

  return {
    algorithm: 'BFS (Unweighted Traversal)',
    nature: 'unweighted_level_order',
    isCostOptimal: false,
    visitOrder,
    parentMap: Object.fromEntries(parentMap),
    levels: Object.fromEntries(levels),
    reachableSet: Array.from(visited),
    reachableCount: visited.size,
    path,
    nodesExpanded,
    edgesExamined,
    targetFound,
    steps,
    runtimeMs: Math.round((performance.now() - startTime) * 100) / 100
  };
}

export function dfsIterative(graph, startNodeId, targetNodeId = null) {
  const startTime = performance.now();
  if (!graph.getNode(startNodeId)) {
    throw new Error(`DFS Error: Start node '${startNodeId}' does not exist.`);
  }

  const stack = [startNodeId];
  const visited = new Set();
  const visitOrder = [];
  const parentMap = new Map();
  const levels = new Map();
  const steps = [];

  let nodesExpanded = 0;
  let edgesExamined = 0;
  let targetFound = false;

  parentMap.set(startNodeId, null);
  levels.set(startNodeId, 0);

  while (stack.length > 0) {
    const current = stack.pop();

    if (!visited.has(current)) {
      visited.add(current);
      visitOrder.push(current);
      nodesExpanded++;

      if (targetNodeId && current === targetNodeId) {
        targetFound = true;
        break;
      }

      const adjacentEdges = graph.getAdjacentEdges(current);
      for (const edge of adjacentEdges) {
        edgesExamined++;
        const v = edge.toNodeId;
        if (!visited.has(v)) {
          parentMap.set(v, current);
          levels.set(v, (levels.get(current) || 0) + 1);
          stack.push(v);
        }
      }
    }
  }

  const path = [];
  if (targetFound) {
    let curr = targetNodeId;
    while (curr) {
      path.unshift(curr);
      curr = parentMap.get(curr);
    }
  }

  return {
    algorithm: 'DFS (Iterative Stack)',
    nature: 'unweighted_depth_order',
    isCostOptimal: false,
    visitOrder,
    parentMap: Object.fromEntries(parentMap),
    levels: Object.fromEntries(levels),
    reachableSet: Array.from(visited),
    reachableCount: visited.size,
    path,
    nodesExpanded,
    edgesExamined,
    targetFound,
    steps,
    runtimeMs: Math.round((performance.now() - startTime) * 100) / 100
  };
}

export function dfsRecursive(graph, startNodeId, maxDepth = 500) {
  const startTime = performance.now();
  const visited = new Set();
  const visitOrder = [];
  const parentMap = new Map();
  const levels = new Map();

  function recurse(u, depth) {
    if (depth > maxDepth) return;
    visited.add(u);
    visitOrder.push(u);
    levels.set(u, depth);

    const adjacentEdges = graph.getAdjacentEdges(u);
    for (const edge of adjacentEdges) {
      const v = edge.toNodeId;
      if (!visited.has(v)) {
        parentMap.set(v, u);
        recurse(v, depth + 1);
      }
    }
  }

  parentMap.set(startNodeId, null);
  recurse(startNodeId, 0);

  return {
    algorithm: 'DFS (Recursive Variant)',
    nature: 'unweighted_depth_order',
    isCostOptimal: false,
    visitOrder,
    parentMap: Object.fromEntries(parentMap),
    levels: Object.fromEntries(levels),
    reachableSet: Array.from(visited),
    reachableCount: visited.size,
    runtimeMs: Math.round((performance.now() - startTime) * 100) / 100
  };
}

export const dfsTraversal = dfsIterative;
export default { bfsTraversal, dfsIterative, dfsRecursive, dfsTraversal };
