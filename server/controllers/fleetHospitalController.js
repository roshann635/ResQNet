import { Ambulance, Hospital, AuditLog } from '../models/index.js';

export async function listAmbulances(req, res, next) {
  try {
    const ambulances = await Ambulance.find().sort({ ambulanceId: 1 });
    res.json(ambulances);
  } catch (err) {
    next(err);
  }
}

export async function updateAmbulanceStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const actorId = req.user ? req.user.userId : 'DISPATCHER';

    const ambulance = await Ambulance.findOne({ ambulanceId: id });
    if (!ambulance) {
      return res.status(404).json({ error: `Ambulance ${id} not found`, code: 'NOT_FOUND' });
    }

    const oldStatus = ambulance.status;
    ambulance.status = status;
    ambulance.lastUpdatedAt = new Date();
    await ambulance.save();

    await AuditLog.create({
      logId: `LOG-AMB-${Date.now()}`,
      actorId,
      eventType: 'AMBULANCE_STATUS_UPDATED',
      entityType: 'AMBULANCE',
      entityId: id,
      timestamp: new Date(),
      details: { fromStatus: oldStatus, toStatus: status },
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
    const hospitals = await Hospital.find().sort({ hospitalId: 1 });
    res.json(hospitals);
  } catch (err) {
    next(err);
  }
}

export async function updateHospital(req, res, next) {
  try {
    const { id } = req.params;
    const { availableSlots, status } = req.body;
    const actorId = req.user ? req.user.userId : 'DISPATCHER';

    const hospital = await Hospital.findOne({ hospitalId: id });
    if (!hospital) {
      return res.status(404).json({ error: `Hospital ${id} not found`, code: 'NOT_FOUND' });
    }

    if (availableSlots !== undefined) hospital.availableSlots = availableSlots;
    if (status !== undefined) hospital.status = status;
    hospital.updatedAt = new Date();
    await hospital.save();

    await AuditLog.create({
      logId: `LOG-HOS-${Date.now()}`,
      actorId,
      eventType: 'HOSPITAL_UPDATED',
      entityType: 'HOSPITAL',
      entityId: id,
      timestamp: new Date(),
      details: { availableSlots: hospital.availableSlots, status: hospital.status },
      outcome: 'SUCCESS',
      isSynthetic: hospital.isSynthetic
    });

    res.json(hospital);
  } catch (err) {
    next(err);
  }
}

export default {
  listAmbulances,
  updateAmbulanceStatus,
  listHospitals,
  updateHospital
};
