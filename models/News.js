const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  news_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  headline: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  image_url: {
    type: String,
    validate: {
      validator: function(v) {
        return !v || /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(v);
      },
      message: 'Invalid image URL format'
    }
  },
  article_link: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Invalid article URL format'
    }
  },
  published_at: {
    type: Date,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true,
    enum: ['api', 'manual'],
    default: 'api'
  },
  category: {
    type: String,
    enum: ['general', 'trade', 'injury', 'game', 'draft', 'playoff'],
    default: 'general'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  is_featured: {
    type: Boolean,
    default: false
  },
  view_count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
newsSchema.index({ published_at: -1 });
newsSchema.index({ source: 1, published_at: -1 });
newsSchema.index({ is_featured: 1, published_at: -1 });
newsSchema.index({ category: 1, published_at: -1 });

// Virtual for excerpt
newsSchema.virtual('excerpt').get(function() {
  return this.description.length > 100 
    ? this.description.substring(0, 100) + '...'
    : this.description;
});

// Virtual for relative time
newsSchema.virtual('time_ago').get(function() {
  const now = new Date();
  const diffMs = now - this.published_at;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
});

module.exports = mongoose.model('News', newsSchema); 