// Admin dashboard endpoint for Vercel serverless function
const { connectDB } = require('../../config/database');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Connect to database
    await connectDB();

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
          recentJobs24h: recentJobs24h
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Admin Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 