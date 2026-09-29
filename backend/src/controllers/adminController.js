const User = require('../models/User');
const Document = require('../models/Document');
const ActivityLog = require('../models/ActivityLog');

/**
 * GET /api/admin/stats
 *
 * Returns the main statistics required by the Admin Dashboard.
 */
async function getAdminStats(req, res, next) {
  try {
    const [
      totalUsers,
      totalDocuments,
      completedDocuments,
      processingDocuments,
      failedDocuments,
      categoryStats,
      activityStats,
    ] = await Promise.all([
      User.countDocuments(),

      Document.countDocuments(),

      Document.countDocuments({
        processingStatus: 'completed',
      }),

      Document.countDocuments({
        processingStatus: 'processing',
      }),

      Document.countDocuments({
        processingStatus: 'failed',
      }),

      Document.aggregate([
        {
          $group: {
            _id: {
              $ifNull: ['$metadata.documentCategory', 'Others'],
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),

      ActivityLog.aggregate([
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]),
    ]);

    return res.json({
      success: true,

      stats: {
        totalUsers,
        totalDocuments,
        completedDocuments,
        processingDocuments,
        failedDocuments,
      },

      categories: categoryStats.map((item) => ({
        category: item._id,
        count: item.count,
      })),

      activities: activityStats.map((item) => ({
        action: item._id,
        count: item.count,
      })),
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/activity
 *
 * Returns recent user activity for the Admin Dashboard.
 */
async function getRecentActivity(req, res, next) {
  try {
    const limit = Math.min(
      Math.max(Number(req.query.limit) || 20, 1),
      100
    );

    const activities = await ActivityLog.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json({
      success: true,
      count: activities.length,
      activities,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/users
 *
 * Returns users for the Admin Dashboard.
 */
async function getUsers(req, res, next) {
  try {
    const users = await User.find()
      .select('username email role createdAt')
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getAdminStats,
  getRecentActivity,
  getUsers,
};