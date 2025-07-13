// App settings API endpoint for Vercel serverless function
const { connectDB } = require('../../config/database');
const {
  getAppSettings,
  updateAppSettings
} = require('../../controllers/appSettingsController');

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
    
    // Route handling based on HTTP method
    if (req.method === 'GET') {
      return await getAppSettings(req, res);
    } else if (req.method === 'PUT') {
      return await updateAppSettings(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('App Settings API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 