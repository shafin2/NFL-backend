// Main matches API endpoint for Vercel serverless function
const { connectDB } = require('../../config/database');
const {
  getMatches,
  getMatchById,
  getLiveMatches,
  getUpcomingMatches,
  getMatchesByWeek
} = require('../../controllers/matchController');

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
    
    const { url, query } = req;
    const { id, week } = query;
    
    // Route handling based on URL path
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
    
  } catch (error) {
    console.error('Matches API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 