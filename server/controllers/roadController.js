import { RoadNode, RoadEdge, Dispatch, Incident } from '../models/index.js';
import { getGraph, updateRoadCondition } from '../services/graphService.js';
import { validateRoute } from '../dsa/routeValidator.js';
import config from '../config/index.js';

export async function listNodes(req, res, next) {
  try {
    const nodes = await RoadNode.find({ active: true }).sort({ nodeId: 1 });
    res.json(nodes);
  } catch (err) {
    next(err);
  }
}

export async function listEdges(req, res, next) {
  try {
    const edges = await RoadEdge.find({ active: true }).sort({ edgeId: 1 });
    const graph = getGraph();
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

    const updateResult = await updateRoadCondition(id, condition, multiplier, actorId);
    const graph = getGraph();

    // Check if any active dispatches are affected (trigger re-routing state if edge blocked)
    const activeDispatches = await Dispatch.find({ status: 'ACTIVE' });
    const affectedDispatches = [];

    for (const dsp of activeDispatches) {
      const validation = validateRoute(graph, dsp.routeNodeIds, dsp.graphVersion);
      if (!validation.isValid || validation.isStale) {
        affectedDispatches.push({
          dispatchId: dsp.dispatchId,
          incidentId: dsp.incidentId,
          reason: validation.reason
        });

        // If road is blocked and route is now impassable, transition incident to RE_ROUTING
        if (!validation.isValid) {
          dsp.status = 'REROUTED';
          await dsp.save();

          await Incident.findOneAndUpdate(
            { incidentId: dsp.incidentId },
            {
              status: config.incidentStates.RE_ROUTING,
              $push: {
                statusHistory: {
                  status: config.incidentStates.RE_ROUTING,
                  timestamp: new Date(),
                  actorId: 'SYSTEM_MONITOR',
                  note: `Road condition change on ${id} (${condition}) severed active route. Transitioned to RE_ROUTING.`,
                  routeVersion: graph.graphVersion
                }
              }
            }
          );
        }
      }
    }

    res.json({
      success: true,
      edge: updateResult.edge,
      graphVersion: updateResult.graphVersion,
      affectedDispatchesCount: affectedDispatches.length,
      affectedDispatches
    });
  } catch (err) {
    next(err);
  }
}

export default { listNodes, listEdges, updateEdge };
