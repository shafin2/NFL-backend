const mongoose = require('mongoose');

const appSettingsSchema = new mongoose.Schema({
  app_version: {
    type: String,
    required: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d+\.\d+\.\d+$/.test(v); // Semantic versioning (x.x.x)
      },
      message: 'App version must follow semantic versioning (e.g., 1.0.0)'
    }
  },
  force_update: {
    type: Boolean,
    default: false
  },
  min_supported_version: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^\d+\.\d+\.\d+$/.test(v);
      },
      message: 'Minimum supported version must follow semantic versioning'
    }
  },
  ads: {
    enable_banner: {
      type: Boolean,
      default: true
    },
    enable_interstitial: {
      type: Boolean,
      default: true
    },
    banner_frequency: {
      type: Number,
      default: 30, // seconds
      min: 10,
      max: 300
    },
    interstitial_frequency: {
      type: Number,
      default: 180, // seconds
      min: 60,
      max: 600
    },
    /**
     * Per-screen ad settings, e.g.
     * per_screen: {
     *   HomeScreen: { banner: true, interstitial: false },
     *   NewsScreen: { banner: true, interstitial: true },
     *   ...
     * }
     */
    per_screen: {
      type: Object,
      default: {
        HomeScreen: { banner: true, interstitial: true },
        LiveScreen: { banner: false, interstitial: true },
        NewsScreen: { banner: true, interstitial: true },
        ReplaysScreen: { banner: true, interstitial: true },
        ScheduleScreen: { banner: true, interstitial: true }
      }
    }
  },
  maintenance: {
    is_enabled: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      trim: true,
      default: 'The app is currently under maintenance. Please try again later.'
    },
    start_time: Date,
    end_time: Date
  },
  features: {
    live_streaming: {
      type: Boolean,
      default: true
    },
    replays: {
      type: Boolean,
      default: true
    },
    news: {
      type: Boolean,
      default: true
    },
    push_notifications: {
      type: Boolean,
      default: true
    }
  },
  api_config: {
    cache_duration: {
      type: Number,
      default: 300, // 5 minutes in seconds
      min: 60,
      max: 3600
    },
    max_results_per_page: {
      type: Number,
      default: 20,
      min: 5,
      max: 100
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Ensure only one settings document exists
appSettingsSchema.index({}, { unique: true });

// Virtual to check if maintenance is currently active
appSettingsSchema.virtual('is_maintenance_active').get(function() {
  if (!this.maintenance.is_enabled) return false;
  
  const now = new Date();
  const startTime = this.maintenance.start_time;
  const endTime = this.maintenance.end_time;
  
  if (!startTime || !endTime) return this.maintenance.is_enabled;
  
  return now >= startTime && now <= endTime;
});

// Static method to get current settings (creates default if none exist)
appSettingsSchema.statics.getCurrentSettings = async function() {
  let settings = await this.findOne();
  
  if (!settings) {
    settings = new this({
      app_version: process.env.DEFAULT_APP_VERSION || '1.0.0'
    });
    await settings.save();
  }
  
  return settings;
};

module.exports = mongoose.model('AppSettings', appSettingsSchema); 