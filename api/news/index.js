// Main news API endpoint for Vercel serverless function
const { connectDB } = require('../../config/database');
const {
  getNews,
  getPremiumNews,
  getNewsByType,
  getNewsById,
  searchNews,
  getNewsStats
} = require('../../controllers/newsController');

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
    const { type, id } = query;
    
    // Route handling based on URL path
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
    
  } catch (error) {
    console.error('News API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 