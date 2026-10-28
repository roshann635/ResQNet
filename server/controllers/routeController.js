import { getGraph } from '../services/graphService.js';
import { bfs } from '../dsa/bfs.js';
import { dfs } from '../dsa/dfs.js';
import { dijkstra } from '../dsa/dijkstra.js';
import { astar } from '../dsa/astar.js';
import { findAlternativeRoutes } from '../dsa/backtracking.js';
import { bidirectionalDijkstra } from '../dsa/bidirectional.js';
import { bfsTraversal, dfsTraversal } from '../dsa/traversal.js';
import { AlgorithmRun } from '../models/index.js';

let runSeqCounter = 0;

export async function computeRoute(req, res, next) {
  try {
    const {
      algorithm = 'DIJKSTRA',
      source: rawSource,
      originNodeId,
      destination: rawDest,
      destinationNodeId,
      limits = {},
      heuristic = 'EUCLIDEAN'
    } = req.body;

    const source = rawSource || originNodeId;
    const destination = rawDest || destinationNodeId;

    if (!source || !destination) {
      return res.status(400).json({
        error: 'Missing required parameters: source and destination node IDs.',
        code: 'MISSING_PARAMS'
      });
    }

    const graph = getGraph(req.body.scenario);
    let result = null;

    switch (algorithm.toUpperCase()) {
      case 'DIJKSTRA':
        result = dijkstra(graph, source, destination);
        break;

      case 'ASTAR':
      case 'A*':
        result = astar(graph, source, destination, heuristic);
        break;

      case 'BFS':
        result = bfs(graph, source, destination);
        break;

      case 'DFS':
        result = dfs(graph, source, destination);
        break;

      case 'BACKTRACKING':
        result = findAlternativeRoutes(graph, source, destination, limits);
        break;

      case 'BIDIRECTIONAL':
        result = bidirectionalDijkstra(graph, source, destination);
        break;

      default:
        return res.status(400).json({
          error: `Unsupported algorithm: '${algorithm}'. Choose from BFS, DFS, DIJKSTRA, ASTAR, BIDIRECTIONAL, BACKTRACKING.`,
          code: 'UNSUPPORTED_ALGORITHM'
        });
    }

    runSeqCounter++;
    const runId = `RUN-${Date.now()}-${runSeqCounter}`;
    const algoRun = new AlgorithmRun({
      runId,
      algorithm: algorithm.toUpperCase(),
      sourceNodeId: source,
      destinationNodeId: destination,
      graphVersion: graph.graphVersion,
      routeNodeIds: result.path || (result.routes && result.routes[0] ? result.routes[0].path : []),
      routeCost: result.cost || (result.routes && result.routes[0] ? result.routes[0].cost : 0),
      nodesExpanded: result.nodesExpanded || 0,
      edgesExamined: result.edgesExamined || 0,
      runtimeMs: result.runtimeMs || 0,
      outcome: result.outcome || (result.found || (result.routes && result.routes.length > 0) ? 'FOUND' : 'NO_ROUTE'),
      limits,
      exploredNodes: result.steps ? result.steps.slice(0, 100) : [], // Store up to 100 steps for playback
      isSynthetic: false
    });
    await algoRun.save();

    res.json({
      runId,
      ...result,
      graphVersion: graph.graphVersion
    });
  } catch (err) {
    next(err);
  }
}

export async function compareAlgorithms(req, res, next) {
  try {
    const { source: rawSource, originNodeId, destination: rawDest, destinationNodeId, limits = {} } = req.body;
    const source = rawSource || originNodeId;
    const destination = rawDest || destinationNodeId;

    if (!source || !destination) {
      return res.status(400).json({
        error: 'Missing required parameters: source and destination node IDs.',
        code: 'MISSING_PARAMS'
      });
    }

    const graph = getGraph(req.body.scenario);

    // Run all 5 algorithms on identical graph snapshot
    const bfsRes = bfs(graph, source, destination);
    const dfsRes = dfs(graph, source, destination);
    const dijkstraRes = dijkstra(graph, source, destination);
    const astarRes = astar(graph, source, destination, 'EUCLIDEAN');
    const backtrackRes = findAlternativeRoutes(graph, source, destination, { maxHops: 10, maxCost: 50, maxResults: 3 });

    // Build side-by-side comparison matrix with separate theoretical complexity and measured metrics (AT-17)
    const comparison = [
      {
        algorithm: 'Dijkstra',
        paradigm: 'Greedy Shortest Path (Priority Queue)',
        theoreticalComplexity: 'O((V + E) log V)',
        spaceComplexity: 'O(V)',
        measuredRuntimeMs: dijkstraRes.runtimeMs,
        routeCost: dijkstraRes.cost,
        nodesExpanded: dijkstraRes.nodesExpanded,
        edgesExamined: dijkstraRes.edgesExamined,
        pathLength: dijkstraRes.path.length,
        path: dijkstraRes.path,
        outcome: dijkstraRes.outcome,
        isOptimal: true
      },
      {
        algorithm: 'A* (Euclidean)',
        paradigm: 'Informed Heuristic Search (f = g + h)',
        theoreticalComplexity: 'O((V + E) log V) with admissible h',
        spaceComplexity: 'O(V)',
        measuredRuntimeMs: astarRes.runtimeMs,
        routeCost: astarRes.cost,
        nodesExpanded: astarRes.nodesExpanded,
        edgesExamined: astarRes.edgesExamined,
        pathLength: astarRes.path.length,
        path: astarRes.path,
        outcome: astarRes.outcome,
        isOptimal: true
      },
      {
        algorithm: 'BFS',
        paradigm: 'Breadth-First Traversal (FIFO Queue)',
        theoreticalComplexity: 'O(V + E)',
        spaceComplexity: 'O(V)',
        measuredRuntimeMs: bfsRes.runtimeMs,
        routeCost: 'N/A (Unweighted hops)',
        nodesExpanded: bfsRes.nodesExpanded,
        edgesExamined: bfsRes.edgesExamined,
        pathLength: bfsRes.unweightedHopPath.length,
        path: bfsRes.unweightedHopPath,
        outcome: bfsRes.targetFound ? 'TARGET_REACHED' : 'UNREACHED',
        isOptimal: false
      },
      {
        algorithm: 'DFS',
        paradigm: 'Depth-First Traversal (LIFO Stack)',
        theoreticalComplexity: 'O(V + E)',
        spaceComplexity: 'O(V)',
        measuredRuntimeMs: dfsRes.runtimeMs,
        routeCost: 'N/A (Depth traversal)',
        nodesExpanded: dfsRes.nodesExpanded,
        edgesExamined: dfsRes.edgesExamined,
        pathLength: dfsRes.discoveryPath.length,
        path: dfsRes.discoveryPath,
        outcome: dfsRes.targetFound ? 'TARGET_REACHED' : 'UNREACHED',
        isOptimal: false
      },
      {
        algorithm: 'Backtracking',
        paradigm: 'Bounded Recursive Search (Choose/Explore/Undo)',
        theoreticalComplexity: 'O(b^d) pruned by bounds',
        spaceComplexity: 'O(d) recursion depth',
        measuredRuntimeMs: backtrackRes.runtimeMs,
        routeCost: backtrackRes.routes[0] ? backtrackRes.routes[0].cost : 'N/A',
        nodesExpanded: backtrackRes.nodesExpanded,
        edgesExamined: backtrackRes.edgesExamined,
        pathLength: backtrackRes.routes[0] ? backtrackRes.routes[0].path.length : 0,
        path: backtrackRes.routes[0] ? backtrackRes.routes[0].path : [],
        outcome: backtrackRes.routesCount > 0 ? 'BOUNDED_ENUMERATION' : 'NO_ROUTE',
        routesFoundCount: backtrackRes.routesCount,
        isOptimal: false
      }
    ];

    res.json({
      source,
      destination,
      graphVersion: graph.graphVersion,
      comparison
    });
  } catch (err) {
    next(err);
  }
}

export async function findAlternatives(req, res, next) {
  try {
    const { source, destination, limits } = req.body;
    if (!source || !destination) {
      return res.status(400).json({ error: 'source and destination are required', code: 'MISSING_PARAMS' });
    }
    const graph = getGraph(req.body.scenario);
    const result = findAlternativeRoutes(graph, source, destination, limits);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function traverseGraph(req, res, next) {
  try {
    const { algorithm = 'BFS', startNodeId, maxDepth } = req.body;
    if (!startNodeId) {
      return res.status(400).json({ error: 'startNodeId is required', code: 'MISSING_PARAMS' });
    }
    const graph = getGraph(req.body.scenario);
    let result = null;
    if (algorithm.toUpperCase() === 'DFS') {
      result = dfsTraversal(graph, startNodeId, maxDepth);
    } else {
      result = bfsTraversal(graph, startNodeId, maxDepth);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export default { computeRoute, compareAlgorithms, findAlternatives, traverseGraph };
