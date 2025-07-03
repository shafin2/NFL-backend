const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const matchSchema = new mongoose.Schema({
  game_id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  round: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    required: true,
    enum: ['upcoming', 'replay', 'live'],
    default: 'upcoming',
    index: true
  },
  scheduled_at: {
    type: Date,
    required: true,
    index: true
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
    default: 'api'
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
  live_channel_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
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
    venue: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
matchSchema.index({ status: 1, scheduled_at: -1 });
matchSchema.index({ scheduled_at: 1 });
matchSchema.index({ 'metadata.week': 1, 'metadata.season': 1 });

// Virtual for formatted game info
matchSchema.virtual('game_info').get(function() {
  return `${this.away_team} @ ${this.home_team}`;
});

// Pre-save middleware to validate live matches have m3u8_links
matchSchema.pre('save', function(next) {
  if (this.status === 'live' && (!this.m3u8_links || this.m3u8_links.length === 0)) {
    return next(new Error('Live matches must have at least one m3u8 link'));
  }
  next();
});

// Add pagination plugin
matchSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Match', matchSchema); 