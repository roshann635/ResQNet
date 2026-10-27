import express from 'express';
import { getAnalyticsSummary } from '../controllers/analyticsAuditController.js';

const router = express.Router();

router.get('/summary', getAnalyticsSummary);

export default router;
