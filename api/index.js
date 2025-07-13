// Consolidated Public API handler for Vercel serverless function
const connectDB = require('../config/database');

// Import all controllers
const {
  getNews,
  getPremiumNews,
  getNewsByType,
  getNewsById,
  searchNews,
  getNewsStats
} = require('../controllers/newsController');

const {
  getMatches,
  getMatchById,
  getLiveMatches,
  getUpcomingMatches,
  getMatchesByWeek
} = require('../controllers/matchController');

const {
  getAppSettings,
  updateAppSettings
} = require('../controllers/appSettingsController');

const {
  registerDeviceToken,
  sendNotification,
  getNotificationHistory
} = require('../controllers/notificationController');

export default async function handler(req, res) {
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
    
    const { url, query, method } = req;
    const { type, id, week } = query;
    
    console.log('🔍 Debug - Request URL:', url, 'Method:', method, 'Query:', query);
    
    // Health check (base route or health)
    if (url === '/' || url === '' || url === '/health') {
      return res.status(200).json({
        status: 'OK',
        message: 'NFL Backend API is running on Vercel',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        serverless: true
      });
    }
    
    // NEWS ROUTES
    if (url.startsWith('/news')) {
      if (url.includes('/premium')) {
        return await getPremiumNews(req, res);
      } else if (url.includes('/search')) {
        return await searchNews(req, res);
      } else if (url.includes('/stats')) {
        return await getNewsStats(req, res);
      } else if (url.includes('/type/') || type) {
        return await getNewsByType(req, res);
      } else if (id) {
        return await getNewsById(req, res);
      } else {
        return await getNews(req, res);
      }
    }
    
    // MATCH ROUTES
    if (url.startsWith('/matches')) {
      if (url.includes('/live')) {
        return await getLiveMatches(req, res);
      } else if (url.includes('/upcoming')) {
        return await getUpcomingMatches(req, res);
      } else if (url.includes('/week/') || week) {
        return await getMatchesByWeek(req, res);
      } else if (id) {
        return await getMatchById(req, res);
      } else {
        return await getMatches(req, res);
      }
    }
    
    // APP SETTINGS ROUTES
    if (url.startsWith('/app-settings')) {
      if (method === 'GET') {
        return await getAppSettings(req, res);
      } else if (method === 'PUT') {
        return await updateAppSettings(req, res);
      }
    }
    
    // NOTIFICATION ROUTES
    if (url.startsWith('/notifications')) {
      if (url.includes('/register')) {
        return await registerDeviceToken(req, res);
      } else if (url.includes('/send')) {
        return await sendNotification(req, res);
      } else if (url.includes('/history')) {
        return await getNotificationHistory(req, res);
      }
    }
    
    // 404 - Route not found
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested endpoint was not found'
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 