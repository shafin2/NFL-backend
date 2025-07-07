const DeviceToken = require('../models/DeviceToken');

// Register or update device token
const registerDeviceToken = async (req, res) => {
  try {
    const { token, platform } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Token required' });
    }
    await DeviceToken.findOneAndUpdate({ token }, { platform }, { upsert: true, new: true });
    res.status(200).json({ success: true, data: { token }, message: 'Token registered' });
  } catch (err) {
    console.error('Device token register error', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// -------------- FCM (HTTP v1) implementation ------------------
const { sendMulticast } = require('../services/fcmService');

// Send one-time notification with optional external link (admin protected)
const sendOneTimeNotification = async (req, res) => {
  try {
    const { title, body, link } = req.body;
    if (!title || !body) {
      return res.status(400).json({ success: false, message: 'title and body required' });
    }

    // Collect all stored device tokens (FCM tokens)
    let allTokens = await DeviceToken.find().distinct('token');
    // Remove Expo push tokens to avoid FCM errors
    allTokens = allTokens.filter(t => !(t.startsWith('ExpoPushToken[') || t.startsWith('ExponentPushToken[')));

    if (allTokens.length === 0) {
      return res.status(200).json({ success: true, message: 'No device tokens registered yet.' });
    }

    // FCM batch limit is 500 tokens per request
    const chunk = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
      return out;
    };

    const tokenChunks = chunk(allTokens, 500);
    const results = [];

    for (const tokenChunk of tokenChunks) {
      const response = await sendMulticast(tokenChunk, {
        title,
        body,
        data: link ? { link } : {},
      });
      results.push({ successCount: response.successCount, failureCount: response.failureCount });
      // Log failures for debugging
      response.responses.forEach((r, idx) => {
        if (!r.success) {
          console.error('FCM send error:', r.error?.message, 'token:', tokenChunk[idx]);
        }
      });
    }

    res.status(200).json({ success: true, message: 'Notifications sent', results });
  } catch (err) {
    console.error('Send notification error', err);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

module.exports = { registerDeviceToken, sendOneTimeNotification }; 