const express = require('express');
const router = express.Router();
const {
  getAppSettings,
  checkVersionCompatibility,
  getFeatureFlags,
  getAdConfig
} = require('../controllers/appSettingsController');

// GET /api/app-settings - Get current app settings
router.get('/app-settings', getAppSettings);

// GET /api/app-settings/version-check - Check version compatibility
router.get('/app-settings/version-check', checkVersionCompatibility);

// GET /api/app-settings/features - Get feature flags
router.get('/app-settings/features', getFeatureFlags);

// GET /api/app-settings/ads - Get ad configuration
router.get('/app-settings/ads', getAdConfig);

module.exports = router; 