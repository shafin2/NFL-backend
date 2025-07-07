const AppSettings = require('../models/AppSettings');

// Get current app settings
const getAppSettings = async (req, res) => {
  try {
    const settings = await AppSettings.getCurrentSettings();

    // Format response for mobile app consumption (excluding ads & push config for now)
    const response = {
      app_version: settings.app_version,
      force_update: settings.force_update,
      min_supported_version: settings.min_supported_version,
      maintenance: {
        is_active: settings.maintenance.is_enabled,
        message: settings.maintenance.message,
        start_time: settings.maintenance.start_time,
        end_time: settings.maintenance.end_time
      },
      ads :{
        enable_banner: settings.ads.enable_banner,
        enable_interstitial: settings.ads.enable_interstitial
      },
      features: settings.features,
      api_config: {
        cache_duration: settings.api_config.cache_duration,
        max_results_per_page: settings.api_config.max_results_per_page
      },
      server_time: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: response,
      message: 'App settings retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching app settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch app settings'
    });
  }
};

// Check app version compatibility
const checkVersionCompatibility = async (req, res) => {
  try {
    const { client_version } = req.query;

    if (!client_version) {
      return res.status(400).json({
        success: false,
        error: 'Missing client version',
        message: 'client_version parameter is required'
      });
    }

    const settings = await AppSettings.getCurrentSettings();

    // Helper function to compare versions
    const compareVersions = (v1, v2) => {
      const parts1 = v1.split('.').map(Number);
      const parts2 = v2.split('.').map(Number);
      
      for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const part1 = parts1[i] || 0;
        const part2 = parts2[i] || 0;
        
        if (part1 > part2) return 1;
        if (part1 < part2) return -1;
      }
      return 0;
    };

    const isUpdateRequired = compareVersions(settings.app_version, client_version) > 0;
    const isSupported = !settings.min_supported_version || 
      compareVersions(client_version, settings.min_supported_version) >= 0;

    const response = {
      client_version,
      latest_version: settings.app_version,
      is_update_available: isUpdateRequired,
      force_update: settings.force_update && isUpdateRequired,
      is_supported: isSupported,
      min_supported_version: settings.min_supported_version
    };

    res.status(200).json({
      success: true,
      data: response,
      message: 'Version compatibility checked successfully'
    });

  } catch (error) {
    console.error('Error checking version compatibility:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to check version compatibility'
    });
  }
};

// Get feature flags
const getFeatureFlags = async (req, res) => {
  try {
    const settings = await AppSettings.getCurrentSettings();

    res.status(200).json({
      success: true,
      data: {
        features: settings.features,
        maintenance: {
          is_active: settings.is_maintenance_active,
          message: settings.maintenance.message
        }
      },
      message: 'Feature flags retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch feature flags'
    });
  }
};

// Get ad configuration
const getAdConfig = async (req, res) => {
  try {
    const settings = await AppSettings.getCurrentSettings();

    res.status(200).json({
      success: true,
      data: {
        ads: settings.ads
      },
      message: 'Ad configuration retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching ad configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch ad configuration'
    });
  }
};

module.exports = {
  getAppSettings,
  checkVersionCompatibility,
  getFeatureFlags,
  getAdConfig
}; 