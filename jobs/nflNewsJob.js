const cron = require('node-cron');
const News = require('../models/News');
const apiService = require('../services/apiService');

/**
 * Transform RapidAPI news article to our News schema
 */
const transformArticleToNews = (article) => {
  return {
    news_id: String(article.id),
    headline: article.headline || 'No Headline',
    description: article.description || 'No description available',
    image_url: article.images && article.images.length > 0 ? article.images[0].url : null,
    article_link: article.link || null,
    published_at: article.published ? new Date(article.published) : new Date(),
    source: 'api',
    category: categorizeNews(article.headline, article.description),
    tags: extractTags(article.headline, article.description),
    is_featured: false,
    view_count: 0
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
 * Process and upsert NFL news data
 */
const processNFLNews = async (newsData) => {
  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalSkipped = 0;

  try {
    if (!newsData.articles || !Array.isArray(newsData.articles)) {
      throw new Error('Invalid news data structure');
    }

    console.log(`📰 Processing ${newsData.articles.length} articles...`);

    for (const article of newsData.articles) {
      totalProcessed++;

      try {
        if (!article.id || !article.headline) {
          totalSkipped++;
          continue;
        }

        const newsData = transformArticleToNews(article);

        await News.findOneAndUpdate(
          { news_id: String(article.id) },
          newsData,
          { upsert: true, new: true, runValidators: true }
        );

        totalUpserted++;
        console.log(`✅ Upserted: ${newsData.headline.substring(0, 50)}...`);

      } catch (error) {
        console.error(`❌ Error processing article ${article.id}:`, error.message);
      }
    }

    console.log(`📊 Processed: ${totalProcessed}, Upserted: ${totalUpserted}, Skipped: ${totalSkipped}`);
    return { success: true, processed: totalProcessed, upserted: totalUpserted };

  } catch (error) {
    console.error('❌ Fatal error in NFL news processing:', error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Main function to fetch and process NFL news
 */
const fetchAndProcessNFLNews = async () => {
  console.log('\n🚀 Starting NFL News Fetch Job...');

  try {
    if (!process.env.RAPIDAPI_KEY) {
      console.error('❌ RAPIDAPI_KEY not configured');
      return;
    }

    const newsData = await apiService.fetchNFLNews();
    if (!newsData) throw new Error('No data received');

    const result = await processNFLNews(newsData);
    console.log('✅ NFL News Fetch Job finished\n');
    return result;

  } catch (error) {
    console.error(`❌ NFL News Fetch Job failed:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Setup cron job for NFL news fetching
 * Runs twice daily: at 00:00 and 12:00
 */
const setupNFLNewsJob = () => {
  const schedule = '0 0,12 * * *'; // Twice daily at midnight and noon
  
  console.log(`📰 Setting up NFL News cron job: ${schedule}`);
  
  const job = cron.schedule(schedule, async () => {
    await fetchAndProcessNFLNews();
  }, {
    scheduled: false, // Don't start immediately
    timezone: 'America/New_York' // NFL timezone
  });

  return {
    job,
    schedule,
    name: 'NFL News Fetch',
    description: 'Fetches NFL news from RapidAPI twice daily'
  };
};

/**
 * Manual news cleanup - remove old news articles (optional)
 */
const cleanupOldNews = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await News.deleteMany({
      published_at: { $lt: cutoffDate },
      is_featured: false,
      source: 'api'
    });

    console.log(`🧹 Cleaned up ${result.deletedCount} old news articles (older than ${daysOld} days)`);
    return result.deletedCount;

  } catch (error) {
    console.error('❌ Error cleaning up old news:', error.message);
    return 0;
  }
};

module.exports = {
  setupNFLNewsJob,
  fetchAndProcessNFLNews, // Export for manual testing
  processNFLNews, // Export for testing
  cleanupOldNews // Export for cleanup operations
}; 