const mongoose = require('mongoose');

const deviceTokenSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true, trim: true },
  platform: { type: String, enum: ['ios', 'android', 'web'], default: 'android' },
}, { timestamps: true });

module.exports = mongoose.model('DeviceToken', deviceTokenSchema); 