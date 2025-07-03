const Channel = require('../../models/Channel');

// Get all channels
const getAllChannels = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      is_active
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (is_active !== undefined) query.is_active = is_active === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [channels, totalCount] = await Promise.all([
      Channel.find(query)
        .sort({ sort_order: 1, name: 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Channel.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        channels,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_channels: totalCount,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
          per_page: parseInt(limit)
        }
      },
      message: 'Channels retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching channels (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch channels'
    });
  }
};

// Create new channel
const createChannel = async (req, res) => {
  try {
    const channelData = req.body;

    // Validate required fields
    if (!channelData.name) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field',
        message: 'Channel name is required'
      });
    }

    // Check if channel name already exists
    const existingChannel = await Channel.findOne({ 
      name: { $regex: `^${channelData.name.trim()}$`, $options: 'i' } 
    });
    
    if (existingChannel) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate channel name',
        message: 'A channel with this name already exists'
      });
    }

    const newChannel = new Channel(channelData);
    await newChannel.save();

    res.status(201).json({
      success: true,
      data: newChannel,
      message: 'Channel created successfully'
    });

  } catch (error) {
    console.error('Error creating channel:', error);
    
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
      message: 'Unable to create channel'
    });
  }
};

// Update channel
const updateChannel = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // If name is being updated, check for duplicates
    if (updateData.name) {
      const existingChannel = await Channel.findOne({
        _id: { $ne: id },
        name: { $regex: `^${updateData.name.trim()}$`, $options: 'i' }
      });

      if (existingChannel) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate channel name',
          message: 'A channel with this name already exists'
        });
      }
    }

    const channel = await Channel.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Channel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: channel,
      message: 'Channel updated successfully'
    });

  } catch (error) {
    console.error('Error updating channel:', error);
    
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
      message: 'Unable to update channel'
    });
  }
};

// Delete channel
const deleteChannel = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if channel is assigned to any matches
    const Match = require('../../models/Match');
    const matchesUsingChannel = await Match.countDocuments({
      live_channel_ids: id
    });

    if (matchesUsingChannel > 0) {
      return res.status(409).json({
        success: false,
        error: 'Channel in use',
        message: `Cannot delete channel. It is assigned to ${matchesUsingChannel} match(es)`
      });
    }

    const channel = await Channel.findByIdAndDelete(id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Channel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { deleted_channel_id: id },
      message: 'Channel deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to delete channel'
    });
  }
};

// Get channel by ID
const getChannelById = async (req, res) => {
  try {
    const { id } = req.params;

    const channel = await Channel.findById(id);

    if (!channel) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Channel not found'
      });
    }

    res.status(200).json({
      success: true,
      data: channel,
      message: 'Channel retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch channel'
    });
  }
};

module.exports = {
  getAllChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelById
}; 