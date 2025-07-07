const express = require('express');
const router = express.Router();
const {
  getAllNews,
  createNews,
  updateNews,
  deleteNews,
  getNewsById,
  bulkUpdateNews,
  getNewsStats
} = require('../../controllers/admin/adminNewsController');

// GET /admin/news - Get all news
router.get('/news', getAllNews);

// POST /admin/news - Create new news article
router.post('/news', createNews);

// GET /admin/news/:id - Get news by ID
router.get('/news/:id', getNewsById);

// PUT /admin/news/:id - Update news article
router.put('/news/:id', updateNews);

// DELETE /admin/news/:id - Delete news article
router.delete('/news/:id', deleteNews);

// PUT /admin/news/bulk-update - Bulk update news articles
router.put('/news/bulk-update', bulkUpdateNews);

// GET /admin/news/stats - Get news statistics
router.get('/news/stats', getNewsStats);

module.exports = router; 