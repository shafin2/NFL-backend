const { setupNFLScheduleJob } = require('./nflScheduleJob');
const { setupNFLNewsJob } = require('./nflNewsJob');

// Store active jobs globally
let activeJobs = [];

// Store job execution status
let jobStatus = {
  'NFL Schedule Fetch': {
    lastRun: null,
    nextRun: null,
    lastError: null,
    isRunning: false,
    totalRuns: 0,
    successfulRuns: 0
  },
  'NFL News Fetch': {
    lastRun: null,
    nextRun: null,
    lastError: null,
    isRunning: false,
    totalRuns: 0,
    successfulRuns: 0
  }
};

/**
 * Initialize and start all cron jobs
 */
const scheduleJobs = () => {
  console.log('\n🕐 Initializing NFL Backend Cron Jobs...');
  
  // Check if cron jobs are enabled
  if (process.env.ENABLE_CRON_JOBS !== 'true') {
    console.log('⏸️ Cron jobs are disabled in environment (set ENABLE_CRON_JOBS=true to enable)');
    return [];
  }

  // Check for required API keys
  const missingKeys = [];
  if (!process.env.SPORTSBLAZE_API_KEY) missingKeys.push('SPORTSBLAZE_API_KEY');
  if (!process.env.RAPIDAPI_KEY) missingKeys.push('RAPIDAPI_KEY');
  
  if (missingKeys.length > 0) {
    console.log(`⚠️ Missing API keys: ${missingKeys.join(', ')}`);
    console.log('⚠️ Some cron jobs may not function properly');
  }

  try {
    // Setup NFL Schedule Job (every 6 hours)
    if (process.env.SPORTSBLAZE_API_KEY) {
      const { fetchAndProcessNFLSchedule } = require('./nflScheduleJob');
      const scheduleJob = setupNFLScheduleJob();
      
      // Replace the job function with our wrapper
      const cron = require('node-cron');
      scheduleJob.job = cron.schedule(scheduleJob.schedule, createJobWrapper(scheduleJob.name, fetchAndProcessNFLSchedule), {
        scheduled: false,
        timezone: 'Asia/Karachi' // Pakistan timezone (GMT+5)
      });
      
      activeJobs.push(scheduleJob);
      scheduleJob.job.start();
      
      // Set initial next run time
      jobStatus[scheduleJob.name].nextRun = calculateNextRun(scheduleJob.schedule);
      
      console.log(`✅ Started: ${scheduleJob.name} (${formatSchedule(scheduleJob.schedule)})`);
    } else {
      console.log('⏭️ Skipping NFL Schedule job - SPORTSBLAZE_API_KEY not configured');
    }
    
    // Setup NFL News Job (twice daily)
    if (process.env.RAPIDAPI_KEY) {
      const { fetchAndProcessNFLNews } = require('./nflNewsJob');
      const newsJob = setupNFLNewsJob();
      
      // Replace the job function with our wrapper
      const cron = require('node-cron');
      newsJob.job = cron.schedule(newsJob.schedule, createJobWrapper(newsJob.name, fetchAndProcessNFLNews), {
        scheduled: false,
        timezone: 'Asia/Karachi' // Pakistan timezone (GMT+5)
      });
      
      activeJobs.push(newsJob);
      newsJob.job.start();
      
      // Set initial next run time
      jobStatus[newsJob.name].nextRun = calculateNextRun(newsJob.schedule);
      
      console.log(`✅ Started: ${newsJob.name} (${formatSchedule(newsJob.schedule)})`);
    } else {
      console.log('⏭️ Skipping NFL News job - RAPIDAPI_KEY not configured');
    }
    
    console.log(`\n🎯 Successfully initialized ${activeJobs.length} cron jobs`);
    console.log('📋 Active Jobs Summary:');
    activeJobs.forEach((jobInfo, index) => {
      console.log(`   ${index + 1}. ${jobInfo.name}: ${jobInfo.schedule}`);
      console.log(`      ${jobInfo.description}`);
    });
    console.log(''); // Add spacing
    
    return activeJobs;
    
  } catch (error) {
    console.error('❌ Error initializing cron jobs:', error.message);
    return [];
  }
};

/**
 * Stop all running cron jobs
 */
const stopAllJobs = () => {
  console.log('\n🛑 Stopping all cron jobs...');
  
  if (activeJobs.length === 0) {
    console.log('⚠️ No active jobs to stop');
    return;
  }
  
  activeJobs.forEach(jobInfo => {
    try {
      if (jobInfo.job && jobInfo.job.running) {
        jobInfo.job.stop();
        console.log(`✅ Stopped: ${jobInfo.name}`);
      }
    } catch (error) {
      console.error(`❌ Error stopping ${jobInfo.name}:`, error.message);
    }
  });
  
  console.log(`✅ Stopped ${activeJobs.length} cron jobs\n`);
  activeJobs = [];
};

/**
 * Calculate next run time for cron schedule
 */
const calculateNextRun = (cronSchedule) => {
  const now = new Date();
  
  // Parse common cron patterns
  if (cronSchedule === '0 */6 * * *') {
    // Every 6 hours
    const nextRun = new Date(now);
    const currentHour = nextRun.getHours();
    const nextHour = Math.ceil(currentHour / 6) * 6;
    
    if (nextHour >= 24) {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    } else {
      nextRun.setHours(nextHour, 0, 0, 0);
    }
    
    return nextRun.toISOString();
  } else if (cronSchedule === '0 0,12 * * *') {
    // Twice daily at 00:00 and 12:00
    const nextRun = new Date(now);
    const currentHour = nextRun.getHours();
    
    if (currentHour < 12) {
      nextRun.setHours(12, 0, 0, 0);
    } else {
      nextRun.setDate(nextRun.getDate() + 1);
      nextRun.setHours(0, 0, 0, 0);
    }
    
    return nextRun.toISOString();
  } else if (cronSchedule === '*/30 * * * *') {
    // Every 30 minutes
    const nextRun = new Date(now);
    const currentMinutes = nextRun.getMinutes();
    const nextMinutes = Math.ceil(currentMinutes / 30) * 30;
    
    if (nextMinutes >= 60) {
      nextRun.setHours(nextRun.getHours() + 1, 0, 0, 0);
    } else {
      nextRun.setMinutes(nextMinutes, 0, 0);
    }
    
    return nextRun.toISOString();
  }
  
  // Default fallback - add 1 hour
  const nextRun = new Date(now.getTime() + 60 * 60 * 1000);
  return nextRun.toISOString();
};

/**
 * Update job status after execution
 */
const updateJobStatus = (jobName, success, error = null) => {
  if (jobStatus[jobName]) {
    jobStatus[jobName].lastRun = new Date().toISOString();
    jobStatus[jobName].lastError = error;
    jobStatus[jobName].isRunning = false;
    jobStatus[jobName].totalRuns++;
    if (success) {
      jobStatus[jobName].successfulRuns++;
    }
    
    // Calculate next run time based on cron schedule
    const job = activeJobs.find(j => j.name === jobName);
    if (job && job.schedule) {
      jobStatus[jobName].nextRun = calculateNextRun(job.schedule);
    }
  }
};

/**
 * Mark job as running
 */
const markJobAsRunning = (jobName) => {
  if (jobStatus[jobName]) {
    jobStatus[jobName].isRunning = true;
  }
};

/**
 * Create wrapper function for cron job execution with status tracking
 */
const createJobWrapper = (jobName, jobFunction) => {
  return async () => {
    try {
      markJobAsRunning(jobName);
      console.log(`🚀 Starting ${jobName}...`);
      
      const result = await jobFunction();
      
      if (result && result.success === false) {
        updateJobStatus(jobName, false, result.error || 'Job completed with errors');
      } else {
        updateJobStatus(jobName, true);
      }
      
      console.log(`✅ ${jobName} completed successfully`);
    } catch (error) {
      updateJobStatus(jobName, false, error.message);
      console.error(`❌ ${jobName} failed:`, error.message);
    }
  };
};

/**
 * Format cron schedule for human reading (Pakistan timezone)
 */
const formatSchedule = (cronSchedule) => {
  const scheduleMap = {
    '0 */6 * * *': 'Every 6 hours (00:00, 06:00, 12:00, 18:00 PKT)',
    '0 0,12 * * *': 'Twice daily (00:00, 12:00 PKT)',
    '*/30 * * * *': 'Every 30 minutes'
  };
  
  return scheduleMap[cronSchedule] || cronSchedule;
};

/**
 * Get current jobs status
 */
const getJobsStatus = () => {
  return {
    total: activeJobs.length,
    running: activeJobs.filter(j => jobStatus[j.name]?.isRunning).length,
    jobs: activeJobs.map(j => {
      const status = jobStatus[j.name] || {};
      return {
        name: j.name,
        schedule: formatSchedule(j.schedule),
        description: j.description,
        running: status.isRunning || false,
        lastRun: status.lastRun,
        nextRun: status.nextRun,
        lastError: status.lastError,
        totalRuns: status.totalRuns || 0,
        successfulRuns: status.successfulRuns || 0,
        successRate: status.totalRuns > 0 ? Math.round((status.successfulRuns / status.totalRuns) * 100) : 0
      };
    })
  };
};

module.exports = {
  scheduleJobs,
  stopAllJobs,
  getJobsStatus,
  getActiveJobs: () => activeJobs,
  updateJobStatus,
  markJobAsRunning
}; 