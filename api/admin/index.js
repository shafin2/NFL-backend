// Consolidated Admin API handler for Vercel serverless function
const connectDB = require('../../config/database');
const { adminAuth, adminLogin } = require('../../middleware/auth');
const jwt = require('jsonwebtoken');

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
    
    // All other routes require authentication - Direct implementation for Vercel
    const JWT_SECRET = process.env.JWT_SECRET || 'nfl-admin-secret-key';
    
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : req.headers['x-admin-token']; // Fallback for old token header
    
    console.log('🔍 Auth Debug - Authorization Header:', authHeader);
    console.log('🔍 Auth Debug - Extracted Token:', token ? 'Token present' : 'No token');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access denied',
        message: 'Authentication token required. Please login first.'
      });
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if token is for admin role
      if (decoded.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          message: 'Admin access required'
        });
      }

      // Add user info to request
      req.user = decoded;
      console.log('✅ Authentication successful for user:', decoded.username);
      
    } catch (error) {
      console.error('🔍 Auth Error:', error.name, error.message);
      
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Invalid authentication token'
        });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired',
          message: 'Authentication token has expired. Please login again.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Authentication error',
        message: 'Error validating authentication token'
      });
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
    
    // Parse path parameters from URL (e.g., /admin/matches/123 -> resourceId=123)
    const urlParts = url.split('/').filter(part => part);
    const resourceId = urlParts.length > 1 ? urlParts[1] : id;
    
    // MATCHES ROUTES
    if (url.startsWith('/matches')) {
      // GET /admin/matches/channels/dropdown
      if (url === '/matches/channels/dropdown' && method === 'GET') {
        return await getAllChannels(req, res);
      }
      // GET /admin/matches/:id
      else if (method === 'GET' && resourceId) {
        req.params = { id: resourceId };
        return await getMatchById(req, res);
      }
      // GET /admin/matches
      else if (method === 'GET') {
        return await getAllMatches(req, res);
      }
      // POST /admin/matches
      else if (method === 'POST') {
        return await createMatch(req, res);
      }
      // PUT /admin/matches/:id
      else if (method === 'PUT' && resourceId) {
        req.params = { id: resourceId };
        return await updateMatch(req, res);
      }
      // DELETE /admin/matches/:id
      else if (method === 'DELETE' && resourceId) {
        req.params = { id: resourceId };
        return await deleteMatch(req, res);
      }
    }
    
    // NEWS ROUTES
    else if (url.startsWith('/news')) {
      // GET /admin/news/:id
      if (method === 'GET' && resourceId) {
        req.params = { id: resourceId };
        return await getNewsById(req, res);
      }
      // GET /admin/news
      else if (method === 'GET') {
        return await getAllNews(req, res);
      }
      // POST /admin/news
      else if (method === 'POST') {
        return await createNews(req, res);
      }
      // PUT /admin/news/:id
      else if (method === 'PUT' && resourceId) {
        req.params = { id: resourceId };
        return await updateNews(req, res);
      }
      // DELETE /admin/news/:id
      else if (method === 'DELETE' && resourceId) {
        req.params = { id: resourceId };
        return await deleteNews(req, res);
      }
    }
    
    // CHANNELS ROUTES
    else if (url.startsWith('/channels')) {
      // GET /admin/channels/:id
      if (method === 'GET' && resourceId) {
        req.params = { id: resourceId };
        return await getChannelById(req, res);
      }
      // GET /admin/channels
      else if (method === 'GET') {
        return await getAllChannels(req, res);
      }
      // POST /admin/channels
      else if (method === 'POST') {
        return await createChannel(req, res);
      }
      // PUT /admin/channels/:id
      else if (method === 'PUT' && resourceId) {
        req.params = { id: resourceId };
        return await updateChannel(req, res);
      }
      // DELETE /admin/channels/:id
      else if (method === 'DELETE' && resourceId) {
        req.params = { id: resourceId };
        return await deleteChannel(req, res);
      }
    }
    
    // APP SETTINGS ROUTES
    else if (url.startsWith('/app-settings')) {
      // GET /admin/app-settings
      if (method === 'GET') {
        const { getAppSettings } = require('../../controllers/admin/adminAppSettingsController');
        return await getAppSettings(req, res);
      }
      // PUT /admin/app-settings
      else if (method === 'PUT') {
        const { updateAppSettings } = require('../../controllers/admin/adminAppSettingsController');
        return await updateAppSettings(req, res);
      }
    }
    
    // JOB HISTORY ROUTES
    else if (url.startsWith('/jobs')) {
      const JobHistory = require('../../models/JobHistory');
      
      // GET /admin/jobs/stats
      if (url === '/jobs/stats' && method === 'GET') {
        try {
          const stats = await JobHistory.aggregate([
            {
              $group: {
                _id: null,
                totalJobs: { $sum: 1 },
                completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
                failedJobs: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
                runningJobs: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } }
              }
            }
          ]);
          
          return res.status(200).json({
            success: true,
            data: stats[0] || { totalJobs: 0, completedJobs: 0, failedJobs: 0, runningJobs: 0 },
            message: 'Job statistics retrieved successfully'
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Unable to fetch job statistics'
          });
        }
      }
      // GET /admin/jobs/api-stats
      else if (url === '/jobs/api-stats' && method === 'GET') {
        return res.status(200).json({
          success: true,
          data: { message: 'API stats functionality coming soon' },
          message: 'API statistics retrieved successfully'
        });
      }
      // POST /admin/jobs/api-stats/reset
      else if (url === '/jobs/api-stats/reset' && method === 'POST') {
        return res.status(200).json({
          success: true,
          message: 'API statistics reset successfully'
        });
      }
      // POST /admin/jobs/trigger
      else if (url === '/jobs/trigger' && method === 'POST') {
        const { jobName } = req.body;
        try {
          if (jobName === 'schedule') {
            await nflScheduleJob();
          } else if (jobName === 'news') {
            await nflNewsJob();
          } else {
            return res.status(400).json({
              success: false,
              error: 'Invalid job name',
              message: 'Job name must be either "schedule" or "news"'
            });
          }
          
          return res.status(200).json({
            success: true,
            message: `${jobName} job triggered successfully`
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Job trigger failed',
            message: error.message
          });
        }
      }
      // DELETE /admin/jobs/cleanup
      else if (url === '/jobs/cleanup' && method === 'DELETE') {
        try {
          const { olderThanDays = 30 } = req.body;
          const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
          
          const result = await JobHistory.deleteMany({
            started_at: { $lt: cutoffDate },
            status: { $in: ['completed', 'failed'] }
          });
          
          return res.status(200).json({
            success: true,
            data: { deletedCount: result.deletedCount },
            message: `Cleaned up ${result.deletedCount} old job records`
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Cleanup failed',
            message: error.message
          });
        }
      }
      // PUT /admin/jobs/:id/cancel (handle the /cancel suffix)
      else if (url.includes('/cancel') && method === 'PUT') {
        const jobId = url.split('/')[1]; // Extract ID from URL like /jobs/123/cancel
        try {
          const job = await JobHistory.findByIdAndUpdate(
            jobId,
            { 
              status: 'cancelled',
              completed_at: new Date(),
              result: { success: false, message: 'Job cancelled by admin' }
            },
            { new: true }
          );
          
          if (!job) {
            return res.status(404).json({
              success: false,
              error: 'Not found',
              message: 'Job not found'
            });
          }
          
          return res.status(200).json({
            success: true,
            data: job,
            message: 'Job cancelled successfully'
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Unable to cancel job'
          });
        }
      }
      // GET /admin/jobs/:id
      else if (method === 'GET' && resourceId) {
        try {
          const job = await JobHistory.findById(resourceId);
          if (!job) {
            return res.status(404).json({
              success: false,
              error: 'Not found',
              message: 'Job not found'
            });
          }
          
          return res.status(200).json({
            success: true,
            data: job,
            message: 'Job details retrieved successfully'
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Unable to fetch job details'
          });
        }
      }
      // GET /admin/jobs
      else if (method === 'GET') {
        try {
          const { page = 1, limit = 20, status, jobName } = query;
          const queryFilter = {};
          
          if (status) queryFilter.status = status;
          if (jobName) queryFilter.job_name = jobName;
          
          const skip = (parseInt(page) - 1) * parseInt(limit);
          
          const [jobs, totalCount] = await Promise.all([
            JobHistory.find(queryFilter)
              .sort({ started_at: -1 })
              .skip(skip)
              .limit(parseInt(limit)),
            JobHistory.countDocuments(queryFilter)
          ]);
          
          return res.status(200).json({
            success: true,
            data: {
              jobs,
              pagination: {
                current_page: parseInt(page),
                total_pages: Math.ceil(totalCount / parseInt(limit)),
                total_jobs: totalCount,
                per_page: parseInt(limit)
              }
            },
            message: 'Job history retrieved successfully'
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: 'Unable to fetch job history'
          });
        }
      }
    }
    
    // CRON ROUTES
    else if (url.startsWith('/cron')) {
      // GET /admin/cron/status
      if (url === '/cron/status' && method === 'GET') {
        return res.status(200).json({
          success: true,
          message: 'Manual job triggers available',
          availableJobs: ['schedule', 'news'],
          note: 'Automatic cron jobs disabled for Hobby plan'
        });
      }
      // POST /admin/cron/trigger/:jobName
      else if (url.startsWith('/cron/trigger/') && method === 'POST') {
        const jobName = url.split('/cron/trigger/')[1];
        try {
          if (jobName === 'schedule') {
            await nflScheduleJob();
          } else if (jobName === 'news') {
            await nflNewsJob();
          } else {
            return res.status(400).json({
              success: false,
              error: 'Invalid job name',
              message: 'Job name must be either "schedule" or "news"'
            });
          }
          
          return res.status(200).json({
            success: true,
            message: `${jobName} job triggered successfully`
          });
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Job trigger failed',
            message: error.message
          });
        }
      }
    }
    
    // NOTIFICATIONS ROUTES
    else if (url.startsWith('/notifications')) {
      // POST /admin/notifications/send
      if (url === '/notifications/send' && method === 'POST') {
        return await sendNotification(req, res);
      }
    }
    
    // 404 - Route not found
    res.status(404).json({
      success: false,
      error: 'Not Found',
      message: 'The requested admin endpoint was not found',
      availableEndpoints: [
        'POST /admin/login',
        'GET /admin/dashboard',
        'GET /admin/matches',
        'POST /admin/matches',
        'GET /admin/matches/:id',
        'PUT /admin/matches/:id',
        'DELETE /admin/matches/:id',
        'GET /admin/matches/channels/dropdown',
        'GET /admin/news',
        'POST /admin/news',
        'GET /admin/news/:id',
        'PUT /admin/news/:id',
        'DELETE /admin/news/:id',
        'GET /admin/channels',
        'POST /admin/channels',
        'GET /admin/channels/:id',
        'PUT /admin/channels/:id',
        'DELETE /admin/channels/:id',
        'GET /admin/app-settings',
        'PUT /admin/app-settings',
        'GET /admin/jobs',
        'GET /admin/jobs/:id',
        'PUT /admin/jobs/:id/cancel',
        'GET /admin/jobs/stats',
        'GET /admin/jobs/api-stats',
        'POST /admin/jobs/api-stats/reset',
        'POST /admin/jobs/trigger',
        'DELETE /admin/jobs/cleanup',
        'GET /admin/cron/status',
        'POST /admin/cron/trigger/:jobName',
        'POST /admin/notifications/send'
      ]
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