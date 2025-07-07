const News = require('../models/News');

// Get latest news
const getNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      is_premium,
      source
    } = req.query;

    const query = {};
    
    // Add filters if provided
    if (type) query.type = type;
    if (is_premium !== undefined) query.is_premium = is_premium === 'true';
    if (source) query.source = source;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [news, totalCount] = await Promise.all([
      News.find(query)
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      News.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        news,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_news: totalCount,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
          per_page: parseInt(limit)
        }
      },
      message: 'News retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch news'
    });
  }
};

// Get premium news
const getPremiumNews = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const premiumNews = await News.find({ is_premium: true })
      .sort({ published_at: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: premiumNews,
      message: 'Premium news retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching premium news:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch premium news'
    });
  }
};

// Get news by type
const getNewsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const {
      page = 1,
      limit = 20
    } = req.query;

    const validTypes = ['Story', 'Video', 'Photo', 'Breaking'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type',
        message: `Type must be one of: ${validTypes.join(', ')}`
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [news, totalCount] = await Promise.all([
      News.find({ type })
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      News.countDocuments({ type })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        type,
        news,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_news: totalCount,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
          per_page: parseInt(limit)
        }
      },
      message: `${type} news retrieved successfully`
    });

  } catch (error) {
    console.error('Error fetching news by type:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch news by type'
    });
  }
};

// Get news by ID
const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const news = await News.findById(id);

    if (!news) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'News article not found'
      });
    }

    res.status(200).json({
      success: true,
      data: news,
      message: 'News article retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching news by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch news article'
    });
  }
};

// Search news
const searchNews = async (req, res) => {
  try {
    const {
      q: searchQuery,
      page = 1,
      limit = 20
    } = req.query;

    if (!searchQuery) {
      return res.status(400).json({
        success: false,
        error: 'Missing search query',
        message: 'Search query parameter "q" is required'
      });
    }

    const searchRegex = new RegExp(searchQuery, 'i');
    const query = {
      $or: [
        { headline: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { byline: { $regex: searchRegex } }
      ]
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [news, totalCount] = await Promise.all([
      News.find(query)
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      News.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        search_query: searchQuery,
        news,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_news: totalCount,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
          per_page: parseInt(limit)
        }
      },
      message: 'News search completed successfully'
    });

  } catch (error) {
    console.error('Error searching news:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to search news'
    });
  }
};

// Get news statistics
const getNewsStats = async (req, res) => {
  try {
    const stats = await News.aggregate([
      {
        $group: {
          _id: null,
          total_news: { $sum: 1 },
          api_news: { $sum: { $cond: [{ $eq: ['$source', 'api'] }, 1, 0] } },
          manual_news: { $sum: { $cond: [{ $eq: ['$source', 'manual'] }, 1, 0] } },
          premium_news: { $sum: { $cond: [{ $eq: ['$is_premium', true] }, 1, 0] } },
          latest_news: { $max: '$published_at' }
        }
      }
    ]);

    const typeStats = await News.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        general: stats[0] || {
          total_news: 0,
          api_news: 0,
          manual_news: 0,
          premium_news: 0,
          latest_news: null
        },
        by_type: typeStats
      },
      message: 'News statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching news stats:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch news statistics'
    });
  }
};

module.exports = {
  getNews,
  getPremiumNews,
  getNewsByType,
  getNewsById,
  searchNews,
  getNewsStats
}; 