import { Incident, Ambulance, AuditLog } from '../models/index.js';
import { IncidentPriorityQueue } from '../dsa/PriorityQueue.js';
import { getGraph, getHashTable } from '../services/graphService.js';
import config from '../config/index.js';

export async function listIncidents(req, res, next) {
  try {
    const { status, severity } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const incidents = await Incident.find(filter).sort({ createdAt: -1 });
    res.json(incidents);
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
    res.json(incident);
  } catch (err) {
    next(err);
  }
}

export async function getPriorityQueue(req, res, next) {
  try {
    // Only fetch pending/active incidents
    const activeStatuses = [
      config.incidentStates.REGISTERED,
      config.incidentStates.TRIAGED,
      config.incidentStates.AWAITING_RESOURCE
    ];

    const incidents = await Incident.find({ status: { $in: activeStatuses } }).lean();

    const pq = new IncidentPriorityQueue();
    incidents.forEach((inc) => pq.enqueue(inc));

    const sortedQueue = pq.getSortedList();

    res.json({
      count: sortedQueue.length,
      queue: sortedQueue,
      orderingPolicy: 'Severity (Critical > High > Medium > Low) with deterministic earliest-created tie-breaker'
    });
  } catch (err) {
    next(err);
  }
}

export async function createIncident(req, res, next) {
  try {
    const {
      type,
      severity,
      locationNodeId,
      description,
      requiredCapabilities
    } = req.body;

    if (!type || !severity || !locationNodeId) {
      return res.status(400).json({
        error: 'Missing required incident fields: type, severity, locationNodeId',
        code: 'VALIDATION_FAILED'
      });
    }

    const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        error: `Invalid severity '${severity}'. Allowed: ${validSeverities.join(', ')}`,
        code: 'INVALID_SEVERITY'
      });
    }

    // Verify node exists in graph
    const graph = getGraph();
    if (!graph.getNode(locationNodeId)) {
      return res.status(400).json({
        error: `Invalid locationNodeId '${locationNodeId}': node does not exist in graph network.`,
        code: 'INVALID_NODE'
      });
    }

    const count = await Incident.countDocuments();
    const incidentId = `INC-${String(count + 1001).padStart(4, '0')}`;
    const actorId = req.user ? req.user.userId : 'DISPATCHER';

    const newIncident = new Incident({
      incidentId,
      type,
      severity,
      locationNodeId,
      description: description || 'Simulated emergency report',
      status: config.incidentStates.REGISTERED,
      requiredCapabilities: requiredCapabilities || [],
      createdAt: new Date(),
      statusHistory: [
        {
          status: config.incidentStates.REGISTERED,
          timestamp: new Date(),
          actorId,
          note: 'Emergency incident registered and queued for triage.'
        }
      ],
      isSynthetic: false
    });

    await newIncident.save();

    // Insert into in-memory symbol table
    const ht = getHashTable();
    if (ht) ht.insert(newIncident.incidentId, newIncident.toObject());

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
        type
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

    const allowedNext = config.incidentTransitions[incident.status] || [];
    if (!allowedNext.includes(newStatus)) {
      return res.status(400).json({
        error: `Illegal state transition from '${incident.status}' to '${newStatus}'.`,
        code: 'INVALID_TRANSITION',
        currentStatus: incident.status,
        allowedTransitions: allowedNext
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
    if (newStatus === config.incidentStates.RESOLVED || newStatus === config.incidentStates.CANCELLED) {
      if (incident.assignedAmbulanceId) {
        await Ambulance.findOneAndUpdate(
          { ambulanceId: incident.assignedAmbulanceId },
          { status: 'AVAILABLE', activeIncidentId: null }
        );
      }
    }

    await incident.save();

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

export default {
  listIncidents,
  getIncidentById,
  getPriorityQueue,
  createIncident,
  transitionIncidentStatus
};
