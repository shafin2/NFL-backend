const express = require('express');
const router = express.Router();
const {
  getAllMatches,
  createMatch,
  updateMatch,
  deleteMatch,
  updateReplayUrl,
  updateLiveLinks,
  assignChannels
} = require('../../controllers/admin/adminMatchController');

// GET /admin/matches - Get all matches
router.get('/matches', getAllMatches);

// POST /admin/matches - Create new match
router.post('/matches', createMatch);

// PUT /admin/matches/:id - Update match
router.put('/matches/:id', updateMatch);

// DELETE /admin/matches/:id - Delete match
router.delete('/matches/:id', deleteMatch);

// PUT /admin/matches/:id/replay-url - Add/Update replay URL
router.put('/matches/:id/replay-url', updateReplayUrl);

// PUT /admin/matches/:id/live-links - Add/Update live streaming links
router.put('/matches/:id/live-links', updateLiveLinks);

// PUT /admin/matches/:id/assign-channels - Assign channels to live match
router.put('/matches/:id/assign-channels', assignChannels);

module.exports = router; 