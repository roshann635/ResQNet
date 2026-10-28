import { RoadNode, RoadEdge, Dispatch, Incident } from '../models/index.js';
import { getGraph, getActiveScenario, updateRoadCondition } from '../services/graphService.js';
import { validateRoute } from '../dsa/routeValidator.js';
import config from '../config/index.js';
import { handleRoadConditionUpdate } from '../services/rerouteService.js';

export async function listNodes(req, res, next) {
  try {
    const scenario = req.query.scenario || getActiveScenario();
    const filter = {
      active: true,
      scenario: scenario === 'city-dense' ? 'city-dense' : { $ne: 'city-dense' }
    };
    const nodes = await RoadNode.find(filter).sort({ nodeId: 1 });
    res.json(nodes);
  } catch (err) {
    next(err);
  }
}

export async function listEdges(req, res, next) {
  try {
    const scenario = req.query.scenario || getActiveScenario();
    const filter = {
      active: true,
      scenario: scenario === 'city-dense' ? 'city-dense' : { $ne: 'city-dense' }
    };
    const edges = await RoadEdge.find(filter).sort({ edgeId: 1 });
    const graph = getGraph(scenario);
    const result = edges.map((e) => ({
      ...e.toObject(),
      effectiveCost: graph.getEffectiveWeight(e)
    }));
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateEdge(req, res, next) {
  try {
    const { id } = req.params;
    const { condition, multiplier } = req.body;
    const actorId = req.user ? req.user.userId : 'DISPATCHER';

    const result = await handleRoadConditionUpdate(id, condition, multiplier, actorId);

    res.json({
      success: true,
      edge: result.edge,
      graphVersion: result.graphVersion,
      affectedDispatchesCount: result.reroutedDispatches.length,
      affectedDispatches: result.reroutedDispatches
    });
  } catch (err) {
    next(err);
  }
}

export default { listNodes, listEdges, updateEdge };
