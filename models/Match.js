const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const matchSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  round: {
    type: String,
    required: false, // Not directly provided by API
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['upcoming', 'live', 'completed', 'replay'],
    default: 'upcoming',
    index: true
  },
  scheduled_at: {
    type: Date,
    required: true
  },
  home_team: {
    type: String,
    required: true,
    trim: true
  },
  away_team: {
    type: String,
    required: true,
    trim: true
  },
  source: {
    type: String,
    required: true,
    enum: ['api', 'manual'],
    default: 'manual'
  },
  m3u8_links: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+\.m3u8(\?.*)?$/i.test(v);
        },
        message: 'Invalid m3u8 URL format'
      }
    }
  }],
  score: {
    home: {
      type: Number,
      default: 0
    },
    away: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    week: Number,
    season: Number,
    weather: String,
    venue: {
      name: String,
      city: String,
      state: String,
      capacity: Number
    },
    game_type: String, // playoff, regular, etc.
    coverage: String // full, partial, etc.
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
matchSchema.index({ status: 1, scheduled_at: -1 });
matchSchema.index({ 'metadata.week': 1, 'metadata.season': 1 });

// Virtual for formatted game info
matchSchema.virtual('game_info').get(function() {
  return `${this.away_team} @ ${this.home_team}`;
});

// Pre-save middleware for validation
matchSchema.pre('save', function(next) {
  // For live and replay status, m3u8_links are required
  if ((this.status === 'live' || this.status === 'replay') && (!this.m3u8_links || this.m3u8_links.length === 0)) {
    return next(new Error('M3U8 links are required for live and replay matches'));
  }
  
  // For upcoming status, m3u8_links should be empty
  if (this.status === 'upcoming' && this.m3u8_links && this.m3u8_links.length > 0) {
    return next(new Error('M3U8 links cannot be added for upcoming matches'));
  }
  
  next();
});

// Add pagination plugin
matchSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Match', matchSchema); 