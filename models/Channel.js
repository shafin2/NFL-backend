const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  logo_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(v);
      },
      message: 'Invalid logo URL format'
    }
  },
  is_active: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['sports', 'entertainment', 'news', 'premium'],
    default: 'sports'
  },
  sort_order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for sorting and filtering
channelSchema.index({ is_active: 1, sort_order: 1 });
channelSchema.index({ category: 1, sort_order: 1 });

module.exports = mongoose.model('Channel', channelSchema); 