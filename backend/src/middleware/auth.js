/**
 * auth.js — JWT authentication middleware (Phase 2)
 *
 * Verifies the `Authorization: Bearer <token>` header, extracts the user id,
 * and attaches it to the Express request object as `req.userId`.
 * Malformed / expired / missing tokens are rejected with 401 Unauthorized.
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_only_secret_change_me_in_production';

/**
 * Express middleware: authenticate the incoming request.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';

  // Expect exactly: "Bearer <token>"
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Unauthorized: missing bearer token' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (!payload || !payload.sub) {
      return res.status(401).json({ error: 'Unauthorized: token payload is invalid' });
    }

    // Attach the authenticated user identity to the request object.
    req.userId = payload.sub; // canonical user identifier (Mongo ObjectId hex)
    req.auth = payload; // full decoded claims (iat, exp, ...)

    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Unauthorized: token expired' });
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Unauthorized: malformed token' });
    }
    // Unknown verification failure — treat as unauthorized, never crash.
    return res.status(401).json({ error: 'Unauthorized: token verification failed' });
  }
}

/** Sign a JWT for a user. Centralised so all callers share one secret+TTL. */
function signToken(userId, options = {}) {
  return jwt.sign({ sub: String(userId) }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    ...options,
  });
}

module.exports = { authenticate, signToken, JWT_SECRET };
