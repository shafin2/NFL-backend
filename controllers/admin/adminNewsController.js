const News = require('../../models/News');

// Get all news (admin view)
const getAllNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      source,
      is_featured
    } = req.query;

    const query = {};
    if (category) query.category = category;
    if (source) query.source = source;
    if (is_featured !== undefined) query.is_featured = is_featured === 'true';

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
    const requiredFields = ['news_id', 'headline', 'description', 'article_link', 'published_at'];
    const missingFields = requiredFields.filter(field => !newsData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: `Missing fields: ${missingFields.join(', ')}`
      });
    }

    // Check if news_id already exists
    const existingNews = await News.findOne({ news_id: newsData.news_id });
    if (existingNews) {
      return res.status(409).json({
        success: false,
        error: 'Duplicate news_id',
        message: 'A news article with this news_id already exists'
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
    delete updateData.view_count; // Don't allow direct manipulation of view count

    // If news_id is being updated, check for duplicates
    if (updateData.news_id) {
      const existingNews = await News.findOne({
        _id: { $ne: id },
        news_id: updateData.news_id
      });

      if (existingNews) {
        return res.status(409).json({
          success: false,
          error: 'Duplicate news_id',
          message: 'A news article with this news_id already exists'
        });
      }
    }

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
      data: { deleted_news_id: id },
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

// Get news article by ID
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
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch news article'
    });
  }
};

// Toggle featured status
const toggleFeatured = async (req, res) => {
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

    news.is_featured = !news.is_featured;
    await news.save();

    res.status(200).json({
      success: true,
      data: news,
      message: `News article ${news.is_featured ? 'featured' : 'unfeatured'} successfully`
    });

  } catch (error) {
    console.error('Error toggling featured status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to toggle featured status'
    });
  }
};

// Bulk update news (for batch operations)
const bulkUpdateNews = async (req, res) => {
  try {
    const { ids, update_data } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid IDs',
        message: 'ids array is required and must contain at least one ID'
      });
    }

    if (!update_data || typeof update_data !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Invalid update data',
        message: 'update_data object is required'
      });
    }

    // Remove fields that shouldn't be updated directly
    delete update_data._id;
    delete update_data.news_id;
    delete update_data.createdAt;
    delete update_data.updatedAt;
    delete update_data.view_count;

    const result = await News.updateMany(
      { _id: { $in: ids } },
      update_data,
      { runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: {
        matched_count: result.matchedCount,
        modified_count: result.modifiedCount
      },
      message: `Bulk update completed. ${result.modifiedCount} articles updated.`
    });

  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to perform bulk update'
    });
  }
};

module.exports = {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  getNewsById,
  toggleFeatured,
  bulkUpdateNews
}; 