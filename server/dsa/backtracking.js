import config from '../config/index.js';

/**
 * Bounded Backtracking Alternative Route Finder in Pure JavaScript.
 *
 * Algorithm:
 *  - Recursive DFS with Choose / Explore / Undo.
 *  - Visited-set cycle prevention for simple paths.
 *  - Multi-constraint pruning: maxHops, maxCost, maxResults.
 *  - Skips blocked edges.
 *  - Ranks routes by cost.
 *  - Records failed branches and undo steps for visual playback.
 */
export function findAlternativeRoutes(
  graph,
  sourceNodeId,
  destinationNodeId,
  options = {}
) {
  const startTime = performance.now();

  const maxHops = options.maxHops || config.algorithmLimits.defaultMaxHops;
  const maxCost = options.maxCost || config.algorithmLimits.defaultMaxCost;
  const maxResults = options.maxResults || config.algorithmLimits.defaultMaxResults;

  const routes = [];
  const visited = new Set();
  const currentPath = [sourceNodeId];
  const steps = [];

  let nodesExpanded = 0;
  let edgesExamined = 0;
  let limitHit = false;

  visited.add(sourceNodeId);

  steps.push({
    step: 0,
    action: 'CHOOSE',
    nodeId: sourceNodeId,
    currentPath: [...currentPath],
    currentCost: 0,
    explanation: `Started backtracking exploration at source node ${sourceNodeId}.`
  });

  function backtrack(currentNodeId, currentCost) {
    if (routes.length >= maxResults) {
      limitHit = true;
      return;
    }

    // Goal test
    if (currentNodeId === destinationNodeId) {
      routes.push({
        path: [...currentPath],
        cost: Math.round(currentCost * 100) / 100,
        hops: currentPath.length - 1
      });

      steps.push({
        step: steps.length,
        action: 'ROUTE_FOUND',
        nodeId: currentNodeId,
        currentPath: [...currentPath],
        currentCost: Math.round(currentCost * 100) / 100,
        explanation: `Valid alternative route found! Path: [${currentPath.join(' -> ')}], Cost: ${currentCost.toFixed(2)} km.`
      });
      return;
    }

    // Prune by max hops
    if (currentPath.length - 1 >= maxHops) {
      limitHit = true;
      steps.push({
        step: steps.length,
        action: 'PRUNE_MAX_HOPS',
        nodeId: currentNodeId,
        currentPath: [...currentPath],
        currentCost: Math.round(currentCost * 100) / 100,
        explanation: `Pruned branch at ${currentNodeId}: exceeded maxHops limit (${maxHops}).`
      });
      return;
    }

    nodesExpanded++;
    const neighbors = graph.getNeighbors(currentNodeId, false); // Skips blocked edges

    for (const neighbor of neighbors) {
      edgesExamined++;
      const nextNodeId = neighbor.toNodeId;
      const nextCost = currentCost + neighbor.weight;

      // Cycle prevention
      if (visited.has(nextNodeId)) {
        steps.push({
          step: steps.length,
          action: 'CYCLE_DETECTED',
          nodeId: nextNodeId,
          fromNodeId: currentNodeId,
          explanation: `Skipped ${nextNodeId} from ${currentNodeId}: cycle detected (node already in current branch).`
        });
        continue;
      }

      // Cost pruning
      if (nextCost > maxCost) {
        limitHit = true;
        steps.push({
          step: steps.length,
          action: 'PRUNE_MAX_COST',
          nodeId: nextNodeId,
          fromNodeId: currentNodeId,
          explanation: `Pruned path through ${nextNodeId}: cost ${nextCost.toFixed(2)} km exceeds maxCost ${maxCost.toFixed(2)} km.`
        });
        continue;
      }

      // 1. CHOOSE
      visited.add(nextNodeId);
      currentPath.push(nextNodeId);

      steps.push({
        step: steps.length,
        action: 'CHOOSE',
        nodeId: nextNodeId,
        fromNodeId: currentNodeId,
        edgeId: neighbor.edgeId,
        currentPath: [...currentPath],
        currentCost: Math.round(nextCost * 100) / 100,
        explanation: `Choose: Advanced to ${nextNodeId} (edge cost: ${neighbor.weight.toFixed(2)} km). Branch cost: ${nextCost.toFixed(2)} km.`
      });

      // 2. EXPLORE
      backtrack(nextNodeId, nextCost);

      if (routes.length >= maxResults) {
        limitHit = true;
        // 3. UNDO
        currentPath.pop();
        visited.delete(nextNodeId);
        return;
      }

      // 3. UNDO (Backtrack)
      currentPath.pop();
      visited.delete(nextNodeId);

      steps.push({
        step: steps.length,
        action: 'UNDO',
        nodeId: nextNodeId,
        backtrackedTo: currentNodeId,
        currentPath: [...currentPath],
        currentCost: Math.round(currentCost * 100) / 100,
        explanation: `Undo: Backtracked from ${nextNodeId} back to ${currentNodeId}. Removed ${nextNodeId} from visited branch set.`
      });
    }
  }

  backtrack(sourceNodeId, 0.0);

  // Rank routes by cost
  routes.sort((a, b) => a.cost - b.cost);

  const runtimeMs = Math.round((performance.now() - startTime) * 100) / 100;

  return {
    algorithm: 'BACKTRACKING',
    sourceNodeId,
    destinationNodeId,
    routes,
    routesCount: routes.length,
    isBoundedEnumeration: limitHit,
    bounds: {
      maxHops,
      maxCost,
      maxResults
    },
    nodesExpanded,
    edgesExamined,
    runtimeMs,
    graphVersion: graph.graphVersion,
    steps
  };
}

export default findAlternativeRoutes;
