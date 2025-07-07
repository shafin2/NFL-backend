const express = require('express');
const router = express.Router();
const {
  getNews,
  getPremiumNews,
  getNewsByType,
  getNewsById,
  searchNews,
  getNewsStats
} = require('../controllers/newsController');

// GET /api/news - Get latest news with optional filters
router.get('/news', getNews);

// GET /api/news/premium - Get premium news
router.get('/news/premium', getPremiumNews);

// GET /api/news/search - Search news articles
router.get('/news/search', searchNews);

// GET /api/news/type/:type - Get news by type
router.get('/news/type/:type', getNewsByType);

// GET /api/news/stats - Get news statistics
router.get('/news/stats', getNewsStats);

// GET /api/news/:id - Get news article by ID
router.get('/news/:id', getNewsById);

module.exports = router; 