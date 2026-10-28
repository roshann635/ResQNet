import { Ambulance, Hospital, Incident, Dispatch, AuditLog } from '../models/index.js';
import { getGraph } from '../services/graphService.js';
import { dijkstra } from '../dsa/dijkstra.js';
import { eventBus } from '../services/eventBus.js';
import { notifyAdapter } from '../adapters/notify.js';

export async function listAmbulances(req, res, next) {
  try {
    const ambulances = await Ambulance.find().sort({ ambulanceId: 1 }).lean();

    // Scoping & masking: citizens cannot see crew phone numbers or private data
    const sanitized = ambulances.map((amb) => {
      if (req.user && req.user.role === 'citizen') {
        return {
          ambulanceId: amb.ambulanceId,
          type: amb.type,
          status: amb.status,
          currentNodeId: amb.currentNodeId
        };
      }
      return amb;
    });

    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function getAmbulanceById(req, res, next) {
  try {
    const { id } = req.params;
    const ambulance = await Ambulance.findOne({ ambulanceId: id }).lean();
    if (!ambulance) {
      return res.status(404).json({ error: `Ambulance ${id} not found`, code: 'NOT_FOUND' });
    }

    if (req.user && req.user.role === 'citizen') {
      return res.json({
        ambulanceId: ambulance.ambulanceId,
        type: ambulance.type,
        status: ambulance.status,
        currentNodeId: ambulance.currentNodeId
      });
    }

    res.json(ambulance);
  } catch (err) {
    next(err);
  }
}

export async function updateAmbulanceStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, currentNodeId } = req.body;
    const actorId = req.user ? req.user.userId : 'OPERATOR';

    const ambulance = await Ambulance.findOne({ ambulanceId: id });
    if (!ambulance) {
      return res.status(404).json({ error: `Ambulance ${id} not found`, code: 'NOT_FOUND' });
    }

    const oldStatus = ambulance.status;
    if (status) ambulance.status = status;
    if (currentNodeId) ambulance.currentNodeId = currentNodeId;
    ambulance.lastUpdatedAt = new Date();
    await ambulance.save();

    // Broadcast SSE
    eventBus.broadcast('AMBULANCE_MOVED', {
      ambulanceId: id,
      status: ambulance.status,
      currentNodeId: ambulance.currentNodeId,
      activeIncidentId: ambulance.activeIncidentId
    });

    await AuditLog.create({
      logId: `LOG-AMB-${Date.now()}`,
      actorId,
      eventType: 'AMBULANCE_STATUS_UPDATED',
      entityType: 'AMBULANCE',
      entityId: id,
      timestamp: new Date(),
      details: { fromStatus: oldStatus, toStatus: ambulance.status, currentNodeId },
      outcome: 'SUCCESS',
      isSynthetic: ambulance.isSynthetic
    });

    res.json(ambulance);
  } catch (err) {
    next(err);
  }
}

export async function listHospitals(req, res, next) {
  try {
    const hospitals = await Hospital.find().sort({ hospitalId: 1 }).lean();

    // Field-level masking for citizens or other hospital staff
    const sanitized = hospitals.map((hosp) => {
      const isOwnHospital = req.user && req.user.role === 'hospital_staff' && req.user.hospitalId === hosp.hospitalId;
      const isPrivileged = req.user && (req.user.role === 'operator' || req.user.role === 'admin' || req.user.role === 'evaluator');

      if (!isOwnHospital && !isPrivileged) {
        // Mask exact bed counts to bands: 'Available', 'Limited', 'Full'
        const total = hosp.totalBeds || hosp.capacity || 100;
        const avail = hosp.availableBeds !== undefined ? hosp.availableBeds : (hosp.availableSlots || 0);
        const ratio = total > 0 ? avail / total : 0;
        const capacityBand = ratio > 0.3 ? 'Available' : ratio > 0.05 ? 'Limited' : 'Full';

        return {
          hospitalId: hosp.hospitalId,
          name: hosp.name,
          locationNodeId: hosp.locationNodeId,
          tier: hosp.tier,
          capabilities: hosp.capabilities,
          status: hosp.status,
          capacityBand
        };
      }
      return hosp;
    });

    res.json(sanitized);
  } catch (err) {
    next(err);
  }
}

export async function getHospitalById(req, res, next) {
  try {
    const { id } = req.params;
    const hospital = await Hospital.findOne({ hospitalId: id }).lean();
    if (!hospital) {
      return res.status(404).json({ error: `Hospital ${id} not found`, code: 'NOT_FOUND' });
    }
    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function updateHospitalCapacity(req, res, next) {
  try {
    const { id } = req.params;
    const { availableBeds, availableIcu, availableSlots, status } = req.body;
    const actorId = req.user ? req.user.userId : 'HOSPITAL_STAFF';

    // RBAC: Hospital staff can ONLY update their own hospital
    if (req.user && req.user.role === 'hospital_staff' && req.user.hospitalId !== id) {
      return res.status(403).json({
        error: `Forbidden: You are assigned to '${req.user.hospitalId}', cannot update '${id}'.`,
        code: 'FORBIDDEN_HOSPITAL_SCOPE'
      });
    }

    const hospital = await Hospital.findOne({ hospitalId: id });
    if (!hospital) {
      return res.status(404).json({ error: `Hospital ${id} not found`, code: 'NOT_FOUND' });
    }

    // Validation: 0 <= availableBeds <= totalBeds
    const maxBeds = hospital.totalBeds || hospital.capacity || 500;
    if (availableBeds !== undefined) {
      if (availableBeds < 0 || availableBeds > maxBeds) {
        return res.status(400).json({
          error: `availableBeds must be between 0 and total capacity (${maxBeds}).`,
          code: 'INVALID_CAPACITY'
        });
      }
      hospital.availableBeds = availableBeds;
      hospital.availableSlots = availableBeds;
    }

    const maxIcu = hospital.icuBeds || 50;
    if (availableIcu !== undefined) {
      if (availableIcu < 0 || availableIcu > maxIcu) {
        return res.status(400).json({
          error: `availableIcu must be between 0 and total ICU beds (${maxIcu}).`,
          code: 'INVALID_ICU_CAPACITY'
        });
      }
      hospital.availableIcu = availableIcu;
    }

    if (availableSlots !== undefined && availableBeds === undefined) {
      hospital.availableSlots = availableSlots;
      hospital.availableBeds = availableSlots;
    }

    if (status !== undefined) {
      const allowed = ['Open', 'OPEN', 'Diverting', 'DIVERTING', 'Closed', 'CLOSED'];
      if (!allowed.includes(status)) {
        return res.status(400).json({ error: `Invalid status '${status}'. Allowed: Open, Diverting, Closed`, code: 'INVALID_STATUS' });
      }
      hospital.status = status;
    }

    hospital.loadFactor = maxBeds > 0 ? Number(((maxBeds - (hospital.availableBeds || 0)) / maxBeds).toFixed(2)) : 0.5;
    hospital.updatedAt = new Date();
    await hospital.save();

    // Broadcast update
    eventBus.broadcast('HOSPITAL_CAPACITY_UPDATED', {
      hospitalId: id,
      availableBeds: hospital.availableBeds,
      availableIcu: hospital.availableIcu,
      loadFactor: hospital.loadFactor,
      status: hospital.status
    });

    await AuditLog.create({
      logId: `LOG-HOS-${Date.now()}`,
      actorId,
      eventType: 'HOSPITAL_CAPACITY_UPDATED',
      entityType: 'HOSPITAL',
      entityId: id,
      timestamp: new Date(),
      details: {
        availableBeds: hospital.availableBeds,
        availableIcu: hospital.availableIcu,
        status: hospital.status,
        loadFactor: hospital.loadFactor
      },
      outcome: 'SUCCESS',
      isSynthetic: hospital.isSynthetic
    });

    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export async function getIncomingHospitalCases(req, res, next) {
  try {
    const { id } = req.params;

    // RBAC: Hospital staff can only view incoming cases to their hospital
    if (req.user && req.user.role === 'hospital_staff' && req.user.hospitalId !== id) {
      return res.status(403).json({
        error: `Forbidden: Cannot view incoming cases for another hospital (${id}).`,
        code: 'FORBIDDEN_HOSPITAL_SCOPE'
      });
    }

    const hospital = await Hospital.findOne({ hospitalId: id });
    if (!hospital) {
      return res.status(404).json({ error: `Hospital ${id} not found`, code: 'NOT_FOUND' });
    }

    const activeIncidents = await Incident.find({
      destinationHospitalId: id,
      status: { $in: ['AmbulanceAssigned', 'AMBULANCE_ASSIGNED', 'EnRoute', 'VEHICLE_EN_ROUTE', 'Rerouting', 'RE_ROUTING', 'AtScene', 'AT_SCENE', 'Transporting', 'TRANSPORTING'] }
    }).lean();

    const graph = getGraph();
    const casesWithEta = [];

    for (const inc of activeIncidents) {
      let etaMinutes = 8.5; // fallback
      let ambulanceInfo = null;

      if (inc.assignedAmbulanceId) {
        ambulanceInfo = await Ambulance.findOne({ ambulanceId: inc.assignedAmbulanceId }).lean();
        if (ambulanceInfo && graph) {
          const fromNode = ambulanceInfo.currentNodeId || ambulanceInfo.baseStationNodeId;
          const route = dijkstra(graph, fromNode, hospital.locationNodeId);
          if (route.found) {
            etaMinutes = Number((route.cost / 60).toFixed(1));
          }
        }
      }

      casesWithEta.push({
        incidentId: inc.incidentId,
        type: inc.type,
        severity: inc.severity,
        patientCount: inc.patientCount || 1,
        status: inc.status,
        assignedAmbulance: ambulanceInfo ? {
          ambulanceId: ambulanceInfo.ambulanceId,
          callSign: ambulanceInfo.callSign,
          type: ambulanceInfo.type,
          status: ambulanceInfo.status
        } : null,
        etaMinutes,
        accepted: inc.hospitalAccepted || false,
        reportedAt: inc.createdAt
      });
    }

    res.json({
      hospitalId: id,
      hospitalName: hospital.name,
      incomingCount: casesWithEta.length,
      cases: casesWithEta
    });
  } catch (err) {
    next(err);
  }
}

export async function acceptIncomingCase(req, res, next) {
  try {
    const { id, incidentId } = req.params;
    const actorId = req.user ? req.user.userId : 'HOSPITAL_STAFF';

    if (req.user && req.user.role === 'hospital_staff' && req.user.hospitalId !== id) {
      return res.status(403).json({ error: 'Cannot accept cases for another hospital.', code: 'FORBIDDEN' });
    }

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${incidentId} not found`, code: 'NOT_FOUND' });
    }

    incident.hospitalAccepted = true;
    incident.statusHistory.push({
      status: incident.status,
      timestamp: new Date(),
      actorId,
      note: `Hospital ${id} confirmed and accepted incoming emergency transfer.`
    });
    await incident.save();

    eventBus.broadcast('HOSPITAL_CASE_ACCEPTED', {
      hospitalId: id,
      incidentId,
      acceptedAt: new Date()
    });

    await AuditLog.create({
      logId: `LOG-HOSP-ACCEPT-${Date.now()}`,
      actorId,
      eventType: 'HOSPITAL_CASE_ACCEPTED',
      entityType: 'INCIDENT',
      entityId: incidentId,
      timestamp: new Date(),
      details: { hospitalId: id },
      outcome: 'SUCCESS',
      isSynthetic: false
    });

    res.json({ success: true, message: `Incident ${incidentId} accepted by hospital ${id}.`, incident });
  } catch (err) {
    next(err);
  }
}

export async function rejectIncomingCase(req, res, next) {
  try {
    const { id, incidentId } = req.params;
    const { reason } = req.body;
    const actorId = req.user ? req.user.userId : 'HOSPITAL_STAFF';

    if (!reason) {
      return res.status(400).json({ error: 'Rejection requires a documented medical/capacity reason.', code: 'REASON_REQUIRED' });
    }

    if (req.user && req.user.role === 'hospital_staff' && req.user.hospitalId !== id) {
      return res.status(403).json({ error: 'Cannot reject cases for another hospital.', code: 'FORBIDDEN' });
    }

    const incident = await Incident.findOne({ incidentId });
    if (!incident) {
      return res.status(404).json({ error: `Incident ${incidentId} not found`, code: 'NOT_FOUND' });
    }

    // Detach hospital and trigger operator re-recommendation
    incident.destinationHospitalId = null;
    incident.hospitalAccepted = false;
    incident.statusHistory.push({
      status: incident.status,
      timestamp: new Date(),
      actorId,
      note: `Hospital ${id} rejected case: ${reason}. System prompted for re-recommendation.`
    });
    await incident.save();

    // Alert operator via SMS/Notification
    await notifyAdapter.sendSMS({
      recipientId: 'OPERATOR',
      phone: '+91 9000000002',
      message: `ALERT: Hospital ${id} rejected incoming incident ${incidentId}. Reason: ${reason}. Rerouting required.`,
      incidentId,
      role: 'operator'
    });

    eventBus.broadcast('HOSPITAL_CASE_REJECTED', {
      hospitalId: id,
      incidentId,
      reason,
      timestamp: new Date()
    });

    await AuditLog.create({
      logId: `LOG-HOSP-REJECT-${Date.now()}`,
      actorId,
      eventType: 'HOSPITAL_CASE_REJECTED',
      entityType: 'INCIDENT',
      entityId: incidentId,
      timestamp: new Date(),
      details: { hospitalId: id, reason },
      outcome: 'SUCCESS',
      isSynthetic: false
    });

    res.json({ success: true, message: `Incident ${incidentId} rejected by hospital ${id}. Operator alerted for diversion.`, incident });
  } catch (err) {
    next(err);
  }
}

export default {
  listAmbulances,
  getAmbulanceById,
  updateAmbulanceStatus,
  listHospitals,
  getHospitalById,
  updateHospitalCapacity,
  getIncomingHospitalCases,
  acceptIncomingCase,
  rejectIncomingCase
};
