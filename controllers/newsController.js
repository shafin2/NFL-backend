const News = require('../models/News');

// Get latest news
const getNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      featured,
      source
    } = req.query;

    const query = {};
    
    // Add filters if provided
    if (category) query.category = category;
    if (featured !== undefined) query.is_featured = featured === 'true';
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

// Get featured news
const getFeaturedNews = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const featuredNews = await News.find({ is_featured: true })
      .sort({ published_at: -1 })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: featuredNews,
      message: 'Featured news retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching featured news:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch featured news'
    });
  }
};

// Get news by category
const getNewsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const {
      page = 1,
      limit = 20
    } = req.query;

    const validCategories = ['general', 'trade', 'injury', 'game', 'draft', 'playoff'];
    
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [news, totalCount] = await Promise.all([
      News.find({ category })
        .sort({ published_at: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      News.countDocuments({ category })
    ]);

    const totalPages = Math.ceil(totalCount / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        category,
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
      message: `${category} news retrieved successfully`
    });

  } catch (error) {
    console.error('Error fetching news by category:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch news by category'
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

    // Increment view count
    news.view_count += 1;
    await news.save();

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
        { tags: { $in: [searchRegex] } }
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
          total_results: totalCount,
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1,
          per_page: parseInt(limit)
        }
      },
      message: 'Search results retrieved successfully'
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

module.exports = {
  getNews,
  getFeaturedNews,
  getNewsByCategory,
  getNewsById,
  searchNews
}; 