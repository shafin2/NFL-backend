// News cron trigger endpoint for Vercel serverless function
const { connectDB } = require('../../../../config/database');
const { fetchAndProcessNFLNews } = require('../../../../jobs/nflNewsJob');
const { updateJobStatus, markJobAsRunning } = require('../../../../jobs/index');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Connect to database
    await connectDB();

    const actualJobName = 'NFL News Fetch';
    
    // Mark job as running
    await markJobAsRunning(actualJobName);
    
    console.log(`🔄 Manual trigger: Starting ${actualJobName}...`);
    
    // Execute the job
    const result = await fetchAndProcessNFLNews();
    
    // Update job status with results
    await updateJobStatus(actualJobName, true, `Manual trigger successful. ${result.message}`);
    
    console.log(`✅ Manual trigger: ${actualJobName} completed successfully`);
    
    res.status(200).json({
      success: true,
      message: `${actualJobName} triggered successfully`,
      jobName: actualJobName,
      result: result,
      timestamp: new Date().toISOString(),
      triggeredBy: 'manual'
    });

  } catch (error) {
    console.error(`❌ Manual trigger error for NFL News Fetch:`, error);
    
    try {
      await updateJobStatus('NFL News Fetch', false, `Manual trigger failed: ${error.message}`);
    } catch (updateError) {
      console.error('Failed to update job status:', updateError);
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to trigger cron job',
      message: error.message
    });
  }
} 