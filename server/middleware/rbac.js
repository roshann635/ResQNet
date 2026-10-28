import { AuditLog } from '../models/AuditLog.js';

/**
 * ResQNet Role-Based Access Control (RBAC) Matrix
 * Enforces server-side permissions across all 5 roles:
 *  - citizen
 *  - operator
 *  - hospital_staff
 *  - admin
 *  - evaluator
 */

export const PERMISSIONS = {
  REPORT_EMERGENCY: ['citizen', 'operator', 'admin'],
  VIEW_INCIDENTS: ['citizen', 'operator', 'hospital_staff', 'admin', 'evaluator'],
  CANCEL_INCIDENT: ['citizen', 'operator', 'admin'],
  TRACK_AMBULANCE: ['citizen', 'operator', 'hospital_staff', 'admin', 'evaluator'],
  RUN_ALGORITHM: ['operator', 'admin', 'evaluator'],
  CONFIRM_DISPATCH: ['operator', 'admin'],
  UPDATE_ROAD: ['operator', 'admin'],
  VIEW_FLEET: ['operator', 'hospital_staff', 'admin', 'evaluator'],
  UPDATE_AMBULANCE: ['operator', 'admin'],
  VIEW_HOSPITALS: ['citizen', 'operator', 'hospital_staff', 'admin', 'evaluator'],
  UPDATE_BEDS: ['hospital_staff', 'admin'],
  ACCEPT_REJECT_CASE: ['hospital_staff', 'admin'],
  ALGORITHM_LAB: ['operator', 'admin', 'evaluator'],
  VIEW_ANALYTICS: ['operator', 'hospital_staff', 'admin', 'evaluator'],
  VIEW_AUDIT: ['operator', 'hospital_staff', 'admin', 'evaluator'],
  USER_MANAGEMENT: ['admin'],
  SCENARIO_CONTROL: ['admin'],
  SYSTEM_CONFIG: ['admin', 'evaluator']
};

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication Required: Please sign in with valid credentials',
        code: 'UNAUTHORIZED'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Audit denied attempt
      try {
        await AuditLog.create({
          logId: `AUD-DENIED-${Date.now()}`,
          actorId: req.user.userId || 'UNKNOWN',
          eventType: 'ACCESS_DENIED',
          entityType: 'ENDPOINT',
          entityId: req.originalUrl,
          timestamp: new Date(),
          details: {
            method: req.method,
            userRole: req.user.role,
            requiredRoles: allowedRoles
          },
          outcome: 'FORBIDDEN',
          isSynthetic: true
        });
      } catch (err) {
        // silent audit catch
      }

      if (req.user.role === 'evaluator') {
        return res.status(403).json({
          error: 'Access Denied: Read-only evaluation account cannot perform mutation operations',
          code: 'FORBIDDEN_READ_ONLY',
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });
      }

      return res.status(403).json({
        error: `Forbidden: Role '${req.user.role}' lacks permission for this action`,
        code: 'FORBIDDEN_ROLE',
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
}

export function requirePermission(capability) {
  const allowedRoles = PERMISSIONS[capability] || ['admin'];
  return requireRole(...allowedRoles);
}

export default { requireRole, requirePermission, PERMISSIONS };
