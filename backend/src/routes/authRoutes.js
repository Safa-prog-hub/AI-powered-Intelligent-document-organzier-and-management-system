/**
 * authRoutes.js — Authentication & profile endpoints.
 */

const express = require('express');
const { register, login, forgotPassword, resetPassword, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authenticate, me);

module.exports = router;
