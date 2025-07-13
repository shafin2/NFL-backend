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
    const { type, id, week } = query;
    
    // Extract the path from the URL, removing the /api prefix for routing
    let url = req.url || '/';
    if (url.startsWith('/api')) {
      url = url.substring(4) || '/';
    }
    
    console.log('🔍 Debug - Full Request Object Keys:', Object.keys(req));
    console.log('🔍 Debug - Original URL:', req.url);
    console.log('🔍 Debug - Processed URL:', url);
    console.log('🔍 Debug - Request Method:', method);
    console.log('🔍 Debug - Request Query:', query);
    console.log('🔍 Debug - Request Headers:', req.headers);
    
    // Health check (base route or health)
    if (url === '/' || url === '' || url === '/health' || !url) {
      console.log('✅ Health check endpoint hit');
      return res.status(200).json({
        status: 'OK',
        message: 'NFL Backend API is running on Vercel',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        serverless: true,
        endpoints: {
          mobileApp: [
            '/api/schedule (upcoming matches)',
            '/api/replays (replay matches)',
            '/api/live (live matches)',
            '/api/matches/:id (match details)',
            '/api/news (news list)',
            '/api/news/:id (news details)',
            '/api/app-settings (app configuration)',
            '/api/device-token (register push token)'
          ],
          public: [
            '/api (health check)',
            '/api/news',
            '/api/news/:id',
            '/api/news/premium',
            '/api/news/search',
            '/api/news/stats',
            '/api/matches',
            '/api/matches/:id',
            '/api/matches/live',
            '/api/matches/upcoming',
            '/api/schedule',
            '/api/replays',
            '/api/live',
            '/api/app-settings',
            '/api/device-token',
            '/api/notifications',
            '/api/notifications/register'
          ],
          admin: [
            '/api/admin/login',
            '/api/admin/dashboard',
            '/api/admin/news',
            '/api/admin/matches',
            '/api/admin/channels',
            '/api/admin/notifications',
            '/api/admin/cron/status',
            '/api/admin/cron/trigger/schedule',
            '/api/admin/cron/trigger/news'
          ]
        },
        debug: {
          originalUrl: req.url,
          processedUrl: url,
          method: method
        }
      });
    }
    
    // Parse path parameters from URL (e.g., /news/123 -> resourceId=123)
    const urlParts = url.split('/').filter(part => part);
    const resourceId = urlParts.length > 1 ? urlParts[1] : id;
    
    // MOBILE APP ROUTES - Schedule (alias for upcoming matches)
    if (url.startsWith('/schedule')) {
      console.log('✅ Schedule route matched (mobile app)');
      return await getUpcomingMatches(req, res);
    }
    
    // MOBILE APP ROUTES - Replays (matches with replay status)
    if (url.startsWith('/replays')) {
      console.log('✅ Replays route matched (mobile app)');
      // Filter matches with replay status
      req.query = { ...req.query, status: 'replay' };
      return await getMatches(req, res);
    }
    
    // MOBILE APP ROUTES - Live (alias for live matches)
    if (url === '/live' || url.startsWith('/live?')) {
      console.log('✅ Live route matched (mobile app)');
      return await getLiveMatches(req, res);
    }
    
    // MOBILE APP ROUTES - Device Token Registration
    if (url === '/device-token' && method === 'POST') {
      console.log('✅ Device token route matched (mobile app)');
      return await registerDeviceToken(req, res);
    }

    // NEWS ROUTES
    if (url.startsWith('/news')) {
      console.log('✅ News route matched');
      // Handle /news/:id pattern
      if (method === 'GET' && resourceId && !url.includes('/premium') && !url.includes('/search') && !url.includes('/stats') && !url.includes('/type/')) {
        req.params = { id: resourceId };
        return await getNewsById(req, res);
      }
      else if (url.includes('/premium')) {
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
      console.log('✅ Match route matched');
      // Handle /matches/:id pattern
      if (method === 'GET' && resourceId && !url.includes('/live') && !url.includes('/upcoming') && !url.includes('/week/')) {
        req.params = { id: resourceId };
        return await getMatchById(req, res);
      }
      else if (url.includes('/live')) {
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
      console.log('✅ App settings route matched');
      if (method === 'GET') {
        return await getAppSettings(req, res);
      } else if (method === 'PUT') {
        return await updateAppSettings(req, res);
      }
    }
    
    // NOTIFICATION ROUTES
    if (url.startsWith('/notifications')) {
      console.log('✅ Notification route matched');
      if (url.includes('/register')) {
        return await registerDeviceToken(req, res);
      } else if (url.includes('/send')) {
        return await sendNotification(req, res);
      } else if (url.includes('/history')) {
        return await getNotificationHistory(req, res);
      }
    }
    
    // 404 - Route not found
    console.log('❌ No route matched, returning 404');
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested endpoint was not found',
      debug: {
        url: url,
        method: method,
        availableRoutes: [
          '/ (health check)',
          '/schedule (mobile: upcoming matches)',
          '/replays (mobile: replay matches)', 
          '/live (mobile: live matches)',
          '/news (& /news/:id)',
          '/matches (& /matches/:id)',
          '/app-settings',
          '/device-token (mobile: push tokens)',
          '/notifications'
        ]
      }
    });
    
  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}; 