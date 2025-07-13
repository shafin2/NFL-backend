// Admin news management API endpoint for Vercel serverless function
const { connectDB } = require('../../../config/database');
const {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  getNewsStats
} = require('../../../controllers/admin/adminNewsController');

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
    
    const { query, method } = req;
    const { id } = query;
    
    // Route handling based on HTTP method and parameters
    if (method === 'GET' && !id) {
      return await getAllNews(req, res);
    } else if (method === 'GET' && id) {
      // Single news item (you may need to implement this in your controller)
      return await getAllNews(req, res);
    } else if (method === 'POST') {
      return await createNews(req, res);
    } else if (method === 'PUT' && id) {
      return await updateNews(req, res);
    } else if (method === 'DELETE' && id) {
      return await deleteNews(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Admin News API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 