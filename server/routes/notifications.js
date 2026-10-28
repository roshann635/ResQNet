import express from 'express';
import { notifyAdapter } from '../adapters/notify.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Retrieves outbox messages scoped to the requesting user's role.
 */
router.get('/', authenticateToken, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const { incidentId } = req.query;

    const result = await notifyAdapter.getOutbox({
      role: req.user.role,
      userId: req.user.userId,
      incidentId,
      page,
      limit
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
