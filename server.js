const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import database connection
const connectDB = require('./config/database');

// Import cron jobs
const { scheduleJobs, stopAllJobs, getJobsStatus } = require('./jobs');

// Import routes
const matchRoutes = require('./routes/matchRoutes');
const newsRoutes = require('./routes/newsRoutes');
const appSettingsRoutes = require('./routes/appSettingsRoutes');

// Import admin routes
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MongoDB
connectDB();

// Initialize cron jobs
scheduleJobs();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.API_RATE_LIMIT || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Compress responses
app.use(cors()); // Enable CORS
app.use(morgan('combined')); // Logging
app.use(express.json({ limit: '10mb' })); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use('/api', limiter); // Apply rate limiting to API routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'NFL Backend Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    cronJobs: getJobsStatus()
  });
});

// Cron jobs status endpoint
app.get('/admin/cron/status', (req, res) => {
  try {
    const status = getJobsStatus();
    res.status(200).json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get cron status',
      message: error.message
    });
  }
});

// Manual trigger cron job endpoint
app.post('/admin/cron/trigger/:jobName', async (req, res) => {
  try {
    const { jobName } = req.params;
    
    // Import trigger function
    const { fetchAndProcessNFLSchedule } = require('./jobs/nflScheduleJob');
    const { fetchAndProcessNFLNews } = require('./jobs/nflNewsJob');
    
    let result;
    
    switch (jobName.toLowerCase()) {
      case 'schedule':
      case 'nfl-schedule':
        result = await fetchAndProcessNFLSchedule();
        break;
      case 'news':
      case 'nfl-news':
        result = await fetchAndProcessNFLNews();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid job name',
          validJobs: ['schedule', 'news']
        });
    }
    
    res.status(200).json({
      success: true,
      data: result,
      message: `Manually triggered ${jobName} job`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to trigger cron job',
      message: error.message
    });
  }
});

// API Routes
app.use('/api', matchRoutes);
app.use('/api', newsRoutes);
app.use('/api', appSettingsRoutes);

// Admin Routes (protected)
app.use('/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 NFL Backend Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

module.exports = app; 