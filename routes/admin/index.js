const express = require('express');
const router = express.Router();
const { adminAuth } = require('../../middleware/auth');

// Import admin route modules
const adminMatchRoutes = require('./adminMatchRoutes');
const adminChannelRoutes = require('./adminChannelRoutes');
const adminNewsRoutes = require('./adminNewsRoutes');
const adminAppSettingsRoutes = require('./adminAppSettingsRoutes');
const adminJobHistoryRoutes = require('./adminJobHistoryRoutes');
const adminNotificationRoutes = require('./adminNotificationRoutes');

// Apply authentication middleware to all admin routes
router.use(adminAuth);

// Admin dashboard info endpoint
router.get('/dashboard', async (req, res) => {
  try {
    const Match = require('../../models/Match');
    const News = require('../../models/News');
    const Channel = require('../../models/Channel');
    const JobHistory = require('../../models/JobHistory');

    // Get basic statistics
    const [
      totalMatches,
      liveMatches,
      replayMatches,
      upcomingMatches,
      totalNews,
      totalChannels,
      totalJobs,
      runningJobs,
      recentJobs24h
    ] = await Promise.all([
      Match.countDocuments(),
      Match.countDocuments({ status: 'live' }),
      Match.countDocuments({ status: 'replay' }),
      Match.countDocuments({ status: 'upcoming' }),
      News.countDocuments(),
      Channel.countDocuments(),
      JobHistory.countDocuments(),
      JobHistory.countDocuments({ status: 'running' }),
      JobHistory.countDocuments({
        started_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        matches: {
          total: totalMatches,
          live: liveMatches,
          replay: replayMatches,
          upcoming: upcomingMatches
        },
        news: {
          total: totalNews
        },
        channels: {
          total: totalChannels
        },
        jobs: {
          total: totalJobs,
          running: runningJobs,
          recent_24h: recentJobs24h
        }
      },
      message: 'Dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch dashboard data'
    });
  }
});

// Mount admin route modules
router.use('/', adminMatchRoutes);
router.use('/', adminChannelRoutes);
router.use('/', adminNewsRoutes);
router.use('/', adminAppSettingsRoutes);
router.use('/jobs', adminJobHistoryRoutes);
router.use('/', adminNotificationRoutes);

module.exports = router; 