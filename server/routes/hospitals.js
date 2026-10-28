import express from 'express';
import {
  listHospitals,
  getHospitalById,
  updateHospitalCapacity,
  getIncomingHospitalCases,
  acceptIncomingCase,
  rejectIncomingCase
} from '../controllers/fleetHospitalController.js';
import { requireAuth } from '../middleware/auth.js';
import { requirePermission, requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', listHospitals);
router.get('/:id', getHospitalById);

// Update bed/ICU capacity: hospital_staff for own, admin for any
router.patch('/:id/capacity', requireAuth, requireRole('hospital_staff', 'admin'), updateHospitalCapacity);
router.patch('/:id', requireAuth, requireRole('hospital_staff', 'admin'), updateHospitalCapacity); // alias

// Incoming cases to hospital
router.get('/:id/incoming', requireAuth, requireRole('hospital_staff', 'operator', 'admin', 'evaluator'), getIncomingHospitalCases);
router.post('/:id/incoming/:incidentId/accept', requireAuth, requireRole('hospital_staff', 'admin'), acceptIncomingCase);
router.post('/:id/incoming/:incidentId/reject', requireAuth, requireRole('hospital_staff', 'admin'), rejectIncomingCase);

export default router;
