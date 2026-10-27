import express from 'express';
import { listAmbulances, updateAmbulanceStatus } from '../controllers/fleetHospitalController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', listAmbulances);
router.patch('/:id/status', requireAuth, requireAdmin, updateAmbulanceStatus);

export default router;
