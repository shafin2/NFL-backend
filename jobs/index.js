const { setupNFLScheduleJob } = require('./nflScheduleJob');
const { setupNFLNewsJob } = require('./nflNewsJob');

// Store active jobs globally
let activeJobs = [];

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
  if (!process.env.SPORTRADAR_API_KEY) missingKeys.push('SPORTRADAR_API_KEY');
  if (!process.env.RAPIDAPI_KEY) missingKeys.push('RAPIDAPI_KEY');
  
  if (missingKeys.length > 0) {
    console.log(`⚠️ Missing API keys: ${missingKeys.join(', ')}`);
    console.log('⚠️ Some cron jobs may not function properly');
  }

  try {
    // Setup NFL Schedule Job (every 6 hours)
    if (process.env.SPORTRADAR_API_KEY) {
      const scheduleJob = setupNFLScheduleJob();
      activeJobs.push(scheduleJob);
      scheduleJob.job.start();
      console.log(`✅ Started: ${scheduleJob.name} (${scheduleJob.schedule})`);
    } else {
      console.log('⏭️ Skipping NFL Schedule job - SPORTRADAR_API_KEY not configured');
    }
    
    // Setup NFL News Job (twice daily)
    if (process.env.RAPIDAPI_KEY) {
      const newsJob = setupNFLNewsJob();
      activeJobs.push(newsJob);
      newsJob.job.start();
      console.log(`✅ Started: ${newsJob.name} (${newsJob.schedule})`);
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
 * Get current jobs status
 */
const getJobsStatus = () => {
  return {
    total: activeJobs.length,
    running: activeJobs.filter(j => j.job && j.job.running).length,
    jobs: activeJobs.map(j => ({
      name: j.name,
      schedule: j.schedule,
      description: j.description,
      running: j.job && j.job.running,
      nextRun: j.job && j.job.running && j.job.nextDate ? j.job.nextDate().toString() : null
    }))
  };
};

module.exports = {
  scheduleJobs,
  stopAllJobs,
  getJobsStatus,
  getActiveJobs: () => activeJobs
}; 