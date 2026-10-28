import express from 'express';
import {
  computeRoute,
  compareAlgorithms,
  findAlternatives,
  traverseGraph
} from '../controllers/routeController.js';

const router = express.Router();

router.post('/compute', computeRoute);
router.post('/compare', compareAlgorithms);
router.post('/alternatives', findAlternatives);
router.post('/traverse', traverseGraph);

export default router;
