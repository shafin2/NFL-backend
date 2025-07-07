const cron = require('node-cron');
const Match = require('../models/Match');
const JobHistory = require('../models/JobHistory');
const apiService = require('../services/apiService');

/**
 * Transform SportsBlaze API game data to our Match schema
 * Based on SportsBlaze API response structure
 */
const transformGameToMatch = (game) => {
  // Map SportsBlaze status to our status values
  let status = 'upcoming';
  if (game.status === 'Final') {
    status = 'completed';
  } else if (game.status === 'In Progress') {
    status = 'live';
  } else if (game.status === 'Scheduled') {
    status = 'upcoming';
  }

  // Extract scores if available
  let homeScore = 0;
  let awayScore = 0;
  if (game.scores && game.scores.total) {
    homeScore = game.scores.total.home?.points || 0;
    awayScore = game.scores.total.away?.points || 0;
  }

  // Create match title
  const title = `${game.teams.away.name} @ ${game.teams.home.name}`;

  // Parse venue location (e.g., "New Orleans" -> city)
  const venueLocation = game.venue?.location || '';
  const [city, state] = venueLocation.split(', ');

  return {
    title: title,
    round: game.season?.type || 'Regular Season',
    status: status,
    scheduled_at: new Date(game.date),
    home_team: game.teams.home.name,
    away_team: game.teams.away.name,
    source: 'api',
    metadata: {
      week: game.season?.week || null,
      season: game.season?.year || new Date(game.date).getFullYear(),
      venue: {
        name: game.venue?.name || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        capacity: null // Not provided by SportsBlaze API
      },
      weather: null, // Not provided by SportsBlaze API
      game_type: game.season?.type?.toLowerCase() || 'regular',
      coverage: null // Not provided by SportsBlaze API
    },
    score: {
      home: homeScore,
      away: awayScore
    },
    m3u8_links: [] // Not provided by API, admin can add manually
  };
};

/**
 * Extract week number from round name
 */
const extractWeekFromRound = (roundName) => {
  if (!roundName) return null;
  
  const weekMatch = roundName.match(/week\s+(\d+)/i);
  if (weekMatch) {
    return parseInt(weekMatch[1]);
  }
  
  // Handle playoff rounds
  const playoffRounds = {
    'wild card': 18,
    'divisional': 19,
    'conference': 20,
    'championship': 20,
    'super bowl': 21
  };
  
  for (const [key, week] of Object.entries(playoffRounds)) {
    if (roundName.toLowerCase().includes(key)) {
      return week;
    }
  }
  
  return null;
};

/**
 * Process and upsert NFL schedule data from SportsBlaze API
 */
const processNFLSchedule = async (scheduleData, jobHistory) => {
  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;
  let errors = [];

  try {
    if (!scheduleData.games || !Array.isArray(scheduleData.games)) {
      throw new Error('Invalid schedule data structure: games array not found');
    }

    const gameCount = scheduleData.games.length;
    await jobHistory.addLog('info', `Processing ${gameCount} games from SportsBlaze API...`);
    console.log(`📅 Processing ${gameCount} games from SportsBlaze API...`);

    for (const game of scheduleData.games) {
      totalProcessed++;

      try {
        // Process all games regardless of status since API provides various statuses
        // (Scheduled, In Progress, Final, etc.)

        // Validate required fields
        if (!game.id) {
          const warnMsg = `Game missing ID, skipping: ${game.teams?.away?.name} vs ${game.teams?.home?.name}`;
          await jobHistory.addLog('warn', warnMsg);
          console.warn(`⚠️ ${warnMsg}`);
          totalSkipped++;
          continue;
        }

        if (!game.date) {
          const warnMsg = `Game ${game.id} missing date, skipping`;
          await jobHistory.addLog('warn', warnMsg);
          console.warn(`⚠️ ${warnMsg}`);
          totalSkipped++;
          continue;
        }

        if (!game.teams?.home?.name || !game.teams?.away?.name) {
          const warnMsg = `Game ${game.id} missing team information, skipping`;
          await jobHistory.addLog('warn', warnMsg);
          console.warn(`⚠️ ${warnMsg}`);
          totalSkipped++;
          continue;
        }

        // Transform API data to our schema
        const matchData = transformGameToMatch(game);

        // For cron job workflow: Only create 'upcoming' matches automatically
        // Admin can manually create live matches or convert upcoming to replay
        if (matchData.status === 'completed' || matchData.status === 'live') {
          const skipMsg = `Skipping ${matchData.status} game: ${matchData.title} - will be handled by admin`;
          await jobHistory.addLog('info', skipMsg);
          console.log(`⏭️ ${skipMsg}`);
          totalSkipped++;
          continue;
        }

        // Upsert match in database (only for upcoming games)
        // Use title and scheduled_at as unique identifier since game_id is removed
        const result = await Match.findOneAndUpdate(
          { 
            title: matchData.title,
            scheduled_at: matchData.scheduled_at
          },
          matchData,
          { 
            upsert: true, 
            new: true, 
            runValidators: true,
            setDefaultsOnInsert: true
          }
        );

        if (result) {
          totalUpserted++;
          if (totalUpserted <= 3) { // Only show first 3 to reduce spam
            const successMsg = `Upserted match: ${matchData.title} (${game.id}) - Status: ${matchData.status}`;
            await jobHistory.addLog('info', successMsg);
            console.log(`✅ ${successMsg}`);
          }
        }

      } catch (gameError) {
        const errorMsg = `Error processing game ${game.id}: ${gameError.message}`;
        await jobHistory.addLog('error', errorMsg);
        console.error(`❌ ${errorMsg}`);
        errors.push({
          game_id: game.id,
          error: gameError.message
        });
      }
    }

    const summary = `Total processed: ${totalProcessed}, Upserted: ${totalUpserted}, Skipped: ${totalSkipped}, Errors: ${errors.length}`;
    await jobHistory.addLog('info', summary);

    console.log(`📊 NFL Schedule Job Summary:`);
    console.log(`   📈 Total processed: ${totalProcessed}`);
    console.log(`   ✅ Upserted: ${totalUpserted}`);
    console.log(`   ⏭️ Skipped: ${totalSkipped}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
      await jobHistory.addLog('warn', `Errors encountered during processing`, { errors });
      console.log('❌ Errors encountered:', errors);
    }

    return {
      success: true,
      processed: totalProcessed,
      upserted: totalUpserted,
      skipped: totalSkipped,
      errors: errors.length
    };

  } catch (error) {
    await jobHistory.addLog('error', `Fatal error in NFL schedule processing: ${error.message}`);
    console.error('❌ Fatal error in NFL schedule processing:', error.message);
    return {
      success: false,
      error: error.message,
      processed: totalProcessed,
      upserted: totalUpserted,
      skipped: totalSkipped,
      errors: errors.length + 1
    };
  }
};

/**
 * Main function to fetch and process NFL schedule
 */
const fetchAndProcessNFLSchedule = async (triggeredBy = 'cron', adminUserId = null, season = null) => {
  let jobHistory;

  try {
    jobHistory = await JobHistory.startJob('nfl_schedule_fetch', triggeredBy === 'cron' ? 'scheduled' : 'manual', triggeredBy, adminUserId);
    await jobHistory.addLog('info', 'Starting NFL Schedule Fetch Job...');
    console.log('\n🚀 Starting NFL Schedule Fetch Job...');

    if (!process.env.SPORTSBLAZE_API_KEY) {
      const errorMsg = 'SPORTSBLAZE_API_KEY not configured';
      await jobHistory.addLog('error', errorMsg);
      await jobHistory.complete({ success: false, error: errorMsg, processed: 0, upserted: 0, skipped: 0, errors: 1 });
      console.error('❌ SPORTSBLAZE_API_KEY not configured');
      return { success: false, error: errorMsg };
    }

    const currentSeason = season || new Date().getFullYear();
    const startTime = Date.now();
    let scheduleData;
    
    try {
      scheduleData = await apiService.getNFLSchedule(currentSeason);
      const responseTime = Date.now() - startTime;
      await jobHistory.addApiCall('sportsblaze_schedule', 'schedule', 200, responseTime, true);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await jobHistory.addApiCall('sportsblaze_schedule', 'schedule', error.response?.status || 500, responseTime, false, error.message);
      throw error;
    }

    if (!scheduleData) {
      const errorMsg = 'No schedule data received from SportsBlaze API';
      await jobHistory.addLog('error', errorMsg);
      await jobHistory.complete({ success: false, error: errorMsg, processed: 0, upserted: 0, skipped: 0, errors: 1 });
      console.error('❌ No schedule data received');
      return { success: false, error: errorMsg };
    }

    const result = await processNFLSchedule(scheduleData, jobHistory);
    await jobHistory.complete(result);

    console.log('✅ NFL Schedule job completed successfully');
    return result;

  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    console.error('❌ NFL Schedule job failed:', errorMsg);
    
    if (jobHistory) {
      await jobHistory.addLog('error', `Job failed: ${errorMsg}`);
      await jobHistory.complete({ success: false, error: errorMsg, processed: 0, upserted: 0, skipped: 0, errors: 1 });
    }
    
    return { success: false, error: errorMsg };
  }
};

/**
 * Setup cron job for NFL schedule fetching
 * Runs daily at 2 AM
 */
const setupNFLScheduleJob = () => {
  const schedule = '0 2 * * *';
  
  console.log('📅 Setting up NFL Schedule cron job...');
  console.log(`📅 Schedule: ${schedule} (daily at 2 AM)`);
  
  cron.schedule(schedule, async () => {
    console.log('🔄 NFL Schedule cron job triggered');
    await fetchAndProcessNFLSchedule('cron');
  });
  
  console.log('✅ NFL Schedule cron job scheduled');
};

module.exports = {
  fetchAndProcessNFLSchedule,
  setupNFLScheduleJob,
  processNFLSchedule,
  transformGameToMatch
}; 