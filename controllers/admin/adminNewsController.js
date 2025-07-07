const News = require('../../models/News');

// Get all news (admin view)
const getAllNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      source,
      type,
      is_premium
    } = req.query;

    const query = {};
    if (source) query.source = source;
    if (type) query.type = type;
    if (is_premium !== undefined) query.is_premium = is_premium === 'true';

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
    console.error('Error fetching news (admin):', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch news'
    });
  }
};

// Create new news article
const createNews = async (req, res) => {
  try {
    const newsData = req.body;

    // Validate required fields
    const requiredFields = ['headline', 'description', 'published_at'];
    const missingFields = requiredFields.filter(field => !newsData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Missing fields: ${missingFields.join(', ')}`
      });
    }

    const newNews = new News({
      ...newsData,
      source: 'manual'
    });

    await newNews.save();

    res.status(201).json({
      success: true,
      data: newNews,
      message: 'News article created successfully'
    });

  } catch (error) {
    console.error('Error creating news:', error);
    
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
      message: 'Unable to create news article'
    });
  }
};

// Update news article
const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const news = await News.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

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
      message: 'News article updated successfully'
    });

  } catch (error) {
    console.error('Error updating news:', error);
    
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
      message: 'Unable to update news article'
    });
  }
};

// Delete news article
const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findByIdAndDelete(id);

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
      message: 'News article deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting news:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to delete news article'
    });
  }
};

// Get single news article (admin view)
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

// Bulk update news articles
const bulkUpdateNews = async (req, res) => {
  try {
    const { ids, updates } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'IDs array is required and must not be empty'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Updates object is required'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete updates._id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const result = await News.updateMany(
      { _id: { $in: ids } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount
      },
      message: `${result.modifiedCount} news articles updated successfully`
    });

  } catch (error) {
    console.error('Error bulk updating news:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to update news articles'
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
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  getNewsById,
  bulkUpdateNews,
  getNewsStats
}; 