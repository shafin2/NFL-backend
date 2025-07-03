const Match = require('../models/Match');

// Get upcoming matches (schedule)
const getSchedule = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      week,
      season,
      team
    } = req.query;

    const query = { status: 'upcoming' };
    
    // Add filters if provided
    if (week) query['metadata.week'] = week;
    if (season) query['metadata.season'] = season;
    if (team) {
      query.$or = [
        { home_team: { $regex: team, $options: 'i' } },
        { away_team: { $regex: team, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { scheduled_at: 1 }, // Upcoming matches sorted by time
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
      message: 'Schedule retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch schedule'
    });
  }
};

// Get replay matches
const getReplays = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      week,
      season,
      team
    } = req.query;

    const query = { status: 'replay' };
    
    // Add filters if provided
    if (week) query['metadata.week'] = week;
    if (season) query['metadata.season'] = season;
    if (team) {
      query.$or = [
        { home_team: { $regex: team, $options: 'i' } },
        { away_team: { $regex: team, $options: 'i' } }
      ];
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { scheduled_at: -1 }, // Recent replays first
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
      message: 'Replays retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching replays:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch replays'
    });
  }
};

// Get live matches with m3u8 links
const getLiveMatches = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10
    } = req.query;

    const query = { 
      status: 'live',
      'm3u8_links.0': { $exists: true } // Ensure at least one m3u8 link exists
    };

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

    // Format response to highlight streaming links
    const formattedMatches = matches.docs.map(match => ({
      ...match.toObject(),
      streaming_available: match.m3u8_links.length > 0,
      total_streams: match.m3u8_links.length
    }));

    res.status(200).json({
      success: true,
      data: {
        matches: formattedMatches,
        pagination: {
          current_page: matches.page,
          total_pages: matches.totalPages,
          total_matches: matches.totalDocs,
          has_next: matches.hasNextPage,
          has_prev: matches.hasPrevPage
        }
      },
      message: 'Live matches retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching live matches:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch live matches'
    });
  }
};

// Get match details by ID
const getMatchById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const match = await Match.findById(id)
      .populate('live_channel_ids', 'name description logo_url');

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
      message: 'Match details retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching match details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch match details'
    });
  }
};

module.exports = {
  getSchedule,
  getReplays,
  getLiveMatches,
  getMatchById
}; 