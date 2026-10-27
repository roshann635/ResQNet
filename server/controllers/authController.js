import bcrypt from 'bcryptjs';
import { User, AuditLog } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
        code: 'MISSING_CREDENTIALS'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim(), active: true });
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'AUTH_FAILED'
      });
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      // Audit failed login attempt without sensitive data
      await AuditLog.create({
        logId: `LOG-AUTH-${Date.now()}`,
        actorId: email,
        eventType: 'USER_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user.userId,
        timestamp: new Date(),
        details: { reason: 'Password mismatch' },
        outcome: 'FAILURE',
        isSynthetic: true
      });

      return res.status(401).json({
        error: 'Invalid email or password',
        code: 'AUTH_FAILED'
      });
    }

    const token = generateToken(user);

    // Audit successful login
    await AuditLog.create({
      logId: `LOG-AUTH-${Date.now()}`,
      actorId: user.userId,
      eventType: 'USER_LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.userId,
      timestamp: new Date(),
      details: { role: user.role },
      outcome: 'SUCCESS',
      isSynthetic: true
    });

    res.json({
      token,
      user: {
        userId: user.userId,
        displayName: user.displayName,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
}

export async function getMe(req, res, next) {
  try {
    res.json({
      user: {
        userId: req.user.userId,
        displayName: req.user.displayName,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
}

export default { login, getMe };
