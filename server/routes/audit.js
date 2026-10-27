import express from 'express';
import { listAuditLogs } from '../controllers/analyticsAuditController.js';

const router = express.Router();

router.get('/', listAuditLogs);

export default router;
