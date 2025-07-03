const express = require('express');
const router = express.Router();
const {
  getAppSettings,
  updateAppSettings
} = require('../../controllers/admin/adminAppSettings');

// GET /admin/app-settings - Get current app settings
router.get('/app-settings', getAppSettings);

// PUT /admin/app-settings - Update app settings
router.put('/app-settings', updateAppSettings);

module.exports = router; 