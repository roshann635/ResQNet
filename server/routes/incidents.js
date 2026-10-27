import express from 'express';
import {
  listIncidents,
  getIncidentById,
  getPriorityQueue,
  createIncident,
  transitionIncidentStatus
} from '../controllers/incidentController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', listIncidents);
router.get('/priority-queue', getPriorityQueue);
router.get('/:id', getIncidentById);

// Protected routes (Admin/Dispatcher only)
router.post('/', requireAuth, requireAdmin, createIncident);
router.patch('/:id/status', requireAuth, requireAdmin, transitionIncidentStatus);

export default router;
