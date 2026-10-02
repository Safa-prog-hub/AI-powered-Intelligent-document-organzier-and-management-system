const User = require('../models/User');

/**
 * Allows access only to users with the admin role.
 *
 * This middleware should be used after authenticate().
 */
async function requireAdmin(req, res, next) {
  try {
    if (!req.userId) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const user = await User.findById(req.userId).select('role');

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized: user not found',
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden: admin access required',
      });
    }

    req.userRole = user.role;

    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { requireAdmin };