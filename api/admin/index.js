// Consolidated Admin API handler for Vercel serverless function
const connectDB = require('../../config/database');
const auth = require('../../middleware/auth');

// Import all admin controllers
// Note: login and getDashboard are handled directly in this file for Vercel

const {
  getAllNews,
  getNewsById,
  createNews,
  updateNews,
  deleteNews
} = require('../../controllers/admin/adminNewsController');

const {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch
} = require('../../controllers/admin/adminMatchController');

const {
  getAllChannels,
  getChannelById,
  createChannel,
  updateChannel,
  deleteChannel
} = require('../../controllers/admin/adminChannelController');

const {
  sendNotification,
  getNotificationHistory,
  getNotificationStats
} = require('../../controllers/notificationController');

// Import job functions
const nflScheduleJob = require('../../jobs/nflScheduleJob');
const nflNewsJob = require('../../jobs/nflNewsJob');

// Import models for dashboard
const News = require('../../models/News');
const Match = require('../../models/Match');
const Channel = require('../../models/Channel');
const AppSettings = require('../../models/AppSettings');

// Admin login function (Vercel specific)
const login = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Missing token',
        message: 'Admin token is required'
      });
    }

    // Simple token validation (uses environment variable)
    const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'your-admin-token-here';
    
    if (token !== ADMIN_TOKEN) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token',
        message: 'Invalid admin token'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        token: token,
        role: 'admin',
        loginTime: new Date().toISOString()
      },
      message: 'Admin login successful'
    });

  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to process login'
    });
  }
};

// Get admin dashboard data (Vercel specific)
const getDashboard = async (req, res) => {
  try {
    // Get statistics from all collections
    const [newsStats, matchStats, channelStats, appSettings] = await Promise.all([
      News.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            premium: { $sum: { $cond: [{ $eq: ['$is_premium', true] }, 1, 0] } },
            api_news: { $sum: { $cond: [{ $eq: ['$source', 'api'] }, 1, 0] } },
            manual_news: { $sum: { $cond: [{ $eq: ['$source', 'manual'] }, 1, 0] } },
            latest: { $max: '$published_at' }
          }
        }
      ]),
      Match.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            live: { $sum: { $cond: [{ $eq: ['$status', 'live'] }, 1, 0] } },
            upcoming: { $sum: { $cond: [{ $eq: ['$status', 'upcoming'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            latest: { $max: '$scheduled_at' }
          }
        }
      ]),
      Channel.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$is_active', true] }, 1, 0] } }
          }
        }
      ]),
      AppSettings.findOne()
    ]);

    const dashboard = {
      news: newsStats[0] || { total: 0, premium: 0, api_news: 0, manual_news: 0, latest: null },
      matches: matchStats[0] || { total: 0, live: 0, upcoming: 0, completed: 0, latest: null },
      channels: channelStats[0] || { total: 0, active: 0 },
      appSettings: {
        version: appSettings?.app_version || 'Not set',
        maintenance: appSettings?.maintenance?.is_enabled || false,
        features: appSettings?.features || {}
      },
      systemInfo: {
        lastUpdated: new Date().toISOString(),
        serverless: true,
        platform: 'Vercel'
      }
    };

    res.status(200).json({
      success: true,
      data: dashboard,
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
};

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Connect to database
    await connectDB();
    
    const { query, method } = req;
    const { id } = query;
    
    // Extract the path from the URL, removing the /api/admin prefix for routing
    let url = req.url || '/';
    if (url.startsWith('/api/admin')) {
      url = url.substring(10) || '/';
    }
    
    console.log('🔍 Admin Debug - Original URL:', req.url);
    console.log('🔍 Admin Debug - Processed URL:', url, 'Method:', method);
    console.log('🔍 Admin Debug - Request Body:', JSON.stringify(req.body));
    
    // HEALTH CHECK (no auth required)
    if ((url === '/' || url === '/health') && method === 'GET') {
      console.log('✅ Admin health check endpoint hit');
      return res.status(200).json({
        success: true,
        message: 'NFL Backend Admin API is running on Vercel',
        timestamp: new Date().toISOString(),
        endpoints: [
          'POST /api/admin/login',
          'GET /api/admin/dashboard',
          'GET /api/admin/news',
          'POST /api/admin/news',
          'PUT /api/admin/news?id=:id',
          'DELETE /api/admin/news?id=:id',
          'GET /api/admin/matches',
          'POST /api/admin/matches',
          'PUT /api/admin/matches?id=:id',
          'DELETE /api/admin/matches?id=:id',
          'GET /api/admin/channels',
          'POST /api/admin/channels',
          'PUT /api/admin/channels?id=:id',
          'DELETE /api/admin/channels?id=:id',
          'GET /api/admin/cron/status',
          'POST /api/admin/cron/trigger/schedule',
          'POST /api/admin/cron/trigger/news'
        ],
        debug: {
          originalUrl: req.url,
          processedUrl: url,
          method: method
        }
      });
    }
    
    // LOGIN ROUTE (no auth required)
    if (url === '/login' && method === 'POST') {
      console.log('✅ Admin login route matched');
      return await login(req, res);
    }
    
    // All other routes require authentication
    const authResult = await auth(req, res);
    if (!authResult) {
      return; // Auth middleware will handle the response
    }
    
    // DASHBOARD ROUTE
    if (url === '/dashboard' || url === '/') {
      return await getDashboard(req, res);
    }
    
    // CRON STATUS AND TRIGGERS
    if (url === '/cron/status') {
      return res.status(200).json({
        success: true,
        message: 'Manual job triggers available',
        availableJobs: ['schedule', 'news'],
        note: 'Automatic cron jobs disabled for Hobby plan'
      });
    }
    
    if (url === '/cron/trigger/schedule' && method === 'POST') {
      try {
        await nflScheduleJob();
        return res.status(200).json({
          success: true,
          message: 'NFL schedule job triggered successfully'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to trigger schedule job',
          message: error.message
        });
      }
    }
    
    if (url === '/cron/trigger/news' && method === 'POST') {
      try {
        await nflNewsJob();
        return res.status(200).json({
          success: true,
          message: 'NFL news job triggered successfully'
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to trigger news job',
          message: error.message
        });
      }
    }
    
    // NEWS ROUTES
    if (url.startsWith('/news')) {
      if (method === 'GET' && id) {
        return await getNewsById(req, res);
      } else if (method === 'GET') {
        return await getAllNews(req, res);
      } else if (method === 'POST') {
        return await createNews(req, res);
      } else if (method === 'PUT' && id) {
        return await updateNews(req, res);
      } else if (method === 'DELETE' && id) {
        return await deleteNews(req, res);
      }
    }
    
    // MATCH ROUTES
    if (url.startsWith('/matches')) {
      if (method === 'GET' && id) {
        return await getMatchById(req, res);
      } else if (method === 'GET') {
        return await getAllMatches(req, res);
      } else if (method === 'POST') {
        return await createMatch(req, res);
      } else if (method === 'PUT' && id) {
        return await updateMatch(req, res);
      } else if (method === 'DELETE' && id) {
        return await deleteMatch(req, res);
      }
    }
    
    // CHANNEL ROUTES
    if (url.startsWith('/channels')) {
      if (method === 'GET' && id) {
        return await getChannelById(req, res);
      } else if (method === 'GET') {
        return await getAllChannels(req, res);
      } else if (method === 'POST') {
        return await createChannel(req, res);
      } else if (method === 'PUT' && id) {
        return await updateChannel(req, res);
      } else if (method === 'DELETE' && id) {
        return await deleteChannel(req, res);
      }
    }
    
    // NOTIFICATION ROUTES
    if (url.startsWith('/notifications')) {
      if (url.includes('/send') && method === 'POST') {
        return await sendNotification(req, res);
      } else if (url.includes('/history')) {
        return await getNotificationHistory(req, res);
      } else if (url.includes('/stats')) {
        return await getNotificationStats(req, res);
      }
    }
    
    // 404 - Route not found
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested admin endpoint was not found'
    });
    
  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}; 