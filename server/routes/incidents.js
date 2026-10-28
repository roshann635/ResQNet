import express from 'express';
import {
  listIncidents,
  getIncidentById,
  getPriorityQueue,
  createIncident,
  transitionIncidentStatus,
  cancelIncident,
  getIncidentCandidates,
  confirmIncidentDispatch,
  getHospitalRecommendation
} from '../controllers/incidentController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';

const router = express.Router();

// Public / Scoped list and queue
router.get('/', listIncidents);
router.get('/queue', getPriorityQueue);
router.get('/priority-queue', getPriorityQueue); // alias for backwards compatibility
router.get('/:id', getIncidentById);

// Creation: citizen, operator, admin
router.post('/', requireAuth, requirePermission('REPORT_EMERGENCY'), createIncident);

// Status transition: operator, admin
router.patch('/:id/status', requireAuth, requireRole('operator', 'admin'), transitionIncidentStatus);

// Cancellation: citizen (pre-dispatch own), operator, admin
router.post('/:id/cancel', requireAuth, requirePermission('CANCEL_INCIDENT'), cancelIncident);

// Candidates & Dispatching: operator, admin
router.post('/:id/candidates', requireAuth, requireRole('operator', 'admin', 'evaluator'), getIncidentCandidates);
router.post('/:id/dispatch', requireAuth, requireRole('operator', 'admin'), confirmIncidentDispatch);
router.post('/:id/hospital-recommendation', requireAuth, requireRole('operator', 'admin', 'evaluator'), getHospitalRecommendation);

export default router;
