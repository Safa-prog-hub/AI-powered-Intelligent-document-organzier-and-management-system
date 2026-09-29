const express = require('express');

const { authenticate } = require('../middleware/auth');
const { requireAdmin } = require('../middleware/admin');

const {
  getAdminStats,
  getRecentActivity,
  getUsers,
} = require('../controllers/adminController');

const router = express.Router();

/*
 * All admin routes require:
 *
 * 1. A valid JWT
 * 2. The user must have role = "admin"
 */
router.use(authenticate);
router.use(requireAdmin);

// Dashboard statistics
router.get('/stats', getAdminStats);

// Recent activity
router.get('/activity', getRecentActivity);

// Users list
router.get('/users', getUsers);

module.exports = router;