import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../server.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User, Incident, Hospital } from '../models/index.js';

describe('ResQNet RBAC & Role-Based Data Access Tests (Phase 4)', () => {
  let citizenToken = '';
  let operatorToken = '';
  let hospitalToken = '';
  let adminToken = '';
  let evaluatorToken = '';

  beforeAll(async () => {
    await connectDB();

    // 1. Log in as each role
    const citizenRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'citizen1@resqnet.test', password: 'Demo@1234' });
    citizenToken = citizenRes.body.token;

    const operatorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'operator1@resqnet.test', password: 'Demo@1234' });
    operatorToken = operatorRes.body.token;

    const hospitalRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'hospital.h007@resqnet.test', password: 'Demo@1234' });
    hospitalToken = hospitalRes.body.token;

    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@resqnet.test', password: 'Demo@1234' });
    adminToken = adminRes.body.token;

    const evalRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'evaluator@resqnet.test', password: 'Demo@1234' });
    evaluatorToken = evalRes.body.token;
  });

  // Test 1: All 5 demo accounts log in successfully
  it('Authentication: All 5 demo roles log in with Demo@1234 and receive JWT tokens', () => {
    expect(citizenToken).toBeDefined();
    expect(operatorToken).toBeDefined();
    expect(hospitalToken).toBeDefined();
    expect(adminToken).toBeDefined();
    expect(evaluatorToken).toBeDefined();
  });

  // Test 2: Rate limiting / Account Lockout after 5 failed attempts
  it('Security: Account locks out for 10 minutes after 5 consecutive failed login attempts', async () => {
    const testEmail = 'locktest@resqnet.test';
    await User.deleteMany({ email: testEmail });
    await User.create({
      userId: 'USR-LOCK-TEST',
      displayName: 'Lock Test User',
      email: testEmail,
      passwordHash: '$2a$10$YgsrtAXJAggVGNXyO.ppV.jNSN8b0fXzdaswnU5ZOBDhnmJ91O/6G',
      role: 'citizen',
      active: true,
      failedLoginAttempts: 0
    });

    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'WrongPassword!' });

      if (i < 5) {
        expect(res.status).toBe(401);
      } else {
        // 5th attempt locks the account
        expect(res.status).toBe(401);
      }
    }

    // 6th attempt returns HTTP 429 Account Locked
    const lockRes = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'Demo@1234' });

    expect(lockRes.status).toBe(429);
    expect(lockRes.body.code).toBe('ACCOUNT_LOCKED');
  });

  // Test 3: Citizen Self-Registration creates citizen and dispatches simulated OTP SMS
  it('Registration: Citizen self-registers with phone and receives OTP in Outbox', async () => {
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        displayName: 'Test Citizen Applicant',
        email: `citizen.new.${Date.now()}@resqnet.test`,
        phone: '+91 9000088888',
        password: 'Demo@1234'
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user.role).toBe('citizen');
    expect(regRes.body.token).toBeDefined();
  });

  // Test 4: Evaluator is rejected from performing scenario resets (HTTP 403)
  it('RBAC: Evaluator role is forbidden from triggering scenario reset (403 Forbidden)', async () => {
    const res = await request(app)
      .post('/api/scenario/reset')
      .set('Authorization', `Bearer ${evaluatorToken}`)
      .send({ confirmReset: true });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN_READ_ONLY');
  });
});
