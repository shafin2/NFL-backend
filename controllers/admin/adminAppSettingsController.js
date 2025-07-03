const AppSettings = require('../../models/AppSettings');

// Get current app settings (admin view)
const getAppSettings = async (req, res) => {
  try {
    const settings = await AppSettings.getCurrentSettings();

    res.status(200).json({
      success: true,
      data: settings,
      message: 'App settings retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching app settings (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch app settings'
    });
  }
};

// Update app settings
const updateAppSettings = async (req, res) => {
  try {
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // Get current settings
    let settings = await AppSettings.findOne();
    
    if (!settings) {
      // Create new settings if none exist
      settings = new AppSettings(updateData);
    } else {
      // Update existing settings
      Object.assign(settings, updateData);
    }

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: 'App settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating app settings:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update app settings'
    });
  }
};

// Update app version
const updateAppVersion = async (req, res) => {
  try {
    const { app_version, force_update, min_supported_version } = req.body;

    if (!app_version) {
      return res.status(400).json({
        success: false,
        error: 'Missing app version',
        message: 'app_version is required'
      });
    }

    const settings = await AppSettings.getCurrentSettings();
    
    settings.app_version = app_version;
    if (force_update !== undefined) settings.force_update = force_update;
    if (min_supported_version) settings.min_supported_version = min_supported_version;

    await settings.save();

    res.status(200).json({
      success: true,
      data: {
        app_version: settings.app_version,
        force_update: settings.force_update,
        min_supported_version: settings.min_supported_version
      },
      message: 'App version updated successfully'
    });

  } catch (error) {
    console.error('Error updating app version:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update app version'
    });
  }
};

// Update ad configuration
const updateAdConfig = async (req, res) => {
  try {
    const { ads } = req.body;

    if (!ads || typeof ads !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid ad config',
        message: 'ads object is required'
      });
    }

    const settings = await AppSettings.getCurrentSettings();
    
    // Update ad settings
    if (ads.enable_banner !== undefined) settings.ads.enable_banner = ads.enable_banner;
    if (ads.enable_interstitial !== undefined) settings.ads.enable_interstitial = ads.enable_interstitial;
    if (ads.banner_frequency !== undefined) settings.ads.banner_frequency = ads.banner_frequency;
    if (ads.interstitial_frequency !== undefined) settings.ads.interstitial_frequency = ads.interstitial_frequency;

    await settings.save();

    res.status(200).json({
      success: true,
      data: {
        ads: settings.ads
      },
      message: 'Ad configuration updated successfully'
    });

  } catch (error) {
    console.error('Error updating ad config:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update ad configuration'
    });
  }
};

// Update maintenance mode
const updateMaintenanceMode = async (req, res) => {
  try {
    const { maintenance } = req.body;

    if (!maintenance || typeof maintenance !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid maintenance config',
        message: 'maintenance object is required'
      });
    }

    const settings = await AppSettings.getCurrentSettings();
    
    // Update maintenance settings
    if (maintenance.is_enabled !== undefined) settings.maintenance.is_enabled = maintenance.is_enabled;
    if (maintenance.message) settings.maintenance.message = maintenance.message;
    if (maintenance.start_time) settings.maintenance.start_time = maintenance.start_time;
    if (maintenance.end_time) settings.maintenance.end_time = maintenance.end_time;

    await settings.save();

    res.status(200).json({
      success: true,
      data: {
        maintenance: settings.maintenance,
        is_maintenance_active: settings.is_maintenance_active
      },
      message: 'Maintenance mode updated successfully'
    });

  } catch (error) {
    console.error('Error updating maintenance mode:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update maintenance mode'
    });
  }
};

// Update feature flags
const updateFeatureFlags = async (req, res) => {
  try {
    const { features } = req.body;

    if (!features || typeof features !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid features config',
        message: 'features object is required'
      });
    }

    const settings = await AppSettings.getCurrentSettings();
    
    // Update feature flags
    if (features.live_streaming !== undefined) settings.features.live_streaming = features.live_streaming;
    if (features.replays !== undefined) settings.features.replays = features.replays;
    if (features.news !== undefined) settings.features.news = features.news;
    if (features.push_notifications !== undefined) settings.features.push_notifications = features.push_notifications;

    await settings.save();

    res.status(200).json({
      success: true,
      data: {
        features: settings.features
      },
      message: 'Feature flags updated successfully'
    });

  } catch (error) {
    console.error('Error updating feature flags:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update feature flags'
    });
  }
};

// Reset app settings to defaults
const resetToDefaults = async (req, res) => {
  try {
    const defaultSettings = {
      app_version: process.env.DEFAULT_APP_VERSION || '1.0.0',
      force_update: false,
      ads: {
        enable_banner: true,
        enable_interstitial: true,
        banner_frequency: 30,
        interstitial_frequency: 180
      },
      maintenance: {
        is_enabled: false,
        message: 'The app is currently under maintenance. Please try again later.'
      },
      features: {
        live_streaming: true,
        replays: true,
        news: true,
        push_notifications: true
      },
      api_config: {
        cache_duration: 300,
        max_results_per_page: 20
      }
    };

    let settings = await AppSettings.findOne();
    
    if (!settings) {
      settings = new AppSettings(defaultSettings);
    } else {
      Object.assign(settings, defaultSettings);
    }

    await settings.save();

    res.status(200).json({
      success: true,
      data: settings,
      message: 'App settings reset to defaults successfully'
    });

  } catch (error) {
    console.error('Error resetting app settings:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to reset app settings'
    });
  }
};

module.exports = {
  getAppSettings,
  updateAppSettings,
  updateAppVersion,
  updateAdConfig,
  updateMaintenanceMode,
  updateFeatureFlags,
  resetToDefaults
}; 