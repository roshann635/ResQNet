import { createPRNG } from './prng.js';
import { Dispatch, AlgorithmRun, AuditLog } from '../models/index.js';

/**
 * Generates realistic synthetic history:
 *  - 30 past dispatch records
 *  - 60 algorithm-run records (all 5 algorithms, A* expanding fewer nodes on avg than Dijkstra)
 *  - 150 audit-log entries spanning past 14 days
 */
export async function seedAnalyticsHistory(seed = 1337, referenceDate = new Date()) {
  const prng = createPRNG(seed);
  const now = referenceDate.getTime();
  const DAY_MS = 86400000;

  // 1. GENERATE 30 PAST DISPATCHES
  const dispatches = [];
  const algorithms = ['DIJKSTRA', 'ASTAR', 'DIJKSTRA', 'ASTAR', 'BACKTRACKING'];
  const hospitalIds = ['HOS-001', 'HOS-002', 'HOS-003', 'HOS-005'];
  const ambulanceIds = ['AMB-001', 'AMB-002', 'AMB-003', 'AMB-004', 'AMB-005', 'AMB-006', 'AMB-008'];

  for (let i = 1; i <= 30; i++) {
    const ageDays = prng.nextFloat(0.2, 13.5, 2);
    const createdAt = new Date(now - ageDays * DAY_MS);
    const cost = prng.nextFloat(2.5, 12.8, 2);
    const hops = prng.nextInt(3, 7);
    const sampleNodes = [`N-${String(prng.nextInt(1, 10)).padStart(2, '0')}`];
    for (let h = 0; h < hops; h++) {
      sampleNodes.push(`N-${String(prng.nextInt(11, 38)).padStart(2, '0')}`);
    }

    dispatches.push({
      dispatchId: `DSP-HIST-${String(i).padStart(4, '0')}`,
      incidentId: `INC-HIST-${String(i).padStart(4, '0')}`,
      ambulanceId: prng.choice(ambulanceIds),
      hospitalId: prng.choice(hospitalIds),
      routeNodeIds: sampleNodes,
      routeCost: cost,
      algorithm: prng.choice(algorithms),
      graphVersion: prng.nextInt(1, 3),
      status: prng.choice(['COMPLETED', 'COMPLETED', 'COMPLETED', 'REROUTED']),
      createdAt,
      isSynthetic: true
    });
  }

  // 2. GENERATE 60 ALGORITHM RUNS
  const algoRuns = [];
  const algoTypes = ['DIJKSTRA', 'ASTAR', 'BFS', 'DFS', 'BACKTRACKING'];

  for (let i = 1; i <= 60; i++) {
    const algo = algoTypes[(i - 1) % algoTypes.length];
    const ageDays = prng.nextFloat(0.1, 14.0, 2);
    const createdAt = new Date(now - ageDays * DAY_MS);
    const source = `N-${String(prng.nextInt(1, 20)).padStart(2, '0')}`;
    const destination = `N-${String(prng.nextInt(21, 38)).padStart(2, '0')}`;
    const cost = prng.nextFloat(3.2, 14.5, 2);

    let nodesExpanded = 0;
    let edgesExamined = 0;
    let runtimeMs = 0;

    if (algo === 'DIJKSTRA') {
      nodesExpanded = prng.nextInt(18, 35);
      edgesExamined = prng.nextInt(45, 80);
      runtimeMs = prng.nextFloat(1.1, 3.5, 2);
    } else if (algo === 'ASTAR') {
      // Key specification: A* expanding fewer nodes on average than Dijkstra
      nodesExpanded = prng.nextInt(8, 20);
      edgesExamined = prng.nextInt(20, 50);
      runtimeMs = prng.nextFloat(0.8, 2.4, 2);
    } else if (algo === 'BFS') {
      nodesExpanded = prng.nextInt(15, 38);
      edgesExamined = prng.nextInt(40, 90);
      runtimeMs = prng.nextFloat(0.9, 2.8, 2);
    } else if (algo === 'DFS') {
      nodesExpanded = prng.nextInt(12, 30);
      edgesExamined = prng.nextInt(30, 75);
      runtimeMs = prng.nextFloat(0.7, 2.2, 2);
    } else {
      // BACKTRACKING
      nodesExpanded = prng.nextInt(25, 60);
      edgesExamined = prng.nextInt(60, 140);
      runtimeMs = prng.nextFloat(1.8, 5.2, 2);
    }

    algoRuns.push({
      runId: `RUN-HIST-${String(i).padStart(4, '0')}`,
      algorithm: algo,
      sourceNodeId: source,
      destinationNodeId: destination,
      graphVersion: prng.nextInt(1, 3),
      routeNodeIds: [source, `N-${prng.nextInt(10, 25)}`, destination],
      routeCost: cost,
      nodesExpanded,
      edgesExamined,
      runtimeMs,
      outcome: 'FOUND',
      limits: { maxHops: 12, maxCost: 60.0 },
      createdAt,
      isSynthetic: true
    });
  }

  // 3. GENERATE 150 AUDIT LOG ENTRIES
  const auditLogs = [];
  const eventTypes = [
    { type: 'INCIDENT_CREATED', entity: 'INCIDENT', outcome: 'SUCCESS' },
    { type: 'INCIDENT_STATUS_CHANGED', entity: 'INCIDENT', outcome: 'SUCCESS' },
    { type: 'DISPATCH_CONFIRMED', entity: 'DISPATCH', outcome: 'SUCCESS' },
    { type: 'ROAD_CONDITION_UPDATED', entity: 'ROAD_EDGE', outcome: 'SUCCESS' },
    { type: 'ALGORITHM_RUN_EXECUTED', entity: 'ALGORITHM', outcome: 'SUCCESS' },
    { type: 'SCENARIO_SEEDED', entity: 'DATABASE', outcome: 'SUCCESS' },
    { type: 'USER_LOGIN_SUCCESS', entity: 'USER', outcome: 'SUCCESS' },
    { type: 'DISPATCH_VALIDATION_FAILED', entity: 'DISPATCH', outcome: 'FAILURE' }
  ];

  for (let i = 1; i <= 150; i++) {
    const evt = prng.choice(eventTypes);
    const ageDays = prng.nextFloat(0.05, 14.0, 3);
    const timestamp = new Date(now - ageDays * DAY_MS);

    auditLogs.push({
      logId: `LOG-HIST-${String(i).padStart(5, '0')}`,
      actorId: prng.choice(['USR-001', 'USR-002', 'SYSTEM_MONITOR', 'DISPATCHER']),
      eventType: evt.type,
      entityType: evt.entity,
      entityId: `ENT-${prng.nextInt(100, 999)}`,
      timestamp,
      details: {
        simulationStep: i,
        note: `Synthetic operations log for ${evt.type}`,
        severity: prng.choice(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])
      },
      outcome: evt.outcome,
      isSynthetic: true
    });
  }

  // Wipe previous synthetic history and insert
  await Dispatch.deleteMany({ isSynthetic: true });
  await AlgorithmRun.deleteMany({ isSynthetic: true });
  await AuditLog.deleteMany({ isSynthetic: true });

  await Dispatch.insertMany(dispatches);
  await AlgorithmRun.insertMany(algoRuns);
  await AuditLog.insertMany(auditLogs);

  return {
    dispatchesCount: dispatches.length,
    algorithmRunsCount: algoRuns.length,
    auditLogsCount: auditLogs.length
  };
}

export default seedAnalyticsHistory;
