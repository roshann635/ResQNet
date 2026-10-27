import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  RoadNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Incident,
  AuditLog
} from '../models/index.js';
import { generateSyntheticData } from './syntheticData.js';

export async function runSeed(verbose = true) {
  const startTime = Date.now();
  if (verbose) {
    console.log('====================================================');
    console.log('  ResQNet Deterministic Synthetic Data Seeder (Phase 1)  ');
    console.log('====================================================');
  }

  await connectDB();

  // 1. Wipe only synthetic records to maintain safety
  if (verbose) console.log('[1/4] Purging existing synthetic records...');
  await User.deleteMany({ isSynthetic: true });
  await RoadNode.deleteMany({ isSynthetic: true });
  await RoadEdge.deleteMany({ isSynthetic: true });
  await Ambulance.deleteMany({ isSynthetic: true });
  await Hospital.deleteMany({ isSynthetic: true });
  await Incident.deleteMany({ isSynthetic: true });

  // 2. Generate deterministic synthetic data
  if (verbose) console.log('[2/4] Generating deterministic synthetic datasets...');
  const data = await generateSyntheticData();

  // 3. Insert collections
  if (verbose) console.log('[3/4] Persisting records to MongoDB...');
  const insertedUsers = await User.insertMany(data.users);
  const insertedNodes = await RoadNode.insertMany(data.roadNodes);
  const insertedEdges = await RoadEdge.insertMany(data.roadEdges);
  const insertedAmbulances = await Ambulance.insertMany(data.ambulances);
  const insertedHospitals = await Hospital.insertMany(data.hospitals);
  const insertedIncidents = await Incident.insertMany(data.incidents);

  // 4. Seed 14-day history for analytics and charts (Section 8f)
  if (verbose) console.log('[4/5] Generating 14-day synthetic analytics and audit history...');
  const { seedAnalyticsHistory } = await import('./historySeeder.js');
  const historyResult = await seedAnalyticsHistory(1337);

  // 5. Log Seed Audit Entry
  const auditEntry = new AuditLog({
    logId: `LOG-SEED-${Date.now()}`,
    actorId: 'SYSTEM_SEEDER',
    eventType: 'SCENARIO_SEEDED',
    entityType: 'DATABASE',
    entityId: 'ALL_COLLECTIONS',
    timestamp: new Date(),
    details: {
      action: 'npm run seed',
      nodesSeeded: insertedNodes.length,
      edgesSeeded: insertedEdges.length,
      ambulancesSeeded: insertedAmbulances.length,
      hospitalsSeeded: insertedHospitals.length,
      incidentsSeeded: insertedIncidents.length,
      usersSeeded: insertedUsers.length,
      historicalDispatches: historyResult.dispatchesCount,
      historicalAlgoRuns: historyResult.algorithmRunsCount,
      historicalAuditLogs: historyResult.auditLogsCount
    },
    outcome: 'SUCCESS',
    isSynthetic: true
  });
  await auditEntry.save();

  const durationMs = Date.now() - startTime;
  if (verbose) {
    console.log('[5/5] Seed completed successfully!');
    console.log('----------------------------------------------------');
    console.log(`- Users Seeded:       ${insertedUsers.length} (admin & evaluator)`);
    console.log(`- Road Nodes Seeded:  ${insertedNodes.length} (across 6 zones)`);
    console.log(`- Road Edges Seeded:  ${insertedEdges.length} (116 directed edges, 58 pairs)`);
    console.log(`- Ambulances Seeded:  ${insertedAmbulances.length} (ALS, BLS, ICU, Neonatal)`);
    console.log(`- Hospitals Seeded:   ${insertedHospitals.length} (HOS-001..HOS-005)`);
    console.log(`- Incidents Seeded:   ${insertedIncidents.length} (mixed severities & tie-breaker)`);
    console.log(`- Past Dispatches:    ${historyResult.dispatchesCount} records`);
    console.log(`- Past Algorithm Runs:${historyResult.algorithmRunsCount} records (A* vs Dijkstra)`);
    console.log(`- Audit Logs:         ${historyResult.auditLogsCount} entries`);
    console.log(`- Execution Time:     ${durationMs} ms`);
    console.log('====================================================\n');
  }

  return {
    usersCount: insertedUsers.length,
    nodesCount: insertedNodes.length,
    edgesCount: insertedEdges.length,
    ambulancesCount: insertedAmbulances.length,
    hospitalsCount: insertedHospitals.length,
    incidentsCount: insertedIncidents.length,
    durationMs
  };
}

// Auto-run if executed directly via node
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
