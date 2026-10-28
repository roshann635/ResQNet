import express from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { eventBus } from '../services/eventBus.js';

const router = express.Router();

/**
 * GET /api/events
 * Real-time Server-Sent Events (SSE) stream.
 * Authenticates client via token in query or Authorization header.
 */
let sseClientSeq = 0;

router.get('/', (req, res) => {
  let user = null;

  // Extract token from query param (common for EventSource) or Auth header
  const token = req.query.token || (req.headers.authorization && req.headers.authorization.split(' ')[1]);

  if (token) {
    try {
      user = jwt.verify(token, config.jwt.secret);
    } catch {
      // Allow unauthenticated connection with restricted/public events
      user = null;
    }
  }

  // Set SSE Headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Access-Control-Allow-Origin': '*'
  });
  res.flushHeaders();

  sseClientSeq++;
  const clientId = `SSE-${Date.now()}-${sseClientSeq}`;
  const client = {
    id: clientId,
    res,
    user
  };

  eventBus.addClient(client);

  req.on('close', () => {
    eventBus.removeClient(clientId);
  });
});

export default router;
