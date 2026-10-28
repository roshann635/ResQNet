import express from 'express';
import { listNodes, listEdges, updateEdge } from '../controllers/roadController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.get('/nodes', listNodes);
router.get('/edges', listEdges);
router.patch('/edges/:id/condition', requireAuth, requireRole('operator', 'admin'), updateEdge);

export default router;
