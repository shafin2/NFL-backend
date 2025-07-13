// Consolidated Admin API handler for Vercel serverless function
const connectDB = require('../../config/database');
const { adminAuth, adminLogin } = require('../../middleware/auth');

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

// Helper function to parse JSON body in serverless function
const parseBody = async (req) => {
  return new Promise((resolve) => {
    if (req.body && typeof req.body === 'object') {
      // Body is already parsed
      resolve(req.body);
    } else if (req.body && typeof req.body === 'string') {
      // Body is a string, parse it
      try {
        resolve(JSON.parse(req.body));
      } catch (e) {
        resolve({});
      }
    } else {
      // No body
      resolve({});
    }
  });
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
    
    // Parse request body for POST requests
    if (req.method === 'POST' || req.method === 'PUT') {
      req.body = await parseBody(req);
    }
    
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
    
    // LOGIN ROUTE (no auth required) - Use existing adminLogin function
    if (url === '/login' && method === 'POST') {
      console.log('✅ Admin login route matched');
      return await adminLogin(req, res);
    }
    
    // All other routes require authentication
    const authResult = await new Promise((resolve) => {
      adminAuth(req, res, () => {
        resolve(true);
      });
    }).catch(() => false);
    
    if (!authResult) {
      return; // Auth middleware will handle the response
    }
    
    // Import dashboard route from existing admin routes
    if (url === '/dashboard' || url === '/') {
      // Use the existing dashboard logic from routes/admin/index.js
      const Match = require('../../models/Match');
      const News = require('../../models/News');
      const Channel = require('../../models/Channel');
      const JobHistory = require('../../models/JobHistory');

      // Get basic statistics (same as your existing dashboard)
      const [
        totalMatches,
        liveMatches,
        replayMatches,
        upcomingMatches,
        totalNews,
        premiumNews,
        breakingNews,
        totalChannels,
        activeChannels,
        recentJobs
      ] = await Promise.all([
        Match.countDocuments(),
        Match.countDocuments({ status: 'live' }),
        Match.countDocuments({ status: 'replay' }),
        Match.countDocuments({ status: 'upcoming' }),
        News.countDocuments(),
        News.countDocuments({ is_premium: true }),
        News.countDocuments({ type: 'Breaking' }),
        Channel.countDocuments(),
        Channel.countDocuments({ is_active: true }),
        JobHistory.find().sort({ started_at: -1 }).limit(5)
      ]);

      return res.status(200).json({
        success: true,
        data: {
          matches: {
            total: totalMatches,
            live: liveMatches,
            replay: replayMatches,
            upcoming: upcomingMatches
          },
          news: {
            total: totalNews,
            premium: premiumNews,
            breaking: breakingNews
          },
          channels: {
            total: totalChannels,
            active: activeChannels
          },
          recentJobs: recentJobs
        },
        message: 'Dashboard data retrieved successfully'
      });
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