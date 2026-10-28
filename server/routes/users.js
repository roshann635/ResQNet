import express from 'express';
import {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  resetUserPassword,
  deleteUser
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

// All user management routes require admin role
router.use(requireAuth, requireRole('admin'));

router.get('/', listUsers);
router.get('/:id', getUserById);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.post('/:id/reset-password', resetUserPassword);
router.delete('/:id', deleteUser);

export default router;
