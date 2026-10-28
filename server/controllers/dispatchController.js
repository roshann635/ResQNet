import { Incident, Ambulance, Hospital, Dispatch, AuditLog } from '../models/index.js';
import { getGraph } from '../services/graphService.js';
import { scoreAmbulanceCandidates } from '../dsa/dispatchScorer.js';
import { recommendHospital } from '../dsa/hospitalSelector.js';
import { dijkstra } from '../dsa/dijkstra.js';
import config from '../config/index.js';

export async function getDispatchRecommendation(req, res, next) {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${incidentId} not found`, code: 'NOT_FOUND' });
    }

    const scenario = incident.scenario || 'default';
    const graph = getGraph(scenario);
    const scenarioFilter = scenario === 'city-dense' ? { scenario: 'city-dense' } : { scenario: { $ne: 'city-dense' } };
    const ambulances = await Ambulance.find(scenarioFilter);
    const hospitals = await Hospital.find(scenarioFilter);

    // 1. Ambulance scoring and candidate filtering
    const ambulanceRecommendation = scoreAmbulanceCandidates(graph, incident, ambulances);

    // 2. Hospital recommendation
    const hospitalRecommendation = recommendHospital(
      graph,
      incident.locationNodeId,
      incident.requiredCapabilities,
      hospitals
    );

    res.json({
      incident: {
        incidentId: incident.incidentId,
        type: incident.type,
        severity: incident.severity,
        locationNodeId: incident.locationNodeId,
        description: incident.description,
        status: incident.status,
        requiredCapabilities: incident.requiredCapabilities
      },
      graphVersion: graph.graphVersion,
      ambulanceSelection: ambulanceRecommendation,
      hospitalSelection: hospitalRecommendation,
      isActionable:
        ambulanceRecommendation.bestCandidate !== null && hospitalRecommendation.bestHospital !== null
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmDispatch(req, res, next) {
  try {
    const { incidentId, ambulanceId, hospitalId, algorithm = 'DIJKSTRA' } = req.body;
    const actorId = req.user ? req.user.userId : 'DISPATCHER';

    if (!incidentId || !ambulanceId) {
      return res.status(400).json({
        error: 'Missing required dispatch parameters: incidentId and ambulanceId',
        code: 'MISSING_PARAMS'
      });
    }

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${incidentId} not found`, code: 'NOT_FOUND' });
    }

    const ambulance = await Ambulance.findOne({ ambulanceId });
    if (!ambulance) {
      return res.status(404).json({ error: `Ambulance ${ambulanceId} not found`, code: 'NOT_FOUND' });
    }

    // Integrity rule: An ambulance cannot have two active assignments
    if (ambulance.status !== 'AVAILABLE' && ambulance.activeIncidentId && ambulance.activeIncidentId !== incidentId) {
      return res.status(409).json({
        error: `Integrity Violation: Ambulance ${ambulanceId} already has an active assignment on incident ${ambulance.activeIncidentId}.`,
        code: 'AMBULANCE_ALREADY_ASSIGNED'
      });
    }

    const scenario = incident.scenario || ambulance.scenario || 'default';
    const graph = getGraph(scenario);
    // Compute primary response route from ambulance location to incident
    const routeResult = dijkstra(graph, ambulance.currentNodeId, incident.locationNodeId);
    if (!routeResult.found) {
      return res.status(400).json({
        error: `Cannot dispatch: Road from ${ambulance.currentNodeId} to ${incident.locationNodeId} is impassable.`,
        code: 'NO_TRAVERSABLE_ROUTE'
      });
    }

    // Generate Dispatch ID
    const count = await Dispatch.countDocuments();
    const dispatchId = `DSP-${String(count + 5001).padStart(4, '0')}`;

    const newDispatch = new Dispatch({
      dispatchId,
      incidentId,
      ambulanceId,
      hospitalId: hospitalId || null,
      routeNodeIds: routeResult.path,
      routeCost: routeResult.cost,
      algorithm,
      graphVersion: graph.graphVersion,
      status: 'ACTIVE',
      createdAt: new Date(),
      isSynthetic: false
    });
    await newDispatch.save();

    // Update Ambulance status
    ambulance.status = 'DISPATCHED';
    ambulance.activeIncidentId = incidentId;
    ambulance.totalDispatches = (ambulance.totalDispatches || 0) + 1;
    ambulance.lastUpdatedAt = new Date();
    await ambulance.save();

    // Transition Incident status to AMBULANCE_ASSIGNED
    incident.status = config.incidentStates.AMBULANCE_ASSIGNED;
    incident.assignedAmbulanceId = ambulanceId;
    if (hospitalId) incident.destinationHospitalId = hospitalId;
    incident.updatedAt = new Date();
    incident.statusHistory.push({
      status: config.incidentStates.AMBULANCE_ASSIGNED,
      timestamp: new Date(),
      actorId,
      note: `Dispatch confirmed with unit ${ambulanceId}. Route assigned via ${algorithm} (${routeResult.cost.toFixed(2)} km).`,
      routeVersion: graph.graphVersion
    });
    await incident.save();

    // Audit log
    await AuditLog.create({
      logId: `LOG-DISPATCH-${Date.now()}`,
      actorId,
      eventType: 'DISPATCH_CONFIRMED',
      entityType: 'DISPATCH',
      entityId: dispatchId,
      timestamp: new Date(),
      details: {
        incidentId,
        ambulanceId,
        hospitalId,
        routeCost: routeResult.cost,
        graphVersion: graph.graphVersion
      },
      outcome: 'SUCCESS',
      isSynthetic: false
    });

    res.status(201).json({
      success: true,
      dispatch: newDispatch,
      incident,
      ambulance
    });
  } catch (err) {
    next(err);
  }
}

export default { getDispatchRecommendation, confirmDispatch };
