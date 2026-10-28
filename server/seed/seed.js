import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  RoadNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Incident,
  Dispatch,
  AuditLog,
  AlgorithmRun,
  Notification
} from '../models/index.js';
import { initializeGraphService } from '../services/graphService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

function loadJson(relPath) {
  const fullPath = path.join(DATA_DIR, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Seed Loader Error: Cannot find ${relPath} in /data directory.`);
  }
  return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
}

export async function runSeed(verbose = true) {
  const startTime = Date.now();
  if (verbose) {
    console.log('====================================================');
    console.log('  ResQNet Master /data Synthetic Dataset Loader    ');
    console.log('====================================================');
  }

  await connectDB();

  // 1. Purge synthetic records
  if (verbose) console.log('[1/5] Purging existing synthetic records from MongoDB...');
  await Promise.all([
    User.deleteMany({ isSynthetic: true }),
    RoadNode.deleteMany({ isSynthetic: true }),
    RoadEdge.deleteMany({ isSynthetic: true }),
    Ambulance.deleteMany({ isSynthetic: true }),
    Hospital.deleteMany({ isSynthetic: true }),
    Incident.deleteMany({ isSynthetic: true }),
    Dispatch.deleteMany({}),
    AuditLog.deleteMany({ isSynthetic: true }),
    AlgorithmRun.deleteMany({}),
    Notification.deleteMany({ isSynthetic: true })
  ]);

  // 2. Load JSON files from /data
  if (verbose) console.log('[2/5] Reading synthetic datasets from /data...');
  const rawNodes = loadJson('graph/nodes.json');
  const rawEdges = loadJson('graph/edges.json');
  const rawHospitals = loadJson('hospitals/hospitals.json');
  const rawAmbulances = loadJson('ambulances/ambulances.json');
  const rawUsers = loadJson('users/users.json');
  const rawIncidentsHist = loadJson('incidents/incidents_history.json');
  const rawIncidentsActive = loadJson('incidents/incidents_active.json');
  const rawDispatches = loadJson('dispatches/dispatches_history.json');
  const rawAudit = loadJson('audit/audit_seed.json');
  const rawRuns = loadJson('algorithm_runs/runs_seed.json');
  const rawNotifs = loadJson('notifications/outbox_seed.json');

  // 3. Map entities for Mongoose models
  const nodes = rawNodes.map(n => ({
    nodeId: n.nodeId,
    label: n.label,
    latitude: n.lat,
    longitude: n.lng,
    lat: n.lat,
    lng: n.lng,
    zone: n.zone,
    type: n.type || 'junction',
    active: n.active !== false,
    isSynthetic: true,
    scenario: 'default'
  }));

  const edges = rawEdges.map(e => ({
    edgeId: e.edgeId,
    fromNodeId: e.fromNodeId,
    toNodeId: e.toNodeId,
    distanceM: e.distanceM,
    baseCost: e.baseCost,
    roadClass: e.roadClass,
    speedLimit: e.speedLimit,
    condition: e.condition || 'NORMAL',
    multiplier: e.multiplier || 1.0,
    active: e.active !== false,
    isSynthetic: true,
    scenario: 'default'
  }));

  const hospitals = rawHospitals.map(h => ({
    hospitalId: h.hospitalId,
    name: h.name,
    tier: h.tier,
    nodeId: h.nodeId,
    zone: h.zone,
    capabilities: h.capabilities,
    totalBeds: h.totalBeds,
    icuBeds: h.icuBeds,
    availableBeds: h.availableBeds,
    availableIcu: h.availableIcu,
    status: h.status,
    address: h.address,
    phone: h.phone,
    active: h.active !== false,
    isSynthetic: true,
    scenario: 'default'
  }));

  const ambulances = rawAmbulances.map(a => ({
    ambulanceId: a.ambulanceId,
    callSign: a.callSign,
    type: a.type,
    capabilities: a.capabilities,
    baseStationNodeId: a.baseStationNodeId,
    currentNodeId: a.currentNodeId,
    status: a.status,
    crew: a.crew,
    fuelPct: a.fuelPct,
    activeIncidentId: a.activeIncidentId || null,
    active: a.active !== false,
    isSynthetic: true,
    scenario: 'default'
  }));

  const users = rawUsers.map(u => ({
    userId: u.userId,
    displayName: u.displayName,
    email: u.email,
    phone: u.phone || '',
    passwordHash: u.passwordHash,
    role: u.role,
    hospitalId: u.hospitalId || null,
    active: u.active !== false,
    createdAt: u.createdAt || new Date(),
    isSynthetic: true
  }));

  const incidents = [...rawIncidentsActive, ...rawIncidentsHist].map(i => ({
    incidentId: i.incidentId,
    type: i.type,
    severity: i.severity,
    locationNodeId: i.locationNodeId,
    patientCount: i.patientCount || 1,
    description: i.description || '',
    status: i.status,
    requiredCapabilities: i.requiredCapabilities || [],
    reportedBy: i.reportedBy || null,
    assignedAmbulanceId: i.assignedAmbulanceId || null,
    destinationHospitalId: i.destinationHospitalId || null,
    createdAt: i.createdAt || new Date(),
    updatedAt: i.updatedAt || new Date(),
    isSynthetic: true,
    scenario: 'default'
  }));

  const dispatches = rawDispatches.map(d => ({
    dispatchId: d.dispatchId,
    incidentId: d.incidentId,
    ambulanceId: d.ambulanceId,
    hospitalId: d.hospitalId,
    routeNodeIds: d.routeNodeIds,
    routeCostSeconds: d.routeCostSeconds,
    distanceKm: d.distanceKm,
    algorithmUsed: d.algorithmUsed,
    dispatchTime: d.dispatchTime || new Date(),
    atSceneTime: d.atSceneTime || null,
    hospitalArrivalTime: d.hospitalArrivalTime || null,
    status: d.status || 'Completed'
  }));

  const auditLogs = rawAudit.map(a => ({
    logId: a.logId,
    actorId: a.actorId,
    eventType: a.eventType,
    entityType: a.entityType,
    entityId: a.entityId,
    timestamp: a.timestamp || new Date(),
    details: a.details,
    outcome: 'SUCCESS',
    isSynthetic: true
  }));

  const algorithmRuns = rawRuns.map(r => ({
    runId: r.runId,
    algorithm: r.algorithm,
    sourceNodeId: r.sourceNodeId,
    targetNodeId: r.targetNodeId,
    costMode: r.costMode || 'time',
    pathCost: r.pathCost,
    pathNodeCount: r.pathNodeCount,
    nodesExpanded: r.nodesExpanded,
    edgesExamined: r.edgesExamined,
    runtimeMs: r.runtimeMs,
    timestamp: r.timestamp || new Date(),
    graphVersion: r.graphVersion || 1
  }));

  const notifications = rawNotifs.map(n => ({
    notificationId: n.notificationId,
    recipientId: n.recipientId,
    channel: n.channel,
    destination: n.destination,
    subject: n.subject || null,
    message: n.message,
    status: n.status || 'Delivered',
    timestamp: n.timestamp || new Date(),
    isSynthetic: true
  }));

  // 4. Bulk Persist to MongoDB
  if (verbose) console.log('[3/5] Bulk inserting records into MongoDB collections...');
  const batchInsert = async (Model, items, batchSize = 1000) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const slice = items.slice(i, i + batchSize);
      await Model.insertMany(slice, { ordered: false });
    }
  };

  await Promise.all([
    batchInsert(User, users),
    batchInsert(RoadNode, nodes),
    batchInsert(RoadEdge, edges),
    batchInsert(Ambulance, ambulances),
    batchInsert(Hospital, hospitals),
    batchInsert(Incident, incidents),
    batchInsert(Dispatch, dispatches),
    batchInsert(AuditLog, auditLogs),
    batchInsert(AlgorithmRun, algorithmRuns),
    batchInsert(Notification, notifications)
  ]);

  // 5. Build Seed Audit Entry
  if (verbose) console.log('[4/5] Recording seed audit entry...');
  const auditEntry = new AuditLog({
    logId: `LOG-SEED-${Date.now()}`,
    actorId: 'SYSTEM_SEEDER',
    eventType: 'SCENARIO_SEEDED',
    entityType: 'DATABASE',
    entityId: 'ALL_COLLECTIONS',
    timestamp: new Date(),
    details: {
      action: 'npm run seed',
      nodesSeeded: nodes.length,
      edgesSeeded: edges.length,
      ambulancesSeeded: ambulances.length,
      hospitalsSeeded: hospitals.length,
      incidentsSeeded: incidents.length,
      usersSeeded: users.length,
      historicalDispatches: dispatches.length,
      algorithmRuns: algorithmRuns.length,
      notifications: notifications.length
    },
    outcome: 'SUCCESS',
    isSynthetic: true
  });
  await auditEntry.save();

  // 6. Rebuild in-memory Graph, HashTable, and BPlusTree
  if (verbose) console.log('[5/5] Bootstrapping in-memory Graph, HashTable, and B+ Tree structures...');
  await initializeGraphService();

  const durationMs = Date.now() - startTime;
  if (verbose) {
    console.log('\n====================================================');
    console.log('  ✔ DATABASE SEED & INDEX SYNCHRONIZATION COMPLETE  ');
    console.log('----------------------------------------------------');
    console.log(`- Users:          ${users.length} (3 Admin, 4 Eval, 25 Oper, 30 Hosp, 540 Citizen)`);
    console.log(`- Road Nodes:     ${nodes.length} intersections & hubs`);
    console.log(`- Road Edges:     ${edges.length} directed segments`);
    console.log(`- Ambulances:     ${ambulances.length} units`);
    console.log(`- Hospitals:      ${hospitals.length} facilities`);
    console.log(`- Incidents:      ${incidents.length} (4,000 hist + 25 active)`);
    console.log(`- Dispatches:     ${dispatches.length} paths`);
    console.log(`- Audit Trail:    ${auditLogs.length} events`);
    console.log(`- Algorithm Runs: ${algorithmRuns.length} benchmarks`);
    console.log(`- Notifications:  ${notifications.length} outbox alerts`);
    console.log(`- Duration:       ${durationMs} ms`);
    console.log('====================================================\n');
  }

  return {
    usersCount: users.length,
    nodesCount: nodes.length,
    edgesCount: edges.length,
    ambulancesCount: ambulances.length,
    hospitalsCount: hospitals.length,
    incidentsCount: incidents.length,
    dispatchesCount: dispatches.length,
    durationMs
  };
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  runSeed()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[SEED ERROR]', err);
      await disconnectDB();
      process.exit(1);
    });
}

export default runSeed;
