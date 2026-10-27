import express from 'express';
import { listNodes, listEdges, updateEdge } from '../controllers/roadController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/nodes', listNodes);
router.get('/edges', listEdges);
router.patch('/edges/:id/condition', requireAuth, requireAdmin, updateEdge);

export default router;
