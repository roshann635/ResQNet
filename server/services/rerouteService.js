import { Dispatch, Ambulance, Incident, RoadEdge } from '../models/index.js';
import { getGraph, updateRoadCondition } from './graphService.js';
import { dijkstra } from '../dsa/dijkstra.js';
import { eventBus } from './eventBus.js';
import { notifyAdapter } from '../adapters/notify.js';

/**
 * Reroute Service
 * Detects active dispatches whose routes cross blocked or heavily congested edges,
 * marks old routes as stale, automatically recomputes optimal routes from each ambulance's
 * current node, updates states, and broadcasts live REROUTE_EVENTs over SSE.
 */
export async function handleRoadConditionUpdate(edgeId, condition, multiplier = null, actorId = 'OPERATOR') {
  // 1. Update condition and bump graph version
  const updateResult = await updateRoadCondition(edgeId, condition, multiplier, actorId);
  const { edge, graphVersion } = updateResult;

  const graph = getGraph(edge.scenario || 'default');

  // 2. Query all active dispatches
  const activeDispatches = await Dispatch.find({ status: 'ACTIVE' });
  const rerouted = [];

  for (const dispatch of activeDispatches) {
    const routeNodes = dispatch.routeNodeIds || [];
    // Check if route traverses this edge (fromNode -> toNode or toNode -> fromNode if undirected)
    let crossesEdge = false;
    for (let i = 0; i < routeNodes.length - 1; i++) {
      if (
        (routeNodes[i] === edge.fromNodeId && routeNodes[i + 1] === edge.toNodeId) ||
        (routeNodes[i] === edge.toNodeId && routeNodes[i + 1] === edge.fromNodeId)
      ) {
        crossesEdge = true;
        break;
      }
    }

    if (crossesEdge) {
      const ambulance = await Ambulance.findOne({ ambulanceId: dispatch.ambulanceId });
      const incident = await Incident.findOne({ incidentId: dispatch.incidentId });

      if (ambulance && incident) {
        const startNode = ambulance.currentNodeId || routeNodes[0];
        const targetNode = incident.status === 'TRANSPORTING' && incident.destinationHospitalId
          ? incident.destinationHospitalId
          : incident.locationNodeId;

        // Recompute route on new graph state
        const newRoute = dijkstra(graph, startNode, targetNode);

        const oldPath = [...dispatch.routeNodeIds];
        dispatch.isStale = true;
        dispatch.previousRouteNodeIds = oldPath;

        if (newRoute.found) {
          dispatch.routeNodeIds = newRoute.path;
          dispatch.routeCost = newRoute.cost;
          dispatch.graphVersion = graphVersion;
          dispatch.isStale = false;
          dispatch.rerouteCount = (dispatch.rerouteCount || 0) + 1;
          await dispatch.save();

          // Update incident status history
          incident.status = 'RE_ROUTING';
          incident.statusHistory.push({
            status: 'RE_ROUTING',
            timestamp: new Date(),
            actorId,
            note: `Live re-routing triggered by condition '${condition}' on edge ${edgeId}. New cost: ${newRoute.cost.toFixed(2)}s.`,
            routeVersion: graphVersion
          });
          await incident.save();

          rerouted.push({
            dispatchId: dispatch.dispatchId,
            ambulanceId: ambulance.ambulanceId,
            incidentId: incident.incidentId,
            oldPath,
            newPath: newRoute.path,
            newCost: newRoute.cost,
            reason: `Edge ${edgeId} became ${condition}`
          });

          // Notify citizen & hospital
          await notifyAdapter.sendSMS({
            recipientId: incident.reportedBy || 'citizen',
            phone: '+91 9000000001',
            message: `Notice: Emergency unit ${ambulance.callSign || ambulance.ambulanceId} rerouted due to road condition. Updated ETA computed.`,
            incidentId: incident.incidentId,
            role: 'citizen'
          });
        }
      }
    }
  }

  // 3. Broadcast to all clients over SSE
  eventBus.broadcast('ROAD_CHANGED', {
    edgeId,
    condition: edge.condition,
    multiplier: edge.multiplier,
    graphVersion,
    reroutedCount: rerouted.length,
    timestamp: new Date()
  });

  for (const r of rerouted) {
    eventBus.broadcast('REROUTE_EVENT', r, { incidentId: r.incidentId });
  }

  return {
    edge,
    graphVersion,
    reroutedDispatches: rerouted
  };
}

export default { handleRoadConditionUpdate };
