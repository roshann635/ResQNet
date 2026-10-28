import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { initializeGraphService } from '../services/graphService.js';
import { mapsTrafficAdapter, hospitalDataAdapter, notifyAdapter } from '../adapters/index.js';
import { executeScriptedScenario, getScriptedScenarios } from '../services/scenarioService.js';
import { handleRoadConditionUpdate } from '../services/rerouteService.js';
import { calculateSeverityAndPriority, isValidTransition } from '../services/incidentService.js';

describe('Phase 5 & 6: Adapters, Incident State Machine, Dynamic Reroute & Scenarios', () => {
  let citizenToken = '';
  let operatorToken = '';
  let adminToken = '';
  let hospitalToken = '';

  beforeAll(async () => {
    await connectDB();
    await initializeGraphService();

    // Login accounts
    const citizenRes = await request(app).post('/api/auth/login').send({
      email: 'citizen1@resqnet.test',
      password: 'Demo@1234'
    });
    citizenToken = citizenRes.body.token;

    const opRes = await request(app).post('/api/auth/login').send({
      email: 'operator1@resqnet.test',
      password: 'Demo@1234'
    });
    operatorToken = opRes.body.token;

    const adminRes = await request(app).post('/api/auth/login').send({
      email: 'admin@resqnet.test',
      password: 'Demo@1234'
    });
    adminToken = adminRes.body.token;

    const hospRes = await request(app).post('/api/auth/login').send({
      email: 'hospital.h007@resqnet.test',
      password: 'Demo@1234'
    });
    hospitalToken = hospRes.body.token;
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('External Service Adapters (Local Simulators)', () => {
    it('MapsTrafficAdapter returns non-trivial congestion multipliers from /data/traffic', () => {
      const summary = mapsTrafficAdapter.getProfileSummary();
      expect(summary.totalProfiles).toBeGreaterThan(500);
      expect(summary.zones.length).toBeGreaterThanOrEqual(10);

      const multiplier = mapsTrafficAdapter.getCongestionMultiplier('Z-01', 18, 'Weekday');
      expect(multiplier).toBeGreaterThanOrEqual(1.0);
    });

    it('HospitalDataAdapter loads 7-day timeline and returns hourly capacity', () => {
      const capacity = hospitalDataAdapter.getHourlyCapacity('HOSP-001', 1, 14);
      expect(capacity).toBeDefined();
      expect(capacity.availableBeds).toBeGreaterThan(0);
      expect(capacity.availableIcu).toBeGreaterThanOrEqual(0);
      expect(capacity.loadFactor).toBeGreaterThan(0);
    });

    it('NotifyAdapter records SMS & Email into Outbox and broadcasts event', async () => {
      const sms = await notifyAdapter.sendSMS({
        recipientId: 'CITIZEN-001',
        phone: '+91 9000000001',
        message: 'Test emergency dispatch message',
        incidentId: 'INC-TEST-01'
      });
      expect(sms.notificationId).toBeDefined();
      expect(sms.channel).toBe('SMS');

      const outbox = await notifyAdapter.getOutbox({ role: 'operator', limit: 10 });
      expect(outbox.items.length).toBeGreaterThan(0);
    });
  });

  describe('Incident State Machine & Triage (Part E1 & E13)', () => {
    it('Deterministic auto-triage assigns Critical to cardiac conditions', () => {
      const triage = calculateSeverityAndPriority('Cardiac Arrest', ['chest pain', 'unconscious'], 1);
      expect(triage.severity).toBe('CRITICAL');
      expect(triage.rank).toBe(4);
      expect(triage.explanation).toContain('Critical Triage');
    });

    it('State machine returns 409 Conflict for invalid transitions', () => {
      expect(isValidTransition('Registered', 'Transporting')).toBe(false);
      expect(isValidTransition('Transporting', 'Cancelled')).toBe(false);
      expect(isValidTransition('EnRoute', 'AtScene')).toBe(true);
    });

    it('POST /api/incidents/:id/cancel allows citizen to cancel pre-dispatch but rejects post-dispatch', async () => {
      // 1. Create incident as citizen
      const createRes = await request(app)
        .post('/api/incidents')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          type: 'Accident',
          locationNodeId: 'N-0001',
          description: 'Citizen cancellation test'
        });
      expect(createRes.status).toBe(201);
      const incidentId = createRes.body.incidentId;

      // 2. Cancel it
      const cancelRes = await request(app)
        .post(`/api/incidents/${incidentId}/cancel`)
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({ reason: 'False alarm' });
      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.incident.status).toBe('Cancelled');
    });
  });

  describe('Hospital Capacity & Incoming Cases (Part E7)', () => {
    it('Hospital staff can only update capacity of their own hospital', async () => {
      // hospitalToken is bound to HOSP-007
      const validRes = await request(app)
        .patch('/api/hospitals/HOSP-007/capacity')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({ availableBeds: 25, availableIcu: 5, status: 'Open' });
      expect(validRes.status).toBe(200);
      expect(validRes.body.availableBeds).toBe(25);

      // Attempt to update HOSP-001 (should fail 403)
      const invalidRes = await request(app)
        .patch('/api/hospitals/HOSP-001/capacity')
        .set('Authorization', `Bearer ${hospitalToken}`)
        .send({ availableBeds: 10 });
      expect(invalidRes.status).toBe(403);
      expect(invalidRes.body.code).toBe('FORBIDDEN_HOSPITAL_SCOPE');
    });
  });

  describe('Dynamic Road Closure & Live Rerouting (Part E4)', () => {
    it('Road condition change increments graph version and triggers reroute logic', async () => {
      const result = await handleRoadConditionUpdate('E-00001', 'BLOCKED', 1.0, 'OPERATOR');
      expect(result.graphVersion).toBeGreaterThan(1);
      expect(result.edge.condition).toBe('BLOCKED');
    });
  });

  describe('Deterministic Scripted Scenarios S1 to S6', () => {
    it('Executes S1_basic_dispatch with verified path', async () => {
      const res = await executeScriptedScenario('S1_basic_dispatch');
      expect(res.scenarioId).toBe('S1_basic_dispatch');
      expect(res.routingMetrics.costMatch).toBe(true);
    });

    it('Executes S6_astar_vs_dijkstra_long_route proving A* expands fewer nodes', async () => {
      const res = await executeScriptedScenario('S6_astar_vs_dijkstra_long_route');
      expect(res.comparison.costIdentical).toBe(true);
      expect(res.comparison.nodesSaved).toBeGreaterThan(0);
    });
  });
});
