const cron = require('node-cron');
const Match = require('../models/Match');
const apiService = require('../services/apiService');

/**
 * Transform Sportradar API game data to our Match schema
 */
const transformGameToMatch = (game, roundName) => {
  return {
    game_id: game.id,
    title: game.title || `${game.away?.name || 'Away'} vs ${game.home?.name || 'Home'}`,
    round: roundName || 'Regular Season',
    status: 'upcoming', // Always set to upcoming for scheduled games
    scheduled_at: new Date(game.scheduled),
    home_team: game.home?.name || game.home?.alias || 'Unknown Home Team',
    away_team: game.away?.name || game.away?.alias || 'Unknown Away Team',
    source: 'api',
    metadata: {
      week: extractWeekFromRound(roundName),
      season: new Date(game.scheduled).getFullYear(),
      venue: game.venue?.name || null,
      weather: null
    },
    score: {
      home: 0,
      away: 0
    },
    m3u8_links: [],
    live_channel_ids: []
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
 * Process and upsert NFL schedule data
 */
const processNFLSchedule = async (scheduleData) => {
  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;
  let errors = [];

  try {
    if (!scheduleData.rounds || !Array.isArray(scheduleData.rounds)) {
      throw new Error('Invalid schedule data structure: rounds array not found');
    }

    console.log(`📅 Processing ${scheduleData.rounds.length} rounds...`);

    for (const round of scheduleData.rounds) {
      if (!round.games || !Array.isArray(round.games)) {
        console.warn(`⚠️ Round "${round.name}" has no games array`);
        continue;
      }

      console.log(`🏈 Processing round: ${round.name} (${round.games.length} games)`);

      for (const game of round.games) {
        totalProcessed++;

        try {
          // Only process scheduled games
          if (game.status !== 'scheduled') {
            console.log(`⏭️ Skipping game ${game.id} - status: ${game.status}`);
            totalSkipped++;
            continue;
          }

          // Validate required fields
          if (!game.id) {
            console.warn(`⚠️ Game missing ID, skipping:`, game.title);
            totalSkipped++;
            continue;
          }

          if (!game.scheduled) {
            console.warn(`⚠️ Game ${game.id} missing scheduled time, skipping`);
            totalSkipped++;
            continue;
          }

          // Transform API data to our schema
          const matchData = transformGameToMatch(game, round.name);

          // Upsert match in database
          const result = await Match.findOneAndUpdate(
            { game_id: game.id },
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
            console.log(`✅ Upserted match: ${matchData.title} (${game.id})`);
          }

        } catch (gameError) {
          console.error(`❌ Error processing game ${game.id}:`, gameError.message);
          errors.push({
            game_id: game.id,
            error: gameError.message
          });
        }
      }
    }

    console.log(`📊 NFL Schedule Job Summary:`);
    console.log(`   📈 Total processed: ${totalProcessed}`);
    console.log(`   ✅ Upserted: ${totalUpserted}`);
    console.log(`   ⏭️ Skipped: ${totalSkipped}`);
    console.log(`   ❌ Errors: ${errors.length}`);

    if (errors.length > 0) {
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
    console.error('❌ Fatal error in NFL schedule processing:', error.message);
    return {
      success: false,
      error: error.message,
      processed: totalProcessed,
      upserted: totalUpserted,
      skipped: totalSkipped,
      errors: errors.length
    };
  }
};

/**
 * Main function to fetch and process NFL schedule
 */
const fetchAndProcessNFLSchedule = async () => {
  const startTime = Date.now();
  console.log('\n🚀 Starting NFL Schedule Fetch Job...');

  try {
    // Check if API key is configured
    if (!process.env.SPORTRADAR_API_KEY) {
      console.error('❌ SPORTRADAR_API_KEY not configured');
      return;
    }

    console.log('🌐 Fetching NFL schedule from Sportradar API...');
    const scheduleData = await apiService.fetchNFLSchedule();

    if (!scheduleData) {
      throw new Error('No data received from Sportradar API');
    }

    console.log('📅 Processing schedule data...');
    const result = await processNFLSchedule(scheduleData);

    const duration = Date.now() - startTime;
    console.log(`⏱️ NFL Schedule Job completed in ${duration}ms`);
    console.log('✅ NFL Schedule Fetch Job finished successfully\n');

    return result;

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ NFL Schedule Fetch Job failed after ${duration}ms:`, error.message);
    console.error('❌ NFL Schedule Fetch Job finished with errors\n');
    
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Setup cron job for NFL schedule fetching
 * Runs every 6 hours: at 00:00, 06:00, 12:00, 18:00
 */
const setupNFLScheduleJob = () => {
  const schedule = '0 */6 * * *'; // Every 6 hours
  
  console.log(`📅 Setting up NFL Schedule cron job with schedule: ${schedule}`);
  
  const job = cron.schedule(schedule, async () => {
    await fetchAndProcessNFLSchedule();
  }, {
    scheduled: false, // Don't start immediately
    timezone: 'America/New_York' // NFL timezone
  });

  return {
    job,
    schedule,
    name: 'NFL Schedule Fetch',
    description: 'Fetches NFL schedule from Sportradar API every 6 hours'
  };
};

module.exports = {
  setupNFLScheduleJob,
  fetchAndProcessNFLSchedule, // Export for manual testing
  processNFLSchedule // Export for testing
}; 