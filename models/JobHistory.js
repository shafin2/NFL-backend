const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

const jobHistorySchema = new mongoose.Schema({
  job_name: {
    type: String,
    required: true,
    enum: ['nfl_schedule_fetch', 'nfl_news_fetch', 'manual_test'],
    index: true
  },
  job_type: {
    type: String,
    required: true,
    enum: ['scheduled', 'manual'],
    default: 'scheduled'
  },
  status: {
    type: String,
    required: true,
    enum: ['running', 'completed', 'failed', 'cancelled'],
    default: 'running',
    index: true
  },
  started_at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  completed_at: {
    type: Date
  },
  duration_ms: {
    type: Number // Duration in milliseconds
  },
  result: {
    success: Boolean,
    processed: Number,
    upserted: Number,
    skipped: Number,
    errors: Number,
    message: String
  },
  api_calls: [{
    service: {
      type: String,
      required: true,
      enum: ['rapidapi_nfl_news', 'sportsblaze_schedule']
    },
    endpoint: String,
    method: {
      type: String,
      default: 'GET'
    },
    status_code: Number,
    response_time_ms: Number,
    timestamp: {
      type: Date,
      default: Date.now
    },
    success: Boolean,
    error_message: String
  }],
  logs: [{
    level: {
      type: String,
      enum: ['info', 'warn', 'error', 'debug'],
      default: 'info'
    },
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    data: mongoose.Schema.Types.Mixed
  }],
  triggered_by: {
    type: String,
    enum: ['cron', 'admin_manual', 'api_manual'],
    default: 'cron'
  },
  admin_user_id: {
    type: String // For manual triggers by admin
  },
  server_info: {
    node_version: String,
    memory_usage: {
      rss: Number,
      heapTotal: Number,
      heapUsed: Number,
      external: Number
    },
    cpu_usage: Number
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
jobHistorySchema.index({ job_name: 1, started_at: -1 });
jobHistorySchema.index({ status: 1, started_at: -1 });
jobHistorySchema.index({ triggered_by: 1, started_at: -1 });

// Virtual for formatted duration
jobHistorySchema.virtual('duration_formatted').get(function() {
  if (!this.duration_ms) return 'N/A';
  
  const seconds = Math.floor(this.duration_ms / 1000);
  const minutes = Math.floor(seconds / 60);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
});

// Virtual for execution status
jobHistorySchema.virtual('execution_status').get(function() {
  if (this.status === 'running') {
    const runningTime = Date.now() - this.started_at.getTime();
    return `Running for ${Math.floor(runningTime / 1000)}s`;
  }
  return this.status;
});

// Method to add log entry
jobHistorySchema.methods.addLog = async function(level, message, data = null) {
  const logEntry = {
    level,
    message,
    data,
    timestamp: new Date()
  };
  
  // Use atomic update to avoid parallel save conflicts
  try {
    await this.constructor.findByIdAndUpdate(
      this._id,
      { $push: { logs: logEntry } },
      { new: false }
    );
    
    // Also add to local array for immediate access
    this.logs.push(logEntry);
  } catch (error) {
    console.warn('Failed to add log entry atomically:', error.message);
    // Fallback: just add to local array, will be saved later
    this.logs.push(logEntry);
  }
};

// Method to add API call record
jobHistorySchema.methods.addApiCall = async function(service, endpoint, statusCode, responseTime, success, errorMessage = null) {
  const apiCall = {
    service,
    endpoint,
    status_code: statusCode,
    response_time_ms: responseTime,
    success,
    error_message: errorMessage,
    timestamp: new Date()
  };
  
  // Use atomic update to avoid parallel save conflicts
  try {
    await this.constructor.findByIdAndUpdate(
      this._id,
      { $push: { api_calls: apiCall } },
      { new: false }
    );
    
    // Also add to local array for immediate access
    this.api_calls.push(apiCall);
  } catch (error) {
    console.warn('Failed to add API call entry atomically:', error.message);
    // Fallback: just add to local array, will be saved later
    this.api_calls.push(apiCall);
  }
};

// Method to complete job
jobHistorySchema.methods.complete = function(result) {
  this.status = result.success ? 'completed' : 'failed';
  this.completed_at = new Date();
  this.duration_ms = this.completed_at.getTime() - this.started_at.getTime();
  this.result = result;
  return this.save();
};

// Static method to start new job
jobHistorySchema.statics.startJob = async function(jobName, jobType = 'scheduled', triggeredBy = 'cron', adminUserId = null) {
  const jobHistory = new this({
    job_name: jobName,
    job_type: jobType,
    status: 'running',
    started_at: new Date(),
    triggered_by: triggeredBy,
    admin_user_id: adminUserId,
    server_info: {
      node_version: process.version,
      memory_usage: process.memoryUsage()
    }
  });
  
  return await jobHistory.save();
};

// Add pagination plugin
jobHistorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model('JobHistory', jobHistorySchema); 