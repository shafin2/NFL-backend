// Consolidated Admin API handler for Vercel serverless function
const connectDB = require('../../config/database');
const auth = require('../../middleware/auth');

// Import all admin controllers
const {
  login,
  getDashboard
} = require('../../controllers/admin/adminAppSettingsController');

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
    
    // LOGIN ROUTE (no auth required)
    if (url === '/login' && method === 'POST') {
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