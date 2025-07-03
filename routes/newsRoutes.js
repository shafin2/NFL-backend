const express = require('express');
const router = express.Router();
const {
  getNews,
  getFeaturedNews,
  getNewsByCategory,
  getNewsById,
  searchNews
} = require('../controllers/newsController');

// GET /api/news - Get latest news with optional filters
router.get('/news', getNews);

// GET /api/news/featured - Get featured news
router.get('/news/featured', getFeaturedNews);

// GET /api/news/search - Search news articles
router.get('/news/search', searchNews);

// GET /api/news/category/:category - Get news by category
router.get('/news/category/:category', getNewsByCategory);

// GET /api/news/:id - Get news article by ID
router.get('/news/:id', getNewsById);

module.exports = router; 