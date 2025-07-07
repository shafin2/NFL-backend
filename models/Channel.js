const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 100
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for name lookup is already created by unique: true
// channelSchema.index({ name: 1 }); // Removing duplicate index

module.exports = mongoose.model('Channel', channelSchema); 