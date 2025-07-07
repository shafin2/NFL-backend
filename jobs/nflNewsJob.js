const cron = require('node-cron');
const News = require('../models/News');
const JobHistory = require('../models/JobHistory');
const apiService = require('../services/apiService');

/**
 * Transform ESPN/API news article to our News schema
 * Based on actual API response structure
 */
const transformArticleToNews = (article) => {
  // Extract image data from images array
  let imageUrl = null;
  let imageAlt = null;
  let imageCaption = null;
  
  if (article.images && Array.isArray(article.images) && article.images.length > 0) {
    const primaryImage = article.images[0];
    imageUrl = primaryImage.url;
    imageAlt = primaryImage.alt || primaryImage.name;
    imageCaption = primaryImage.caption || primaryImage.credit;
  }

  return {
    headline: article.headline || 'No Headline',
    description: article.description || 'No description available',
    published_at: article.published ? new Date(article.published) : new Date(),
    image_url: imageUrl,
    image_alt: imageAlt,
    image_caption: imageCaption,
    byline: article.byline || 'Unknown',
    source: 'api',
    api_id: String(article.id),
    type: article.type || 'Story',
    is_premium: article.premium || false
  };
};

/**
 * Categorize news based on content analysis
 */
const categorizeNews = (headline, description) => {
  const content = `${headline} ${description}`.toLowerCase();
  
  const categories = {
    trade: ['trade', 'traded', 'signs', 'signed', 'contract', 'deal'],
    injury: ['injury', 'injured', 'hurt', 'surgery', 'recovery'],
    game: ['game', 'match', 'score', 'win', 'loss', 'touchdown'],
    draft: ['draft', 'rookie', 'prospects', 'college'],
    playoff: ['playoff', 'playoffs', 'postseason', 'super bowl']
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => content.includes(keyword))) {
      return category;
    }
  }

  return 'general';
};

/**
 * Extract relevant tags from article content
 */
const extractTags = (headline, description) => {
  const content = `${headline} ${description}`.toLowerCase();
  const tags = [];

  const teams = ['chiefs', 'patriots', 'packers', 'cowboys', 'steelers'];
  teams.forEach(team => {
    if (content.includes(team)) tags.push(team);
  });

  if (content.includes('nfl')) tags.push('nfl');
  if (content.includes('coach')) tags.push('coaching');

  return [...new Set(tags)].slice(0, 5);
};

/**
 * Debug function to log API response structure (for development)
 */
const debugApiResponse = (articles, jobHistory) => {
  if (articles && articles.length > 0) {
    const sampleArticle = articles[0];
    const availableFields = Object.keys(sampleArticle);
    
    jobHistory?.addLog('debug', 'Sample article structure analyzed', {
      availableFields,
      sampleFields: {
        id: sampleArticle.id,
        headline: sampleArticle.headline,
        published: sampleArticle.published,
        hasImages: !!sampleArticle.images
      }
    });
    
    console.log('🔍 Sample article structure:');
    console.log('Available fields:', availableFields);
    
    // Log specific fields we're interested in
    const fieldsToCheck = ['id', 'headline', 'description', 'published', 'images', 'byline', 'type', 'premium'];
    fieldsToCheck.forEach(field => {
      if (sampleArticle.hasOwnProperty(field)) {
        console.log(`  ${field}:`, typeof sampleArticle[field], sampleArticle[field]);
      }
    });
  }
};

/**
 * Process and upsert NFL news data
 */
const processNFLNews = async (newsData, jobHistory) => {
  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;

  try {
    if (!newsData.articles || !Array.isArray(newsData.articles)) {
      throw new Error('Invalid news data structure');
    }

    const articleCount = newsData.articles.length;
    await jobHistory.addLog('info', `Processing ${articleCount} articles...`);
    console.log(`📰 Processing ${articleCount} articles...`);
    
    // Debug the first article structure
    if (process.env.NODE_ENV !== 'production') {
      debugApiResponse(newsData.articles, jobHistory);
    }

    for (const article of newsData.articles) {
      totalProcessed++;

      try {
        if (!article.id || !article.headline) {
          totalSkipped++;
          await jobHistory.addLog('warn', `Skipped article due to missing required fields: ${article.id || 'no-id'}`);
          continue;
        }

        const newsData = transformArticleToNews(article);

        await News.findOneAndUpdate(
          { api_id: String(article.id) },
          newsData,
          { upsert: true, new: true, runValidators: true }
        );

        totalUpserted++;
        if (totalUpserted <= 3) { // Only log first few successes to avoid spam
          await jobHistory.addLog('info', `Upserted: ${newsData.headline.substring(0, 50)}...`);
          console.log(`✅ Upserted: ${newsData.headline.substring(0, 50)}...`);
        }

      } catch (error) {
        await jobHistory.addLog('error', `Error processing article ${article.id}: ${error.message}`);
        console.error(`❌ Error processing article ${article.id}:`, error.message);
      }
    }

    const summary = `Processed: ${totalProcessed}, Upserted: ${totalUpserted}, Skipped: ${totalSkipped}`;
    await jobHistory.addLog('info', summary);
    console.log(`📊 ${summary}`);
    
    return { success: true, processed: totalProcessed, upserted: totalUpserted, skipped: totalSkipped, errors: 0 };

  } catch (error) {
    await jobHistory.addLog('error', `Fatal error in NFL news processing: ${error.message}`);
    console.error('❌ Fatal error in NFL news processing:', error.message);
    return { success: false, error: error.message, processed: totalProcessed, upserted: totalUpserted, skipped: totalSkipped, errors: 1 };
  }
};

/**
 * Main function to fetch and process NFL news
 */
const fetchAndProcessNFLNews = async (triggeredBy = 'cron', adminUserId = null) => {
  let jobHistory;

  try {
    jobHistory = await JobHistory.startJob('nfl_news_fetch', triggeredBy === 'cron' ? 'scheduled' : 'manual', triggeredBy, adminUserId);
    await jobHistory.addLog('info', 'Starting NFL News Fetch Job...');
    console.log('\n🚀 Starting NFL News Fetch Job...');

    if (!process.env.RAPIDAPI_KEY) {
      const errorMsg = 'RAPIDAPI_KEY not configured';
      await jobHistory.addLog('error', errorMsg);
      await jobHistory.complete({ success: false, error: errorMsg, processed: 0, upserted: 0, skipped: 0, errors: 1 });
      console.error('❌ RAPIDAPI_KEY not configured');
      return { success: false, error: errorMsg };
    }

    const startTime = Date.now();
    let newsData;
    
    try {
      newsData = await apiService.getNFLNews(50);
      const responseTime = Date.now() - startTime;
      await jobHistory.addApiCall('rapidapi_nfl_news', 'nfl-news', 200, responseTime, true);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      await jobHistory.addApiCall('rapidapi_nfl_news', 'nfl-news', error.response?.status || 500, responseTime, false, error.message);
      throw error;
    }

    if (!newsData) {
      const errorMsg = 'No data received';
      await jobHistory.addLog('error', errorMsg);
      await jobHistory.complete({ success: false, error: errorMsg, processed: 0, upserted: 0, skipped: 0, errors: 1 });
      console.error('❌ No data received');
      return { success: false, error: errorMsg };
    }

    const result = await processNFLNews(newsData, jobHistory);
    await jobHistory.complete(result);

    console.log('✅ NFL News job completed successfully');
    return result;

  } catch (error) {
    const errorMsg = error.message || 'Unknown error';
    console.error('❌ NFL News job failed:', errorMsg);
    
    if (jobHistory) {
      await jobHistory.addLog('error', `Job failed: ${errorMsg}`);
      await jobHistory.complete({ success: false, error: errorMsg, processed: 0, upserted: 0, skipped: 0, errors: 1 });
    }
    
    return { success: false, error: errorMsg };
  }
};

/**
 * Setup cron job for NFL news fetching
 * Runs every 6 hours
 */
const setupNFLNewsJob = () => {
  const schedule = '0 */6 * * *';
  
  console.log('📅 Setting up NFL News cron job...');
  console.log(`📅 Schedule: ${schedule} (every 6 hours)`);
  
  cron.schedule(schedule, async () => {
    console.log('🔄 NFL News cron job triggered');
    await fetchAndProcessNFLNews('cron');
  });
  
  console.log('✅ NFL News cron job scheduled');
};

/**
 * Manual news cleanup - remove old news articles (optional)
 */
const cleanupOldNews = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await News.deleteMany({
      published_at: { $lt: cutoffDate }
    });

    console.log(`🗑️ Cleaned up ${result.deletedCount} old news articles`);
    return result.deletedCount;
  } catch (error) {
    console.error('❌ Error cleaning up old news:', error);
    throw error;
  }
};

module.exports = {
  fetchAndProcessNFLNews,
  setupNFLNewsJob,
  cleanupOldNews
}; 