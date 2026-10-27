import { resetScenario } from '../seed/seedReset.js';
import { runSeed } from '../seed/seed.js';
import { initializeGraphService } from '../services/graphService.js';
import {
  User,
  RoadNode,
  RoadEdge,
  Ambulance,
  Hospital,
  Incident,
  Dispatch,
  AlgorithmRun
} from '../models/index.js';

export async function resetScenarioEndpoint(req, res, next) {
  try {
    const { confirmed } = req.body;
    const actorId = req.user ? req.user.userId : 'ADMIN_USER';

    if (!confirmed) {
      // Return preview of what will be reset
      const preview = {
        users: await User.countDocuments({ isSynthetic: true }),
        roadNodes: await RoadNode.countDocuments({ isSynthetic: true }),
        roadEdges: await RoadEdge.countDocuments({ isSynthetic: true }),
        ambulances: await Ambulance.countDocuments({ isSynthetic: true }),
        hospitals: await Hospital.countDocuments({ isSynthetic: true }),
        incidents: await Incident.countDocuments({ isSynthetic: true }),
        dispatches: await Dispatch.countDocuments({ isSynthetic: true }),
        algorithmRuns: await AlgorithmRun.countDocuments({ isSynthetic: true })
      };

      return res.status(400).json({
        error: 'Explicit confirmation required to reset scenario.',
        code: 'CONFIRMATION_REQUIRED',
        message: 'Provide { confirmed: true } in request body to reset all synthetic records to clean seed state.',
        affectedSyntheticRecords: preview
      });
    }

    const result = await resetScenario(true, actorId);
    // Re-initialize in-memory graph
    await initializeGraphService();

    res.json({
      success: true,
      message: 'Synthetic scenario reset and restored to deterministic initial state.',
      overwritten: result.overwritten,
      restored: result.restored
    });
  } catch (err) {
    next(err);
  }
}

export async function seedScenarioEndpoint(req, res, next) {
  try {
    const { confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({
        error: 'Explicit confirmation required to seed demo scenario.',
        code: 'CONFIRMATION_REQUIRED'
      });
    }

    const result = await runSeed(false);
    await initializeGraphService();

    res.json({
      success: true,
      message: 'Synthetic scenario seeded successfully.',
      result
    });
  } catch (err) {
    next(err);
  }
}

export default { resetScenarioEndpoint, seedScenarioEndpoint };
