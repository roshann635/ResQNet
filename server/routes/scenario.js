import express from 'express';
import { resetScenarioEndpoint, seedScenarioEndpoint } from '../controllers/scenarioController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.post('/reset', requireAuth, requireAdmin, resetScenarioEndpoint);
router.post('/seed', requireAuth, requireAdmin, seedScenarioEndpoint);

export default router;
