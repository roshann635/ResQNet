import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';

export async function listUsers(req, res, next) {
  try {
    const { role, active } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (active !== undefined) filter.active = active === 'true';

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUserById(req, res, next) {
  try {
    const { id } = req.params;
    const user = await User.findOne({ userId: id }).select('-passwordHash').lean();
    if (!user) {
      return res.status(404).json({ error: `User ${id} not found`, code: 'NOT_FOUND' });
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function createUser(req, res, next) {
  try {
    const { name, email, password, role = 'citizen', hospitalId = null, phone = '+91 9000000001' } = req.body;
    const actorId = req.user ? req.user.userId : 'ADMIN';

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email, and password are required', code: 'VALIDATION_FAILED' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered', code: 'EMAIL_EXISTS' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const count = await User.countDocuments();
    const userId = `USR-${String(count + 1001).padStart(4, '0')}`;

    const user = new User({
      userId,
      name,
      email,
      passwordHash,
      role,
      hospitalId: role === 'hospital_staff' ? hospitalId : null,
      phone,
      active: true,
      createdAt: new Date(),
      isSynthetic: false
    });

    await user.save();

    await AuditLog.create({
      logId: `LOG-USER-${Date.now()}`,
      actorId,
      eventType: 'USER_CREATED',
      entityType: 'USER',
      entityId: userId,
      timestamp: new Date(),
      details: { email, role, hospitalId },
      outcome: 'SUCCESS',
      isSynthetic: false
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.status(201).json(userObj);
  } catch (err) {
    next(err);
  }
}

export async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, role, hospitalId, active, phone } = req.body;
    const actorId = req.user ? req.user.userId : 'ADMIN';

    const user = await User.findOne({ userId: id });
    if (!user) {
      return res.status(404).json({ error: `User ${id} not found`, code: 'NOT_FOUND' });
    }

    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (hospitalId !== undefined) user.hospitalId = hospitalId;
    if (active !== undefined) user.active = active;
    if (phone !== undefined) user.phone = phone;

    await user.save();

    await AuditLog.create({
      logId: `LOG-USER-UPDATE-${Date.now()}`,
      actorId,
      eventType: 'USER_UPDATED',
      entityType: 'USER',
      entityId: id,
      timestamp: new Date(),
      details: { role, hospitalId, active },
      outcome: 'SUCCESS',
      isSynthetic: user.isSynthetic
    });

    const userObj = user.toObject();
    delete userObj.passwordHash;
    res.json(userObj);
  } catch (err) {
    next(err);
  }
}

export async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const actorId = req.user ? req.user.userId : 'ADMIN';

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'newPassword must be at least 6 characters', code: 'INVALID_PASSWORD' });
    }

    const user = await User.findOne({ userId: id });
    if (!user) {
      return res.status(404).json({ error: `User ${id} not found`, code: 'NOT_FOUND' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    await AuditLog.create({
      logId: `LOG-USER-RESET-${Date.now()}`,
      actorId,
      eventType: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityId: id,
      timestamp: new Date(),
      details: { adminActor: actorId },
      outcome: 'SUCCESS',
      isSynthetic: user.isSynthetic
    });

    res.json({ success: true, message: `Password for ${user.email} successfully reset.` });
  } catch (err) {
    next(err);
  }
}

export async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    const actorId = req.user ? req.user.userId : 'ADMIN';

    const user = await User.findOne({ userId: id });
    if (!user) {
      return res.status(404).json({ error: `User ${id} not found`, code: 'NOT_FOUND' });
    }

    user.active = false; // soft delete / deactivate
    await user.save();

    await AuditLog.create({
      logId: `LOG-USER-DEACTIVATE-${Date.now()}`,
      actorId,
      eventType: 'USER_DEACTIVATED',
      entityType: 'USER',
      entityId: id,
      timestamp: new Date(),
      details: { email: user.email },
      outcome: 'SUCCESS',
      isSynthetic: user.isSynthetic
    });

    res.json({ success: true, message: `User ${id} deactivated.` });
  } catch (err) {
    next(err);
  }
}

export default { listUsers, getUserById, createUser, updateUser, resetUserPassword, deleteUser };
