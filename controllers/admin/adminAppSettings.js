const AppSettings = require('../../models/AppSettings');

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

const updateAppSettings = async (req, res) => {
  try {
    const updateData = req.body;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    let settings = await AppSettings.findOne();
    
    if (!settings) {
      settings = new AppSettings(updateData);
    } else {
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

module.exports = {
  getAppSettings,
  updateAppSettings
}; 