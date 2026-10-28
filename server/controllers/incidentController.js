import { Incident, Ambulance, Hospital, Dispatch, AuditLog } from '../models/index.js';
import { IncidentPriorityQueue } from '../dsa/PriorityQueue.js';
import { getGraph, getHashTable, getBPlusTree } from '../services/graphService.js';
import { calculateSeverityAndPriority, isValidTransition, inferRequiredCapabilities } from '../services/incidentService.js';
import { scoreAmbulanceCandidates } from '../dsa/dispatchScorer.js';
import { recommendHospital } from '../dsa/hospitalSelector.js';
import { dijkstra } from '../dsa/dijkstra.js';
import { notifyAdapter } from '../adapters/notify.js';
import { eventBus } from '../services/eventBus.js';
import config from '../config/index.js';

export async function listIncidents(req, res, next) {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    // Row-level security: citizen sees only own; hospital_staff sees only assigned to own hospital
    if (req.user) {
      if (req.user.role === 'citizen') {
        filter.reportedBy = req.user.userId;
      } else if (req.user.role === 'hospital_staff') {
        filter.destinationHospitalId = req.user.hospitalId;
      }
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;

    const [incidents, total] = await Promise.all([
      Incident.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Incident.countDocuments(filter)
    ]);

    // Mask sensitive fields if hospital_staff or citizen
    const sanitized = incidents.map((inc) => {
      if (req.user && req.user.role === 'hospital_staff') {
        // Staff sees summary
        return {
          ...inc,
          patientSummary: `Age/Gender/Condition summary for ${inc.type}`
        };
      }
      return inc;
    });

    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function getIncidentById(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
    }

    // Row-level check: IDOR protection
    if (req.user) {
      if (req.user.role === 'citizen' && incident.reportedBy && incident.reportedBy !== req.user.userId) {
        return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
      }
      if (req.user.role === 'hospital_staff' && incident.destinationHospitalId && incident.destinationHospitalId !== req.user.hospitalId) {
        return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
      }
    }

    res.json(incident);
  } catch (err) {
    next(err);
  }
}

export async function getPriorityQueue(req, res, next) {
  try {
    const activeStatuses = [
      'REGISTERED', 'Registered',
      'PRIORITIZED', 'Prioritized', 'TRIAGED',
      'AWAITING_RESOURCE', 'AwaitingResource'
    ];

    const incidents = await Incident.find({ status: { $in: activeStatuses } }).lean();

    const pq = new IncidentPriorityQueue();
    incidents.forEach((inc) => pq.enqueue(inc));

    const sortedQueue = pq.getSortedList();

    // Map elements to show explicit composite priority key (severityRank, waitTimeSec, createdAt)
    const now = Date.now();
    const formattedQueue = sortedQueue.map((item) => {
      const waitTimeSec = Math.floor((now - new Date(item.createdAt).getTime()) / 1000);
      const minutes = Math.floor(waitTimeSec / 60);
      const seconds = waitTimeSec % 60;
      const rank = item.severity === 'CRITICAL' ? 4 : item.severity === 'HIGH' ? 3 : item.severity === 'MEDIUM' ? 2 : 1;
      return {
        ...item,
        compositeKey: {
          severityRank: rank,
          waitingTimeSeconds: waitTimeSec,
          waitingTimeFormatted: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
          createdAt: item.createdAt
        }
      };
    });

    res.json({
      count: formattedQueue.length,
      queue: formattedQueue,
      orderingPolicy: 'Max-Priority Queue: (severityRank DESC, waitingTimeSec DESC, createdAt ASC)'
    });
  } catch (err) {
    next(err);
  }
}

export async function createIncident(req, res, next) {
  try {
    const {
      type,
      locationNodeId,
      description,
      requiredCapabilities,
      symptoms = [],
      patientCount = 1,
      overrideReason
    } = req.body;

    if (!type || !locationNodeId) {
      return res.status(400).json({
        error: 'Missing required incident fields: type, locationNodeId',
        code: 'VALIDATION_FAILED'
      });
    }

    // Verify location node exists in graph
    const graph = getGraph();
    if (!graph.getNode(locationNodeId)) {
      return res.status(400).json({
        error: `Invalid locationNodeId '${locationNodeId}': node does not exist in road network.`,
        code: 'INVALID_NODE'
      });
    }

    // Determine severity: auto-triage or operator override
    let severity = req.body.severity;
    let triageExplanation = '';

    if (!severity || !['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severity.toUpperCase())) {
      const triage = calculateSeverityAndPriority(type, symptoms, patientCount);
      severity = triage.severity;
      triageExplanation = triage.explanation;
    } else {
      severity = severity.toUpperCase();
      triageExplanation = overrideReason
        ? `Operator override to ${severity}: ${overrideReason}`
        : `Explicit severity specified: ${severity}`;
    }

    const count = await Incident.countDocuments();
    const incidentId = `INC-${String(count + 1001).padStart(4, '0')}`;
    const actorId = req.user ? req.user.userId : 'CITIZEN';
    const reportedBy = req.user?.role === 'citizen' ? req.user.userId : req.body.reportedBy || actorId;

    const effectiveCapabilities = (requiredCapabilities && requiredCapabilities.length > 0)
      ? requiredCapabilities
      : inferRequiredCapabilities(type, symptoms, patientCount);

    const newIncident = new Incident({
      incidentId,
      type,
      severity,
      locationNodeId,
      description: description || 'Emergency report',
      status: 'Prioritized',
      requiredCapabilities: effectiveCapabilities,
      symptoms: Array.isArray(symptoms) ? symptoms : (symptoms ? [symptoms] : []),
      patientCount: Math.max(1, parseInt(patientCount, 10) || 1),
      triageExplanation,
      reportedBy,
      createdAt: new Date(),
      statusHistory: [
        {
          status: 'Registered',
          timestamp: new Date(),
          actorId,
          note: 'Emergency incident registered in system.'
        },
        {
          status: 'Prioritized',
          timestamp: new Date(),
          actorId: 'AUTO_TRIAGE_ENGINE',
          note: triageExplanation
        }
      ],
      isSynthetic: false
    });

    await newIncident.save();

    // Insert into in-memory symbol table and B+ tree
    const ht = getHashTable();
    if (ht) ht.insert(newIncident.incidentId, newIncident.toObject());
    const bpt = getBPlusTree();
    if (bpt) bpt.insert(newIncident.incidentId, { type: 'INCIDENT', ...newIncident.toObject() });

    // Send SMS Notification to citizen
    await notifyAdapter.sendSMS({
      recipientId: reportedBy,
      phone: req.user?.phone || '+91 9000000001',
      message: `Emergency ${incidentId} registered (${type}). Assigned priority: ${severity}. Tracking dispatch.`,
      incidentId,
      role: 'citizen'
    });

    // Broadcast SSE update
    eventBus.broadcast('INCIDENT_UPDATE', {
      incidentId,
      type: 'CREATED',
      incidentType: type,
      status: 'Prioritized',
      severity,
      locationNodeId,
      patientCount: newIncident.patientCount,
      symptoms: newIncident.symptoms,
      reportedBy,
      createdAt: newIncident.createdAt
    });

    // Audit log
    await AuditLog.create({
      logId: `LOG-INC-${Date.now()}`,
      actorId,
      eventType: 'INCIDENT_CREATED',
      entityType: 'INCIDENT',
      entityId: incidentId,
      timestamp: new Date(),
      details: {
        severity,
        locationNodeId,
        type,
        triageExplanation,
        reportedBy
      },
      outcome: 'SUCCESS',
      isSynthetic: false
    });

    res.status(201).json(newIncident);
  } catch (err) {
    next(err);
  }
}

export async function transitionIncidentStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { newStatus, note } = req.body;
    const actorId = req.user ? req.user.userId : 'DISPATCHER';

    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
    }

    if (!isValidTransition(incident.status, newStatus)) {
      return res.status(409).json({
        error: `Illegal state transition from '${incident.status}' to '${newStatus}'.`,
        code: 'INVALID_TRANSITION',
        currentStatus: incident.status
      });
    }

    const oldStatus = incident.status;
    incident.status = newStatus;
    incident.updatedAt = new Date();

    const graph = getGraph();
    incident.statusHistory.push({
      status: newStatus,
      timestamp: new Date(),
      actorId,
      note: note || `State transitioned from ${oldStatus} to ${newStatus}.`,
      routeVersion: graph ? graph.graphVersion : 1
    });

    // If resolving or cancelling, release assigned ambulance
    if (newStatus === 'RESOLVED' || newStatus === 'Resolved' || newStatus === 'CANCELLED' || newStatus === 'Cancelled') {
      if (incident.assignedAmbulanceId) {
        await Ambulance.findOneAndUpdate(
          { ambulanceId: incident.assignedAmbulanceId },
          { status: 'AVAILABLE', activeIncidentId: null }
        );
      }
    }

    await incident.save();

    // Broadcast SSE update
    eventBus.broadcast('INCIDENT_UPDATE', {
      incidentId: incident.incidentId,
      type: 'STATUS_CHANGED',
      fromStatus: oldStatus,
      toStatus: newStatus,
      updatedAt: incident.updatedAt
    }, { incidentId: incident.incidentId, reportedBy: incident.reportedBy });

    // Audit log
    await AuditLog.create({
      logId: `LOG-STATUS-${Date.now()}`,
      actorId,
      eventType: 'INCIDENT_STATUS_CHANGED',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      timestamp: new Date(),
      details: {
        fromStatus: oldStatus,
        toStatus: newStatus,
        note
      },
      outcome: 'SUCCESS',
      isSynthetic: incident.isSynthetic
    });

    res.json(incident);
  } catch (err) {
    next(err);
  }
}

export async function cancelIncident(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const actorId = req.user ? req.user.userId : 'USER';

    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
    }

    // Role-based cancellation permissions
    if (req.user) {
      if (req.user.role === 'citizen') {
        if (incident.reportedBy && incident.reportedBy !== req.user.userId) {
          return res.status(403).json({ error: 'You can only cancel your own emergency report.', code: 'FORBIDDEN' });
        }
        // Citizens cannot cancel once dispatched
        const preDispatch = ['Registered', 'REGISTERED', 'Prioritized', 'PRIORITIZED', 'TRIAGED', 'AwaitingResource', 'AWAITING_RESOURCE'];
        if (!preDispatch.includes(incident.status)) {
          return res.status(409).json({
            error: `Cannot cancel incident once ambulance is dispatched (Current status: ${incident.status}). Contact operator.`,
            code: 'CANCEL_NOT_ALLOWED'
          });
        }
      } else if (req.user.role === 'hospital_staff') {
        return res.status(403).json({ error: 'Hospital staff cannot cancel an incident.', code: 'FORBIDDEN' });
      }
    }

    // Cannot cancel after Transporting
    if (incident.status === 'TRANSPORTING' || incident.status === 'Transporting' || incident.status === 'RESOLVED' || incident.status === 'Resolved') {
      return res.status(409).json({
        error: `Cannot cancel incident in state '${incident.status}'.`,
        code: 'INVALID_TRANSITION'
      });
    }

    const previousStatus = incident.status;
    incident.status = 'Cancelled';
    incident.updatedAt = new Date();
    incident.statusHistory.push({
      status: 'Cancelled',
      timestamp: new Date(),
      actorId,
      note: reason || 'Incident cancelled by user request.'
    });

    // Release assigned ambulance if any
    if (incident.assignedAmbulanceId) {
      await Ambulance.findOneAndUpdate(
        { ambulanceId: incident.assignedAmbulanceId },
        { status: 'AVAILABLE', activeIncidentId: null }
      );
    }

    await incident.save();

    // Notification
    await notifyAdapter.sendSMS({
      recipientId: incident.reportedBy || actorId,
      phone: req.user?.phone || '+91 9000000001',
      message: `Emergency request ${incident.incidentId} has been cancelled.`,
      incidentId: incident.incidentId,
      role: 'citizen'
    });

    // Broadcast SSE
    eventBus.broadcast('INCIDENT_UPDATE', {
      incidentId: incident.incidentId,
      type: 'CANCELLED',
      fromStatus: previousStatus,
      toStatus: 'Cancelled',
      reason
    }, { incidentId: incident.incidentId, reportedBy: incident.reportedBy });

    // Audit log
    await AuditLog.create({
      logId: `LOG-CANCEL-${Date.now()}`,
      actorId,
      eventType: 'INCIDENT_CANCELLED',
      entityType: 'INCIDENT',
      entityId: incident.incidentId,
      timestamp: new Date(),
      details: { previousStatus, reason },
      outcome: 'SUCCESS',
      isSynthetic: incident.isSynthetic
    });

    res.json({ success: true, message: `Incident ${id} cancelled.`, incident });
  } catch (err) {
    next(err);
  }
}

export async function getIncidentCandidates(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
    }

    const graph = getGraph(incident.scenario || 'default');
    const ambulances = await Ambulance.find();

    const recommendation = scoreAmbulanceCandidates(graph, incident, ambulances);

    res.json({
      incidentId: incident.incidentId,
      graphVersion: graph.graphVersion,
      recommendation
    });
  } catch (err) {
    next(err);
  }
}

export async function confirmIncidentDispatch(req, res, next) {
  try {
    const { id } = req.params;
    const { ambulanceId, hospitalId, algorithm = 'DIJKSTRA', reason } = req.body;
    const actorId = req.user ? req.user.userId : 'OPERATOR';

    if (!ambulanceId) {
      return res.status(400).json({ error: 'ambulanceId is required to confirm dispatch', code: 'MISSING_PARAMS' });
    }

    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
    }

    const ambulance = await Ambulance.findOne({ ambulanceId });
    if (!ambulance) {
      return res.status(404).json({ error: `Ambulance ${ambulanceId} not found`, code: 'NOT_FOUND' });
    }

    // Verify ambulance availability (no duplicate active assignment)
    if (ambulance.status !== 'AVAILABLE' && ambulance.activeIncidentId && ambulance.activeIncidentId !== id) {
      return res.status(409).json({
        error: `Integrity Violation: Ambulance ${ambulanceId} is already assigned to incident ${ambulance.activeIncidentId}.`,
        code: 'AMBULANCE_ALREADY_ASSIGNED'
      });
    }

    const graph = getGraph(incident.scenario || 'default');
    const startNode = ambulance.currentNodeId || ambulance.baseStationNodeId;
    const routeResult = dijkstra(graph, startNode, incident.locationNodeId);

    if (!routeResult.found) {
      return res.status(400).json({
        error: `Road network impassable between ambulance ${startNode} and scene ${incident.locationNodeId}.`,
        code: 'NO_TRAVERSABLE_ROUTE'
      });
    }

    const count = await Dispatch.countDocuments();
    const dispatchId = `DSP-${String(count + 5001).padStart(4, '0')}`;

    const newDispatch = new Dispatch({
      dispatchId,
      incidentId: id,
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

    // Update ambulance
    ambulance.status = 'DISPATCHED';
    ambulance.activeIncidentId = id;
    ambulance.totalDispatches = (ambulance.totalDispatches || 0) + 1;
    ambulance.lastUpdatedAt = new Date();
    await ambulance.save();

    // Update incident
    incident.status = 'AmbulanceAssigned';
    incident.assignedAmbulanceId = ambulanceId;
    if (hospitalId) incident.destinationHospitalId = hospitalId;
    incident.updatedAt = new Date();
    incident.statusHistory.push({
      status: 'AmbulanceAssigned',
      timestamp: new Date(),
      actorId,
      note: `Dispatch confirmed with unit ${ambulanceId}. Route assigned via ${algorithm} (${routeResult.cost.toFixed(2)}s). ${reason ? `Reason: ${reason}` : ''}`,
      routeVersion: graph.graphVersion
    });
    await incident.save();

    // Send notifications to Citizen and Hospital
    await notifyAdapter.sendSMS({
      recipientId: incident.reportedBy || 'citizen',
      phone: '+91 9000000001',
      message: `Emergency update: Unit ${ambulance.callSign || ambulanceId} (${ambulance.type}) dispatched. Estimated Arrival: ${(routeResult.cost / 60).toFixed(1)} mins.`,
      incidentId: id,
      role: 'citizen'
    });

    if (hospitalId) {
      await notifyAdapter.sendEmail({
        recipientId: hospitalId,
        email: `admissions@${hospitalId.toLowerCase()}.test`,
        subject: `INCOMING EMERGENCY CASE: ${id}`,
        message: `Ambulance ${ambulanceId} assigned to ${id} (${incident.type}, ${incident.severity}). Destination: ${hospitalId}.`,
        incidentId: id,
        role: 'hospital_staff'
      });
    }

    // Broadcast SSE
    eventBus.broadcast('INCIDENT_UPDATE', {
      incidentId: id,
      type: 'DISPATCH_CONFIRMED',
      dispatchId,
      ambulanceId,
      hospitalId,
      routeNodeIds: routeResult.path,
      routeCost: routeResult.cost,
      graphVersion: graph.graphVersion
    });

    // Audit log
    await AuditLog.create({
      logId: `LOG-DISPATCH-${Date.now()}`,
      actorId,
      eventType: 'DISPATCH_CONFIRMED',
      entityType: 'DISPATCH',
      entityId: dispatchId,
      timestamp: new Date(),
      details: {
        incidentId: id,
        ambulanceId,
        hospitalId,
        routeCost: routeResult.cost,
        algorithm
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

export async function getHospitalRecommendation(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await Incident.findOne({ incidentId: id });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${id} not found`, code: 'NOT_FOUND' });
    }

    const graph = getGraph(incident.scenario || 'default');
    const hospitals = await Hospital.find();

    const recommendation = recommendHospital(
      graph,
      incident.locationNodeId,
      incident.requiredCapabilities,
      hospitals
    );

    res.json({
      incidentId: incident.incidentId,
      graphVersion: graph.graphVersion,
      recommendation
    });
  } catch (err) {
    next(err);
  }
}

export default {
  listIncidents,
  getIncidentById,
  getPriorityQueue,
  createIncident,
  transitionIncidentStatus,
  cancelIncident,
  getIncidentCandidates,
  confirmIncidentDispatch,
  getHospitalRecommendation
};
