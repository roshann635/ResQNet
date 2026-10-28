import express from 'express';
import {
  listScenariosEndpoint,
  getActiveScenarioEndpoint,
  switchScenarioEndpoint,
  resetScenarioEndpoint,
  seedScenarioEndpoint,
  listScriptedScenariosEndpoint,
  loadScenarioEndpoint
} from '../controllers/scenarioController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Scenario switching and showcase pair inspection
router.get('/list', listScenariosEndpoint);
router.get('/active', getActiveScenarioEndpoint);
router.post('/switch', switchScenarioEndpoint);

// Scripted scenarios (S1 - S6)
router.get('/scripted', listScriptedScenariosEndpoint);
router.post('/load', requireAuth, requireAdmin, loadScenarioEndpoint);

// Administrative reset and seeding
router.post('/reset', requireAuth, requireAdmin, resetScenarioEndpoint);
router.post('/seed', requireAuth, requireAdmin, seedScenarioEndpoint);

export default router;
