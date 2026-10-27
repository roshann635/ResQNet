import {
  Incident,
  Ambulance,
  Hospital,
  Dispatch,
  AlgorithmRun,
  AuditLog
} from '../models/index.js';

export async function getAnalyticsSummary(req, res, next) {
  try {
    // 1. Incident counts by severity
    const incidentsBySeverity = await Incident.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    // 2. Incident counts by status
    const incidentsByStatus = await Incident.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // 3. Ambulance availability and vehicle types
    const ambulances = await Ambulance.find().lean();
    const availableAmbulances = ambulances.filter((a) => a.status === 'AVAILABLE').length;
    const busyAmbulances = ambulances.filter((a) => a.status === 'DISPATCHED' || a.status === 'EN_ROUTE').length;
    const offlineAmbulances = ambulances.filter((a) => a.status === 'MAINTENANCE' || a.status === 'OFFLINE').length;

    // 4. Hospital capacity metrics
    const hospitals = await Hospital.find().lean();
    const totalHospitalCapacity = hospitals.reduce((sum, h) => sum + (h.capacity || 0), 0);
    const totalAvailableSlots = hospitals.reduce((sum, h) => sum + (h.availableSlots || 0), 0);

    // 5. Recent dispatches
    const recentDispatches = await Dispatch.find().sort({ createdAt: -1 }).limit(8).lean();

    // 6. Algorithm performance averages
    const algorithmMetrics = await AlgorithmRun.aggregate([
      {
        $group: {
          _id: '$algorithm',
          totalRuns: { $sum: 1 },
          avgRuntimeMs: { $avg: '$runtimeMs' },
          avgNodesExpanded: { $avg: '$nodesExpanded' },
          avgEdgesExamined: { $avg: '$edgesExamined' },
          avgCost: { $avg: '$routeCost' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      incidents: {
        total: await Incident.countDocuments(),
        bySeverity: incidentsBySeverity.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {}),
        byStatus: incidentsByStatus.reduce((acc, curr) => ({ ...acc, [curr._id]: curr.count }), {})
      },
      fleet: {
        total: ambulances.length,
        available: availableAmbulances,
        busy: busyAmbulances,
        offline: offlineAmbulances,
        vehicles: ambulances
      },
      hospitals: {
        totalFacilities: hospitals.length,
        totalCapacity: totalHospitalCapacity,
        totalAvailableSlots,
        occupancyRate: totalHospitalCapacity > 0
          ? Math.round(((totalHospitalCapacity - totalAvailableSlots) / totalHospitalCapacity) * 100)
          : 0,
        facilities: hospitals
      },
      recentDispatches,
      algorithmMetrics: algorithmMetrics.map((m) => ({
        algorithm: m._id,
        totalRuns: m.totalRuns,
        avgRuntimeMs: Math.round((m.avgRuntimeMs || 0) * 100) / 100,
        avgNodesExpanded: Math.round((m.avgNodesExpanded || 0) * 10) / 10,
        avgEdgesExamined: Math.round((m.avgEdgesExamined || 0) * 10) / 10,
        avgCost: Math.round((m.avgCost || 0) * 100) / 100
      }))
    });
  } catch (err) {
    next(err);
  }
}

export async function listAuditLogs(req, res, next) {
  try {
    const { event, entityType, outcome, limit = 100 } = req.query;
    const filter = {};

    if (event) filter.eventType = event;
    if (entityType) filter.entityType = entityType;
    if (outcome) filter.outcome = outcome;

    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit, 10) || 100)
      .lean();

    res.json({
      count: logs.length,
      logs
    });
  } catch (err) {
    next(err);
  }
}

export default { getAnalyticsSummary, listAuditLogs };
