// Notifications API endpoint for Vercel serverless function
const { connectDB } = require('../../config/database');
const {
  registerDeviceToken,
  sendNotification,
  getNotificationHistory
} = require('../../controllers/notificationController');

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
    
    const { url } = req;
    
    // Route handling based on URL path
    if (url.includes('/register')) {
      return await registerDeviceToken(req, res);
    } else if (url.includes('/send')) {
      return await sendNotification(req, res);
    } else if (url.includes('/history')) {
      return await getNotificationHistory(req, res);
    } else {
      return res.status(404).json({ error: 'Notification endpoint not found' });
    }
    
  } catch (error) {
    console.error('Notifications API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
} 