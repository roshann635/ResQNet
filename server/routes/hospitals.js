import express from 'express';
import { listHospitals, updateHospital } from '../controllers/fleetHospitalController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/', listHospitals);
router.patch('/:id', requireAuth, requireAdmin, updateHospital);

export default router;
