import express from 'express';
import { computeRoute, compareAlgorithms } from '../controllers/routeController.js';

const router = express.Router();

router.post('/compute', computeRoute);
router.post('/compare', compareAlgorithms);

export default router;
