/**
 * authController.js — Registration & login handlers (Phase 2 support)
 *
 * Issues signed JWTs after verifying bcrypt password hashes. Passwords are
 * never stored or logged in plaintext.
 */

const bcrypt = require('bcryptjs');
const crypto = require('node:crypto');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/emailService');

const BCRYPT_ROUNDS = 12;
const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

/**
 * POST /api/auth/register
 * Body: { username, email, password }
 */
async function register(req, res, next) {
  try {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required' });
    }
    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Race-safe duplicate check via the unique index; catch below as E11000.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await User.create({ username, email, passwordHash });
    const token = signToken(user._id);

    return res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    // `select: false` on passwordHash requires an explicit projection.
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signToken(user._id);
    return res.json({ success: true, token, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/forgot-password — send a short-lived reset link if known. */
async function forgotPassword(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!email) {
      return res.status(400).json({ error: 'email is required' });
    }

    const user = await User.findOne({ email });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      user.passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
      user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
      await user.save();
      await sendPasswordResetEmail(user.email, token);
    }

    return res.json({
      success: true,
      message: 'If an account exists for that email, a password reset link has been sent.',
    });
  } catch (err) {
    return next(err);
  }
}

/** POST /api/auth/reset-password — consume a valid reset token exactly once. */
async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body || {};
    if (typeof token !== 'string' || !token || typeof password !== 'string') {
      return res.status(400).json({ error: 'token and password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const passwordResetTokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await User.findOneAndUpdate({
      passwordResetTokenHash,
      passwordResetExpires: { $gt: new Date() },
    }, {
      $set: { passwordHash },
      $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 },
    }, { new: true });

    if (!user) {
      return res.status(400).json({ error: 'This password reset link is invalid or has expired' });
    }

    return res.json({ success: true, message: 'Password updated. You can now sign in.' });
  } catch (err) {
    return next(err);
  }
}

/** GET /api/auth/me — resolve the token back to a user profile. */
async function me(req, res, next) {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ success: true, user: user.toJSON() });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, forgotPassword, resetPassword, me };
