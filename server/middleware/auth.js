import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../models/User.js';

/**
 * Verifies JWT token and attaches authenticated user to req.user.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication Required: Bearer token missing or malformed',
        code: 'UNAUTHORIZED'
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    const user = await User.findOne({ userId: decoded.userId, active: true });
    if (!user) {
      return res.status(401).json({
        error: 'Authentication Failed: User record inactive or not found',
        code: 'USER_NOT_FOUND'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Invalid or expired authentication token',
      code: 'TOKEN_INVALID',
      details: err.message
    });
  }
}

/**
 * Enforces admin/dispatcher write permissions.
 * Evaluator users are strictly read-only (AT-16).
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication Required',
      code: 'UNAUTHORIZED'
    });
  }

  if (req.user.role !== config.userRoles.ADMIN) {
    return res.status(403).json({
      error: 'Access Denied: Read-only evaluation account cannot perform mutation operations',
      code: 'FORBIDDEN_READ_ONLY',
      userRole: req.user.role
    });
  }

  next();
}

/**
 * Generates signed JWT for user.
 */
export function generateToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      email: user.email,
      role: user.role
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

export default { requireAuth, requireAdmin, generateToken };
