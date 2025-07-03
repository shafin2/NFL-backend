const express = require('express');
const router = express.Router();
const {
  getSchedule,
  getReplays,
  getLiveMatches,
  getMatchById
} = require('../controllers/matchController');

// GET /api/schedule - Get upcoming matches
router.get('/schedule', getSchedule);

// GET /api/replays - Get replay matches
router.get('/replays', getReplays);

// GET /api/live - Get live matches with m3u8 links
router.get('/live', getLiveMatches);

// GET /api/matches/:id - Get match details by ID
router.get('/matches/:id', getMatchById);

module.exports = router; 