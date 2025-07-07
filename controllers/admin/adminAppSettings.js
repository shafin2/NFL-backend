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
    // Clone request body to avoid unintended side-effects
    const updateData = { ...req.body };

    // Remove protected fields if they exist on the payload
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    /*
      Use `findOneAndUpdate` with `upsert` to ensure a single settings
      document is always present. This avoids edge-cases where the initial
      `findOne` returns null and a second document would violate the unique
      index we created on the collection.
      `runValidators` makes sure schema validations are respected, and
      `new: true` returns the updated version to the client.
    */
    const settings = await AppSettings.findOneAndUpdate(
      {},
      updateData,
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true
      }
    );

    return res.status(200).json({
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

    return res.status(500).json({
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