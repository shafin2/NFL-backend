const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const newsSchema = new mongoose.Schema({
  headline: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  published_at: {
    type: Date,
    required: true
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
  image_alt: {
    type: String,
    trim: true
  },
  image_caption: {
    type: String,
    trim: true
  },
  byline: {
    type: String,
    trim: true
  },
  source: {
    type: String,
    required: true,
    enum: ['api', 'manual'],
    default: 'manual'
  },
  api_id: {
    type: String
  },
  type: {
    type: String,
    enum: ['Story', 'Video', 'Photo', 'Breaking'],
    default: 'Story'
  },
  is_premium: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
newsSchema.index({ published_at: -1 });
newsSchema.index({ source: 1, published_at: -1 });
newsSchema.index({ api_id: 1 }, { sparse: true });

// Virtual for excerpt
newsSchema.virtual('excerpt').get(function() {
  return this.description.length > 150 
    ? this.description.substring(0, 150) + '...'
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

// Add pagination plugin
newsSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('News', newsSchema); 