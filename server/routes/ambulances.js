import express from 'express';
import {
  listAmbulances,
  getAmbulanceById,
  updateAmbulanceStatus
} from '../controllers/fleetHospitalController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', listAmbulances);
router.get('/:id', getAmbulanceById);
router.patch('/:id/status', requireAuth, requireRole('operator', 'admin'), updateAmbulanceStatus);

export default router;
