import express from 'express';
import { getDispatchRecommendation, confirmDispatch } from '../controllers/dispatchController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/recommend/:incidentId', getDispatchRecommendation);
router.post('/confirm', requireAuth, requireAdmin, confirmDispatch);

export default router;
