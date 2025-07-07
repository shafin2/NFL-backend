const JobHistory = require('../../models/JobHistory');
const apiService = require('../../services/apiService');
const { fetchAndProcessNFLNews } = require('../../jobs/nflNewsJob');
const { fetchAndProcessNFLSchedule } = require('../../jobs/nflScheduleJob');

// Get all job history with pagination and filters
const getAllJobHistory = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      job_name,
      status,
      triggered_by,
      date_from,
      date_to
    } = req.query;

    // Build query
    const query = {};
    if (job_name) query.job_name = job_name;
    if (status) query.status = status;
    if (triggered_by) query.triggered_by = triggered_by;
    
    // Date range filter
    if (date_from || date_to) {
      query.started_at = {};
      if (date_from) query.started_at.$gte = new Date(date_from);
      if (date_to) query.started_at.$lte = new Date(date_to);
    }

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { started_at: -1 },
      populate: false
    };

    const result = await JobHistory.paginate(query, options);

    res.status(200).json({
      success: true,
      data: {
        jobs: result.docs,
        pagination: {
          current_page: result.page,
          total_pages: result.totalPages,
          total_jobs: result.totalDocs,
          has_next: result.hasNextPage,
          has_prev: result.hasPrevPage,
          per_page: result.limit
        }
      },
      message: 'Job history retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching job history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch job history'
    });
  }
};

// Get single job details by ID
const getJobById = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await JobHistory.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Job not found'
      });
    }

    res.status(200).json({
      success: true,
      data: job,
      message: 'Job details retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching job details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch job details'
    });
  }
};

// Get job statistics and summary
const getJobStats = async (req, res) => {
  try {
    const [
      totalJobs,
      runningJobs,
      recentJobs,
      jobsByStatus,
      jobsByName,
      avgDuration,
      successRate,
      apiStats
    ] = await Promise.all([
      // Total jobs count
      JobHistory.countDocuments(),
      
      // Currently running jobs
      JobHistory.countDocuments({ status: 'running' }),
      
      // Recent jobs (last 24 hours)
      JobHistory.find({
        started_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }).countDocuments(),
      
      // Jobs by status
      JobHistory.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      
      // Jobs by name
      JobHistory.aggregate([
        {
          $group: {
            _id: '$job_name',
            count: { $sum: 1 },
            last_run: { $max: '$started_at' },
            success_count: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            avg_duration: {
              $avg: { $cond: [{ $ne: ['$duration_ms', null] }, '$duration_ms', 0] }
            }
          }
        }
      ]),
      
      // Average duration for completed jobs
      JobHistory.aggregate([
        {
          $match: { status: 'completed', duration_ms: { $ne: null } }
        },
        {
          $group: {
            _id: null,
            avg_duration: { $avg: '$duration_ms' }
          }
        }
      ]),
      
      // Success rate (last 30 days)
      JobHistory.aggregate([
        {
          $match: {
            started_at: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            status: { $in: ['completed', 'failed'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            success_rate: {
              $multiply: [{ $divide: ['$successful', '$total'] }, 100]
            }
          }
        }
      ]),
      
      // Get API statistics
      Promise.resolve(apiService.getStats())
    ]);

    // Process job by name data
    const jobSummary = jobsByName.map(job => ({
      job_name: job._id,
      total_runs: job.count,
      last_run: job.last_run,
      success_rate: job.count > 0 ? Math.round((job.success_count / job.count) * 100) : 0,
      avg_duration_ms: Math.round(job.avg_duration || 0)
    }));

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total_jobs: totalJobs,
          running_jobs: runningJobs,
          recent_jobs_24h: recentJobs,
          avg_duration_ms: Math.round(avgDuration[0]?.avg_duration || 0),
          success_rate_30d: Math.round(successRate[0]?.success_rate || 0)
        },
        by_status: jobsByStatus,
        by_job_name: jobSummary,
        api_statistics: apiStats
      },
      message: 'Job statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching job statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch job statistics'
    });
  }
};

// Manually trigger a job
const triggerJob = async (req, res) => {
  try {
    const { job_name, season } = req.body;
    const adminUserId = req.user?.id || 'admin'; // Get from auth middleware if available

    console.log(`🔄 Admin triggered job: ${job_name} by ${adminUserId}`);

    if (!job_name) {
      return res.status(400).json({
        success: false,
        error: 'Missing job_name',
        message: 'job_name is required in request body'
      });
    }

    // Check if required environment variables are set
    if (job_name === 'nfl_news_fetch' && !process.env.RAPIDAPI_KEY) {
      console.error('❌ RAPIDAPI_KEY not configured for news job');
      return res.status(500).json({
        success: false,
        error: 'Configuration error',
        message: 'RAPIDAPI_KEY is not configured. Please set up environment variables.'
      });
    }

    if (job_name === 'nfl_schedule_fetch' && !process.env.SPORTSBLAZE_API_KEY) {
      console.error('❌ SPORTSBLAZE_API_KEY not configured for schedule job');
      return res.status(500).json({
        success: false,
        error: 'Configuration error',
        message: 'SPORTSBLAZE_API_KEY is not configured. Please set up environment variables.'
      });
    }

    let result;
    
    try {
      switch (job_name) {
        case 'nfl_news_fetch':
          console.log('🚀 Starting NFL News fetch job...');
          result = await fetchAndProcessNFLNews('admin_manual', adminUserId);
          console.log('✅ NFL News job completed:', result);
          break;
          
        case 'nfl_schedule_fetch':
          console.log('🚀 Starting NFL Schedule fetch job...');
          result = await fetchAndProcessNFLSchedule('admin_manual', adminUserId, season);
          console.log('✅ NFL Schedule job completed:', result);
          break;
          
        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid job_name',
            message: 'job_name must be one of: nfl_news_fetch, nfl_schedule_fetch'
          });
      }

      // Ensure result has proper structure
      if (!result) {
        console.error('❌ Job function returned null/undefined result');
        return res.status(500).json({
          success: false,
          error: 'Job execution failed',
          message: 'Job completed but returned no result'
        });
      }

      console.log(`✅ Job ${job_name} completed successfully:`, result);

      res.status(200).json({
        success: true,
        data: result,
        message: `Job ${job_name} triggered successfully`
      });

    } catch (jobError) {
      console.error(`❌ Error during ${job_name} execution:`, jobError);
      
      // Return a structured error response
      return res.status(500).json({
        success: false,
        error: 'Job execution failed',
        message: `Job ${job_name} failed: ${jobError.message}`,
        details: {
          error: jobError.message,
          stack: process.env.NODE_ENV === 'development' ? jobError.stack : undefined
        }
      });
    }

  } catch (error) {
    console.error('❌ Error triggering job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to trigger job',
      details: {
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    });
  }
};

// Cancel a running job (if possible)
const cancelJob = async (req, res) => {
  try {
    const { id } = req.params;

    const job = await JobHistory.findById(id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Job not found'
      });
    }

    if (job.status !== 'running') {
      return res.status(400).json({
        success: false,
        error: 'Invalid status',
        message: 'Can only cancel running jobs'
      });
    }

    // Update job status to cancelled
    job.status = 'cancelled';
    job.completed_at = new Date();
    job.duration_ms = job.completed_at.getTime() - job.started_at.getTime();
    job.result = {
      success: false,
      message: 'Job cancelled by admin'
    };

    await job.save();

    res.status(200).json({
      success: true,
      data: job,
      message: 'Job cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling job:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to cancel job'
    });
  }
};

// Delete old job history
const cleanupJobHistory = async (req, res) => {
  try {
    const { days_old = 30, keep_failed = true } = req.body;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days_old));

    let query = {
      started_at: { $lt: cutoffDate },
      status: { $in: ['completed'] }
    };

    // If keep_failed is false, also delete failed jobs
    if (!keep_failed) {
      query.status.$in.push('failed', 'cancelled');
    }

    const result = await JobHistory.deleteMany(query);

    res.status(200).json({
      success: true,
      data: {
        deleted_count: result.deletedCount,
        cutoff_date: cutoffDate
      },
      message: `Cleaned up ${result.deletedCount} old job records`
    });

  } catch (error) {
    console.error('Error cleaning up job history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to cleanup job history'
    });
  }
};

// Get real-time API statistics
const getApiStats = async (req, res) => {
  try {
    const stats = apiService.getStats();

    res.status(200).json({
      success: true,
      data: stats,
      message: 'API statistics retrieved successfully'
    });

  } catch (error) {
    console.error('Error fetching API statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to fetch API statistics'
    });
  }
};

// Reset API statistics
const resetApiStats = async (req, res) => {
  try {
    apiService.resetStats();

    res.status(200).json({
      success: true,
      message: 'API statistics reset successfully'
    });

  } catch (error) {
    console.error('Error resetting API statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Unable to reset API statistics'
    });
  }
};

module.exports = {
  getAllJobHistory,
  getJobById,
  getJobStats,
  triggerJob,
  cancelJob,
  cleanupJobHistory,
  getApiStats,
  resetApiStats
}; 