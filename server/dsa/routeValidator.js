import config from '../config/index.js';

/**
 * Route Validation & Staleness Detection Module.
 *
 * Requirements (Section 3.13):
 *  - Confirm every edge is currently traversable (exists and not blocked).
 *  - Confirm no node repeats (simple path check).
 *  - Compare route's graph version against current graph version:
 *    Routes computed on an older graph version are strictly marked STALE.
 */
export function validateRoute(graph, routeNodeIds = [], routeGraphVersion = null) {
  if (!routeNodeIds || !Array.isArray(routeNodeIds) || routeNodeIds.length === 0) {
    return {
      isValid: false,
      isStale: false,
      reason: 'Route array is empty or invalid.'
    };
  }

  // 1. Check for single node route
  if (routeNodeIds.length === 1) {
    const nodeExists = graph.getNode(routeNodeIds[0]) !== null;
    return {
      isValid: nodeExists,
      isStale: routeGraphVersion !== null && routeGraphVersion < graph.graphVersion,
      reason: nodeExists ? 'Trivial single-node path.' : `Node ${routeNodeIds[0]} not found.`,
      currentGraphVersion: graph.graphVersion,
      routeGraphVersion
    };
  }

  // 2. Simple path verification: No node repeats
  const visitedNodes = new Set();
  for (const nodeId of routeNodeIds) {
    if (visitedNodes.has(nodeId)) {
      return {
        isValid: false,
        isStale: false,
        reason: `Route contains cycle: Node '${nodeId}' is repeated in the path sequence.`,
        currentGraphVersion: graph.graphVersion,
        routeGraphVersion
      };
    }
    visitedNodes.add(nodeId);
  }

  // 3. Confirm traversability of every consecutive edge
  let totalCost = 0.0;
  for (let i = 0; i < routeNodeIds.length - 1; i++) {
    const u = routeNodeIds[i];
    const v = routeNodeIds[i + 1];

    const neighbors = graph.getNeighbors(u, true); // Include blocked to find matching edge
    const matchingEdge = neighbors.find((n) => n.toNodeId === v);

    if (!matchingEdge) {
      return {
        isValid: false,
        isStale: false,
        reason: `Discontinuity: No road exists from node '${u}' to '${v}'.`,
        currentGraphVersion: graph.graphVersion,
        routeGraphVersion
      };
    }

    if (matchingEdge.condition === config.roadConditions.BLOCKED) {
      return {
        isValid: false,
        isStale: true,
        reason: `Road segment from '${u}' to '${v}' (Edge ${matchingEdge.edgeId}) is currently BLOCKED.`,
        blockedEdgeId: matchingEdge.edgeId,
        currentGraphVersion: graph.graphVersion,
        routeGraphVersion
      };
    }

    totalCost += graph.getEffectiveWeight(matchingEdge);
  }

  // 4. Staleness check
  const isStale = routeGraphVersion !== null && routeGraphVersion < graph.graphVersion;

  return {
    isValid: true,
    isStale,
    totalCost: Math.round(totalCost * 100) / 100,
    currentGraphVersion: graph.graphVersion,
    routeGraphVersion,
    reason: isStale
      ? `Route is valid but STALE (Computed at graph version ${routeGraphVersion}, current is ${graph.graphVersion}). Re-routing recommended.`
      : 'Route is fully valid and traversable on current graph version.'
  };
}

export default validateRoute;
