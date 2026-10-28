import { resetScenario } from '../seed/seedReset.js';
import { runSeed } from '../seed/seed.js';
import {
  initializeGraphService,
  getAvailableScenarios,
  getActiveScenario,
  setActiveScenario,
  getShowcasePairs
} from '../services/graphService.js';
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

export async function listScenariosEndpoint(req, res, next) {
  try {
    const scenarios = getAvailableScenarios();
    const active = getActiveScenario();
    res.json({
      success: true,
      activeScenario: active,
      scenarios
    });
  } catch (err) {
    next(err);
  }
}

export async function getActiveScenarioEndpoint(req, res, next) {
  try {
    const active = getActiveScenario();
    const scenarios = getAvailableScenarios();
    const current = scenarios.find((s) => s.id === active) || scenarios[0];
    const showcasePairs = getShowcasePairs(active);

    res.json({
      success: true,
      scenario: current,
      showcasePairs
    });
  } catch (err) {
    next(err);
  }
}

export async function switchScenarioEndpoint(req, res, next) {
  try {
    const { scenario } = req.body;
    if (!scenario) {
      return res.status(400).json({
        error: 'Missing required field: scenario',
        code: 'MISSING_SCENARIO'
      });
    }

    const available = getAvailableScenarios().map((s) => s.id);
    if (!available.includes(scenario)) {
      return res.status(400).json({
        error: `Invalid scenario '${scenario}'. Available: ${available.join(', ')}`,
        code: 'INVALID_SCENARIO'
      });
    }

    const newActive = setActiveScenario(scenario);
    const scenarios = getAvailableScenarios();
    const current = scenarios.find((s) => s.id === newActive);
    const showcasePairs = getShowcasePairs(newActive);

    res.json({
      success: true,
      message: `Active scenario successfully switched to '${newActive}'.`,
      scenario: current,
      showcasePairs
    });
  } catch (err) {
    next(err);
  }
}

export async function resetScenarioEndpoint(req, res, next) {
  try {
    const { confirmed } = req.body;
    const actorId = req.user ? req.user.userId : 'ADMIN_USER';

    if (!confirmed) {
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

import { getScriptedScenarios, executeScriptedScenario } from '../services/scenarioService.js';

export async function listScriptedScenariosEndpoint(req, res, next) {
  try {
    const list = getScriptedScenarios();
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function loadScenarioEndpoint(req, res, next) {
  try {
    const { scenarioId } = req.body;
    if (!scenarioId) {
      return res.status(400).json({ error: 'scenarioId is required', code: 'MISSING_PARAM' });
    }
    const actorId = req.user ? req.user.userId : 'ADMIN';
    const result = await executeScriptedScenario(scenarioId, actorId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export default {
  listScenariosEndpoint,
  getActiveScenarioEndpoint,
  switchScenarioEndpoint,
  resetScenarioEndpoint,
  seedScenarioEndpoint,
  listScriptedScenariosEndpoint,
  loadScenarioEndpoint
};
