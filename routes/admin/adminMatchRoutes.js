const express = require('express');
const router = express.Router();
const {
  getAllMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  getMatchById,
  getChannelsForDropdown,
  updateLiveLinks, // new
  updateReplayUrl  // new
} = require('../../controllers/admin/adminMatchController');

// GET /admin/matches - Get all matches
router.get('/matches', getAllMatches);

// GET /admin/matches/channels/dropdown - Get channels for dropdown
router.get('/matches/channels/dropdown', getChannelsForDropdown);

// GET /admin/matches/:id - Get single match by ID
router.get('/matches/:id', getMatchById);

// POST /admin/matches - Create new match
router.post('/matches', createMatch);

// PUT /admin/matches/:id - Update match
router.put('/matches/:id', updateMatch);

// PUT /admin/matches/:id/live-links - Update live streaming links
router.put('/matches/:id/live-links', updateLiveLinks);

// PUT /admin/matches/:id/replay-url - Update replay streaming link
router.put('/matches/:id/replay-url', updateReplayUrl);

// DELETE /admin/matches/:id - Delete match
router.delete('/matches/:id', deleteMatch);

module.exports = router; 