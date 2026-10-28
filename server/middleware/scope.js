/**
 * Row-Level Scoping & Field-Level Masking Middleware.
 *
 * Implements strict data-level security:
 *  1. Citizens see only own reported incidents.
 *  2. Hospital staff see only incidents assigned to their hospital.
 *  3. Non-staff see hospital capacity in bands ('Available', 'Limited', 'Full'), not raw numbers.
 *  4. Citizens never see crew personal contact information.
 *  5. IDOR prevention: unauthorized entity lookups return 404 instead of 403.
 */

export function getIncidentScopeFilter(user) {
  if (!user) return { _id: null }; // block unauthenticated

  if (user.role === 'citizen') {
    return { reportedBy: user.userId };
  }

  if (user.role === 'hospital_staff') {
    return { destinationHospitalId: user.hospitalId };
  }

  // Operator, Admin, Evaluator have system-wide visibility
  return {};
}

export function maskHospitalData(hospital, user) {
  if (!hospital) return null;
  const isDoc = typeof hospital.toObject === 'function';
  const h = isDoc ? hospital.toObject() : { ...hospital };

  const isStaffOfThisHospital = user && user.role === 'hospital_staff' && user.hospitalId === h.hospitalId;
  const isPrivileged = user && (user.role === 'admin' || user.role === 'operator' || user.role === 'evaluator');

  if (isStaffOfThisHospital || isPrivileged) {
    return h; // Full access
  }

  // Mask bed counts into categorical bands for citizens and third-party viewers
  const bedRatio = h.totalBeds > 0 ? (h.availableBeds / h.totalBeds) : 0;
  let capacityBand = 'Available';
  if (bedRatio < 0.1) capacityBand = 'Full';
  else if (bedRatio < 0.3) capacityBand = 'Limited';

  return {
    hospitalId: h.hospitalId,
    name: h.name,
    tier: h.tier,
    nodeId: h.nodeId,
    zone: h.zone,
    capabilities: h.capabilities,
    capacityBand,
    emergencyStatus: h.status || 'Open',
    address: h.address,
    phone: h.phone,
    isMasked: true
  };
}

export function maskAmbulanceData(ambulance, user) {
  if (!ambulance) return null;
  const isDoc = typeof ambulance.toObject === 'function';
  const a = isDoc ? ambulance.toObject() : { ...ambulance };

  const isPrivileged = user && (user.role === 'admin' || user.role === 'operator' || user.role === 'evaluator');

  if (isPrivileged) {
    return a;
  }

  // Mask crew personal data for citizens / external viewers
  const sanitizedCrew = (a.crew || []).map(member => ({
    role: member.role,
    name: member.name // omit phone numbers
  }));

  return {
    ambulanceId: a.ambulanceId,
    callSign: a.callSign,
    type: a.type,
    capabilities: a.capabilities,
    baseStationNodeId: a.baseStationNodeId,
    currentNodeId: a.currentNodeId,
    status: a.status,
    fuelPct: a.fuelPct,
    crew: sanitizedCrew
  };
}

export function maskIncidentData(incident, user) {
  if (!incident) return null;
  const isDoc = typeof incident.toObject === 'function';
  const inc = isDoc ? incident.toObject() : { ...incident };

  if (user && (user.role === 'admin' || user.role === 'operator')) {
    return inc;
  }

  if (user && user.role === 'hospital_staff') {
    // Only see full medical data if assigned to own hospital
    if (inc.destinationHospitalId !== user.hospitalId) {
      return null; // Trigger IDOR 404
    }
    return inc;
  }

  if (user && user.role === 'citizen') {
    if (inc.reportedBy && inc.reportedBy !== user.userId) {
      return null; // Trigger IDOR 404
    }
    return {
      incidentId: inc.incidentId,
      type: inc.type,
      severity: inc.severity,
      status: inc.status,
      locationNodeId: inc.locationNodeId,
      assignedAmbulanceId: inc.assignedAmbulanceId,
      destinationHospitalId: inc.destinationHospitalId,
      createdAt: inc.createdAt,
      updatedAt: inc.updatedAt
    };
  }

  return inc;
}

export default {
  getIncidentScopeFilter,
  maskHospitalData,
  maskAmbulanceData,
  maskIncidentData
};
