import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { initializeGraphService } from '../services/graphService.js';
import { generateToken } from '../middleware/auth.js';
import { User, AuditLog } from '../models/index.js';

describe('ResQNet Express REST API Integration & Acceptance Tests (AT-15 to AT-18)', () => {
  let adminToken;
  let evaluatorToken;
  let adminUser;
  let evaluatorUser;

  beforeAll(async () => {
    await connectDB();
    await initializeGraphService();

    adminUser = await User.findOne({ email: 'admin@resqnet.test' });
    evaluatorUser = await User.findOne({ email: 'evaluator@resqnet.test' });

    adminToken = generateToken(adminUser);
    evaluatorToken = generateToken(evaluatorUser);
  });

  afterAll(async () => {
    await disconnectDB();
  });

  // Health check
  it('GET /api/health returns ONLINE and valid document counts', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ONLINE');
    expect(res.body.database).toBe('CONNECTED');
    expect(res.body.counts.nodes).toBeGreaterThanOrEqual(40);
  });

  // Auth: Login with valid demo credentials
  it('POST /api/auth/login validates credentials and issues JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@resqnet.test', password: 'ResQNet@Admin2026!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('admin');
  });

  // Auth: Login rejection
  it('POST /api/auth/login rejects incorrect password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@resqnet.test', password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('AUTH_FAILED');
  });

  // AT-16: Read-only user denied writes
  it('AT-16: Read-only user (evaluator role) is denied write permissions with 403 Forbidden', async () => {
    // Attempting to create an incident with evaluator token must fail
    const res = await request(app)
      .post('/api/incidents')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({
        type: 'road accident',
        severity: 'MEDIUM',
        locationNodeId: 'N-01',
        description: 'Unauthorized write test'
      });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_READ_ONLY');
    expect(res.body.error).toContain('Read-only evaluation account cannot perform mutation');
  });

  // Incident Priority Queue Endpoint
  it('GET /api/incidents/priority-queue returns prioritized incidents with priorityKey', async () => {
    const res = await request(app).get('/api/incidents/priority-queue');
    expect(res.status).toBe(200);
    expect(res.body.queue).toBeDefined();
    expect(Array.isArray(res.body.queue)).toBe(true);
    if (res.body.queue.length > 0) {
      expect(res.body.queue[0].priorityKey).toBeDefined();
    }
  });

  // AT-17: Comparison reports cost and runtime separately
  it('AT-17: POST /api/routes/compare reports route cost and measured runtime separately across all 5 algorithms', async () => {
    const res = await request(app)
      .post('/api/routes/compare')
      .send({ source: 'N-01', destination: 'N-15' });

    expect(res.status).toBe(200);
    expect(res.body.comparison).toBeDefined();
    expect(res.body.comparison.length).toBe(5);

    for (const item of res.body.comparison) {
      expect(item.algorithm).toBeDefined();
      expect(item.theoreticalComplexity).toBeDefined();
      expect(typeof item.measuredRuntimeMs).toBe('number');
      expect(item.routeCost).toBeDefined();
      expect(item.nodesExpanded).toBeDefined();
    }
  });

  // Dispatch Recommendation
  it('GET /api/dispatch/recommend/:incidentId returns ambulance and hospital recommendations with score breakdown', async () => {
    const res = await request(app).get('/api/dispatch/recommend/INC-001');
    expect(res.status).toBe(200);
    expect(res.body.ambulanceSelection).toBeDefined();
    expect(res.body.hospitalSelection).toBeDefined();
    expect(res.body.ambulanceSelection.bestCandidate).toBeDefined();
    expect(res.body.ambulanceSelection.bestCandidate.breakdown).toBeDefined();
    expect(res.body.hospitalSelection.bestHospital).toBeDefined();
  });

  // AT-18: Reset requires confirmation and is logged
  it('AT-18: POST /api/scenario/reset requires explicit confirmation and logs an audit entry', async () => {
    // 1. Unconfirmed attempt must fail
    const unconfirmedRes = await request(app)
      .post('/api/scenario/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirmed: false });

    expect(unconfirmedRes.status).toBe(400);
    expect(unconfirmedRes.body.code).toBe('CONFIRMATION_REQUIRED');

    // 2. Confirmed attempt must succeed
    const confirmedRes = await request(app)
      .post('/api/scenario/reset')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ confirmed: true });

    expect(confirmedRes.status).toBe(200);
    expect(confirmedRes.body.success).toBe(true);

    // Verify audit log entry exists
    const resetLog = await AuditLog.findOne({ eventType: 'SCENARIO_RESET' }).sort({ timestamp: -1 });
    expect(resetLog).toBeDefined();
    expect(resetLog.outcome).toBe('SUCCESS');
  });

  // Index Demos: Hash Table and B+ Tree
  it('GET /api/index/hash/:id and /api/index/bplus/range return correct data structures diagnostics', async () => {
    const hashRes = await request(app).get('/api/index/hash/HOS-001');
    expect(hashRes.status).toBe(200);
    expect(hashRes.body.found).toBe(true);
    expect(hashRes.body.hashIndex).toBeDefined();
    expect(hashRes.body.tableMetrics.loadFactor).toBeDefined();

    const bplusRes = await request(app).get('/api/index/bplus/range?from=HOS-001&to=HOS-005');
    expect(bplusRes.status).toBe(200);
    expect(bplusRes.body.results.length).toBeGreaterThan(0);
    expect(bplusRes.body.treeMetrics.order).toBe(4);
  });
});
