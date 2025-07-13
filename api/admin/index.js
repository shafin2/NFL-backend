// Consolidated Admin API handler for Vercel serverless function
const connectDB = require('../../config/database');
const { adminLogin } = require('../../middleware/auth');

// Import job functions
const { getJobsStatus } = require('../../jobs');
const { fetchAndProcessNFLSchedule } = require('../../jobs/nflScheduleJob');
const { fetchAndProcessNFLNews } = require('../../jobs/nflNewsJob');
const { updateJobStatus, markJobAsRunning } = require('../../jobs/index');

// Import admin controllers
const {
  getAllNews,
  createNews,
  updateNews,
  deleteNews
} = require('../../controllers/admin/adminNewsController');

const {
  getAllMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  syncMatches
} = require('../../controllers/admin/adminMatchController');

const {
  getAllChannels,
  createChannel,
  updateChannel,
  deleteChannel
} = require('../../controllers/admin/adminChannelController');

const {
  sendBulkNotification,
  getNotificationHistory,
  deleteNotification
} = require('../../controllers/admin/adminNotificationController');

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
    const { url, query, method } = req;
    const { id } = query;
    
    console.log('🔍 Debug - Admin Request URL:', url, 'Method:', method, 'Query:', query);
    
    // LOGIN ROUTE (no auth required)
    if (url === '/login' || url === '/') {
      if (method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      await connectDB();
      return await adminLogin(req, res);
    }
    
    // Connect to database for all other routes
    await connectDB();
    
    // DASHBOARD ROUTE
    if (url === '/dashboard') {
      if (method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      const Match = require('../../models/Match');
      const News = require('../../models/News');
      const Channel = require('../../models/Channel');
      const JobHistory = require('../../models/JobHistory');

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

      return res.status(200).json({
        success: true,
        data: {
          matches: { total: totalMatches, live: liveMatches, replay: replayMatches, upcoming: upcomingMatches },
          news: { total: totalNews },
          channels: { total: totalChannels },
          jobs: { total: totalJobs, running: runningJobs, recentJobs24h: recentJobs24h }
        },
        timestamp: new Date().toISOString()
      });
    }
    
    // CRON STATUS ROUTE
    if (url === '/cron/status') {
      if (method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      const status = getJobsStatus();
      return res.status(200).json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    }
    
    // CRON TRIGGER ROUTES
    if (url === '/cron/trigger/schedule') {
      if (method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      const actualJobName = 'NFL Schedule Fetch';
      await markJobAsRunning(actualJobName);
      console.log(`🔄 Manual trigger: Starting ${actualJobName}...`);
      
      const result = await fetchAndProcessNFLSchedule();
      await updateJobStatus(actualJobName, true, `Manual trigger successful. ${result.message}`);
      
      return res.status(200).json({
        success: true,
        message: `${actualJobName} triggered successfully`,
        jobName: actualJobName,
        result: result,
        timestamp: new Date().toISOString(),
        triggeredBy: 'manual'
      });
    }
    
    if (url === '/cron/trigger/news') {
      if (method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
      }
      
      const actualJobName = 'NFL News Fetch';
      await markJobAsRunning(actualJobName);
      console.log(`🔄 Manual trigger: Starting ${actualJobName}...`);
      
      const result = await fetchAndProcessNFLNews();
      await updateJobStatus(actualJobName, true, `Manual trigger successful. ${result.message}`);
      
      return res.status(200).json({
        success: true,
        message: `${actualJobName} triggered successfully`,
        jobName: actualJobName,
        result: result,
        timestamp: new Date().toISOString(),
        triggeredBy: 'manual'
      });
    }
    
    // NEWS MANAGEMENT ROUTES
    if (url.startsWith('/news')) {
      if (method === 'GET') {
        return await getAllNews(req, res);
      } else if (method === 'POST') {
        return await createNews(req, res);
      } else if (method === 'PUT' && id) {
        return await updateNews(req, res);
      } else if (method === 'DELETE' && id) {
        return await deleteNews(req, res);
      }
    }
    
    // MATCH MANAGEMENT ROUTES
    if (url.startsWith('/matches')) {
      if (url.includes('/sync')) {
        return await syncMatches(req, res);
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
    
    // CHANNEL MANAGEMENT ROUTES
    if (url.startsWith('/channels')) {
      if (method === 'GET') {
        return await getAllChannels(req, res);
      } else if (method === 'POST') {
        return await createChannel(req, res);
      } else if (method === 'PUT' && id) {
        return await updateChannel(req, res);
      } else if (method === 'DELETE' && id) {
        return await deleteChannel(req, res);
      }
    }
    
    // NOTIFICATION MANAGEMENT ROUTES
    if (url.startsWith('/notifications')) {
      if (url.includes('/send') && method === 'POST') {
        return await sendBulkNotification(req, res);
      } else if (method === 'GET') {
        return await getNotificationHistory(req, res);
      } else if (method === 'DELETE' && id) {
        return await deleteNotification(req, res);
      }
    }
    
    // 404 - Route not found
    res.status(404).json({
      error: 'Not Found',
      message: 'The requested admin endpoint was not found'
    });
    
  } catch (error) {
    console.error('Admin API error:', error);
    
    // Update job status if it was a cron job error
    if (req.url.includes('/trigger/')) {
      try {
        const jobName = req.url.includes('schedule') ? 'NFL Schedule Fetch' : 'NFL News Fetch';
        await updateJobStatus(jobName, false, `Manual trigger failed: ${error.message}`);
      } catch (updateError) {
        console.error('Failed to update job status:', updateError);
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 