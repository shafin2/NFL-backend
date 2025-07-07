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
      week,
      search
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (season) query['metadata.season'] = season;
    if (week) query['metadata.week'] = week;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { home_team: { $regex: search, $options: 'i' } },
        { away_team: { $regex: search, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { scheduled_at: -1 }
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

// Get a single match by ID (admin view)
const getMatchById = async (req, res) => {
  try {
    const match = await Match.findById(req.params.id).lean();

    if (!match) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested match was not found'
      });
    }

    res.status(200).json({
      success: true,
      data: match,
      message: 'Match retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching match by ID (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch match'
    });
  }
};

// Create new match
const createMatch = async (req, res) => {
  try {
    const matchData = req.body;

    // Validate required fields
    const requiredFields = ['title', 'scheduled_at', 'home_team', 'away_team'];
    const missingFields = requiredFields.filter(field => !matchData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Missing fields: ${missingFields.join(', ')}`
      });
    }

    // Validate m3u8_links based on status
    const status = matchData.status || 'upcoming';
    
    if (status === 'upcoming' && matchData.m3u8_links && matchData.m3u8_links.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid m3u8 links',
        message: 'M3U8 links cannot be added for upcoming matches'
      });
    }

    if ((status === 'live' || status === 'replay') && (!matchData.m3u8_links || matchData.m3u8_links.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Missing m3u8 links',
        message: 'M3U8 links are required for live and replay matches'
      });
    }

    const newMatch = new Match({
      ...matchData,
      source: 'manual'
    });

    await newMatch.save();

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

    // Validate m3u8_links based on status
    const status = updateData.status;
    
    if (status === 'upcoming' && updateData.m3u8_links && updateData.m3u8_links.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid m3u8 links',
        message: 'M3U8 links cannot be added for upcoming matches'
      });
    }

    if ((status === 'live' || status === 'replay') && (!updateData.m3u8_links || updateData.m3u8_links.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Missing m3u8 links',
        message: 'M3U8 links are required for live and replay matches'
      });
    }

    const match = await Match.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

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
      data: null,
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

// Get all channels for dropdowns
const getChannelsForDropdown = async (req, res) => {
  try {
    const channels = await Channel.find({}).sort({ name: 1 }).lean();

    res.status(200).json({
      success: true,
      data: channels,
      message: 'Channels retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching channels for dropdown:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch channels'
    });
  }
};

module.exports = {
  getAllMatches,
  getMatchById,
  createMatch,
  updateMatch,
  deleteMatch,
  getChannelsForDropdown
}; 