// Admin notifications API endpoint for Vercel serverless function
const { connectDB } = require('../../../config/database');
const {
  sendBulkNotification,
  getNotificationHistory,
  deleteNotification
} = require('../../../controllers/admin/adminNotificationController');

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
    
    const { query, method, url } = req;
    const { id } = query;
    
    // Route handling based on HTTP method and parameters
    if (url.includes('/send') && method === 'POST') {
      return await sendBulkNotification(req, res);
    } else if (method === 'GET') {
      return await getNotificationHistory(req, res);
    } else if (method === 'DELETE' && id) {
      return await deleteNotification(req, res);
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
    
  } catch (error) {
    console.error('Admin Notifications API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 