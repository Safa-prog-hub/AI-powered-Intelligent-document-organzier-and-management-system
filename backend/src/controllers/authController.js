/**
 * authController.js — Registration & login handlers (Phase 2 support)
 *
 * Issues signed JWTs after verifying bcrypt password hashes. Passwords are
 * never stored or logged in plaintext.
 */

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken } = require('../middleware/auth');

const BCRYPT_ROUNDS = 12;

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

module.exports = { register, login, me };
