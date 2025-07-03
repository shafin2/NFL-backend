const express = require('express');
const router = express.Router();
const {
  getAllChannels,
  createChannel,
  updateChannel,
  deleteChannel,
  getChannelById
} = require('../../controllers/admin/adminChannelController');

// GET /admin/channels - Get all channels
router.get('/channels', getAllChannels);

// POST /admin/channels - Create new channel
router.post('/channels', createChannel);

// GET /admin/channels/:id - Get channel by ID
router.get('/channels/:id', getChannelById);

// PUT /admin/channels/:id - Update channel
router.put('/channels/:id', updateChannel);

// DELETE /admin/channels/:id - Delete channel
router.delete('/channels/:id', deleteChannel);

module.exports = router; 