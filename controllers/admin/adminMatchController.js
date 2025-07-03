const Match = require('../../models/Match');
const Channel = require('../../models/Channel');

// Get all matches (admin view)
const getAllMatches = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      status,
      season,
      week
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (season) query['metadata.season'] = season;
    if (week) query['metadata.week'] = week;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { scheduled_at: -1 },
      populate: {
        path: 'live_channel_ids',
        select: 'name description logo_url'
      }
    };

    const matches = await Match.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        matches: matches.docs,
        pagination: {
          current_page: matches.page,
          total_pages: matches.totalPages,
          total_matches: matches.totalDocs,
          has_next: matches.hasNextPage,
          has_prev: matches.hasPrevPage
        }
      },
      message: 'Matches retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching matches (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch matches'
    });
  }
};

// Create new match
const createMatch = async (req, res) => {
  try {
    const matchData = req.body;

    // Validate required fields
    const requiredFields = ['game_id', 'title', 'round', 'scheduled_at', 'home_team', 'away_team'];
    const missingFields = requiredFields.filter(field => !matchData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Missing fields: ${missingFields.join(', ')}`
      });
    }

    // Check if game_id already exists
    const existingMatch = await Match.findOne({ game_id: matchData.game_id });
    if (existingMatch) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate game_id',
        message: 'A match with this game_id already exists'
      });
    }

    const newMatch = new Match({
      ...matchData,
      source: 'manual'
    });

    await newMatch.save();
    await newMatch.populate('live_channel_ids', 'name description logo_url');

    res.status(201).json({
      success: true,
      data: newMatch,
      message: 'Match created successfully'
    });

  } catch (error) {
    console.error('Error creating match:', error);
    
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
      message: 'Unable to create match'
    });
  }
};

// Update match
const updateMatch = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const match = await Match.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('live_channel_ids', 'name description logo_url');

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match,
      message: 'Match updated successfully'
    });

  } catch (error) {
    console.error('Error updating match:', error);
    
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
      message: 'Unable to update match'
    });
  }
};

// Delete match
const deleteMatch = async (req, res) => {
  try {
    const { id } = req.params;

    const match = await Match.findByIdAndDelete(id);

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Match not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { deleted_match_id: id },
      message: 'Match deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting match:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to delete match'
    });
  }
};

// Add/Update replay URL
const updateReplayUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing URL',
        message: 'Replay URL is required'
      });
    }

    // Validate m3u8 URL format
    if (!/^https?:\/\/.+\.m3u8(\?.*)?$/i.test(url)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format',
        message: 'URL must be a valid m3u8 link'
      });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Match not found'
      });
    }

    // Add or update replay link
    match.m3u8_links = [{ name: 'Replay', url }];
    match.status = 'replay';
    
    await match.save();
    await match.populate('live_channel_ids', 'name description logo_url');

    res.status(200).json({
      success: true,
      data: match,
      message: 'Replay URL updated successfully'
    });

  } catch (error) {
    console.error('Error updating replay URL:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update replay URL'
    });
  }
};

// Add/Update live streaming links
const updateLiveLinks = async (req, res) => {
  try {
    const { id } = req.params;
    const { links } = req.body;

    if (!links || !Array.isArray(links) || links.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid links',
        message: 'Links array is required and must contain at least one link'
      });
    }

    // Validate each link
    for (const link of links) {
      if (!link.name || !link.url) {
        return res.status(400).json({
          success: false,
          error: 'Invalid link format',
          message: 'Each link must have name and url'
        });
      }
      
      if (!/^https?:\/\/.+\.m3u8(\?.*)?$/i.test(link.url)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid URL format',
          message: `Invalid m3u8 URL: ${link.url}`
        });
      }
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Match not found'
      });
    }

    // Update live streaming links
    match.m3u8_links = links;
    match.status = 'live';
    
    await match.save();
    await match.populate('live_channel_ids', 'name description logo_url');

    res.status(200).json({
      success: true,
      data: match,
      message: 'Live streaming links updated successfully'
    });

  } catch (error) {
    console.error('Error updating live links:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update live streaming links'
    });
  }
};

// Assign channels to live match
const assignChannels = async (req, res) => {
  try {
    const { id } = req.params;
    const { channel_ids } = req.body;

    if (!channel_ids || !Array.isArray(channel_ids)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid channel IDs',
        message: 'channel_ids array is required'
      });
    }

    // Validate that all channel IDs exist
    const channels = await Channel.find({ _id: { $in: channel_ids } });
    if (channels.length !== channel_ids.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid channels',
        message: 'One or more channel IDs are invalid'
      });
    }

    const match = await Match.findById(id);
    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Match not found'
      });
    }

    // Assign channels
    match.live_channel_ids = channel_ids;
    await match.save();
    await match.populate('live_channel_ids', 'name description logo_url');

    res.status(200).json({
      success: true,
      data: match,
      message: 'Channels assigned successfully'
    });

  } catch (error) {
    console.error('Error assigning channels:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to assign channels'
    });
  }
};

module.exports = {
  getAllMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  updateReplayUrl,
  updateLiveLinks,
  assignChannels
}; 