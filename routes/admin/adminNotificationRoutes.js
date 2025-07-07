const express = require('express');
const router = express.Router();
const { sendOneTimeNotification } = require('../../controllers/notificationController');

// POST /admin/notifications/send
router.post('/notifications/send', sendOneTimeNotification);

module.exports = router; 