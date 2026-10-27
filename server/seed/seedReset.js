import { connectDB, disconnectDB } from '../config/db.js';
import {
  User,
  RoadNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Incident,
  Dispatch,
  AlgorithmRun,
  AuditLog
} from '../models/index.js';
import { runSeed } from './seed.js';

export async function resetScenario(confirmed = true, actorId = 'CLI_ADMIN') {
  if (!confirmed) {
    throw new Error('Reset aborted: Explicit confirmation is required to reset synthetic scenario.');
  }

  await connectDB();

  // 1. Inspect what will be overwritten
  const countSummary = {
    users: await User.countDocuments({ isSynthetic: true }),
    roadNodes: await RoadNode.countDocuments({ isSynthetic: true }),
    roadEdges: await RoadEdge.countDocuments({ isSynthetic: true }),
    ambulances: await Ambulance.countDocuments({ isSynthetic: true }),
    hospitals: await Hospital.countDocuments({ isSynthetic: true }),
    incidents: await Incident.countDocuments({ isSynthetic: true }),
    dispatches: await Dispatch.countDocuments({ isSynthetic: true }),
    algorithmRuns: await AlgorithmRun.countDocuments({ isSynthetic: true })
  };

  console.log('[ResQNet Reset] Overwriting the following synthetic entities:', countSummary);

  // 2. Remove ephemeral dispatches & algorithm runs created during testing/demo
  await Dispatch.deleteMany({ isSynthetic: true });
  await AlgorithmRun.deleteMany({ isSynthetic: true });

  // 3. Re-run standard seed
  const seedResult = await runSeed(false);

  // 4. Log audit log for reset
  const auditEntry = new AuditLog({
    logId: `LOG-RESET-${Date.now()}`,
    actorId,
    eventType: 'SCENARIO_RESET',
    entityType: 'SCENARIO',
    entityId: 'ALL_SYNTHETIC_DATA',
    timestamp: new Date(),
    details: {
      action: 'seed:reset',
      overwrittenCounts: countSummary,
      restoredCounts: seedResult
    },
    outcome: 'SUCCESS',
    isSynthetic: true
  });
  await auditEntry.save();

  console.log('[ResQNet Reset] Synthetic scenario successfully restored to clean deterministic state.');
  return { overwritten: countSummary, restored: seedResult };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seedReset.js')) {
  resetScenario(true, 'CLI_RESET_COMMAND')
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[RESET ERROR]', err.message);
      await disconnectDB();
      process.exit(1);
    });
}

export default resetScenario;
