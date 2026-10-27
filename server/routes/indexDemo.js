import express from 'express';
import {
  getHashItem,
  getBPlusRange,
  getSampleDemoKeys,
  loadSampleKeys
} from '../controllers/indexDemoController.js';

const router = express.Router();

router.get('/hash/:id', getHashItem);
router.get('/bplus/range', getBPlusRange);
router.get('/demo-keys', getSampleDemoKeys);
router.post('/load-samples', loadSampleKeys);

export default router;
