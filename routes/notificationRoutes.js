const express = require('express');
const router = express.Router();
const { registerDeviceToken } = require('../controllers/notificationController');

// POST /api/device-token
router.post('/device-token', registerDeviceToken);

module.exports = router; 