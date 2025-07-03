# NFL Backend - Automated Cron Jobs Guide

## Overview

The NFL Backend now includes automated cron jobs that fetch and update NFL match schedules and news from external APIs. This system runs in the background to keep your app data fresh and up-to-date.

## 🔧 Configuration

### Environment Variables

Add these variables to your `.env` file:

```bash
# Enable/Disable cron jobs
ENABLE_CRON_JOBS=true

# Required API Keys
SPORTRADAR_API_KEY=your_sportradar_api_key_here
RAPIDAPI_KEY=your_rapidapi_key_here
```

### Getting API Keys

1. **Sportradar API Key**
   - Sign up at: https://developer.sportradar.com/
   - Choose NFL API trial/subscription
   - Get your API key from the dashboard

2. **RapidAPI Key**
   - Sign up at: https://rapidapi.com/
   - Subscribe to "NFL API Data" service
   - Get your API key from the dashboard

## 📅 Automated Jobs

### 1. NFL Schedule Job
- **Frequency**: Every 6 hours (00:00, 06:00, 12:00, 18:00 EST)
- **Source**: Sportradar NFL API
- **Purpose**: Fetch upcoming NFL games and update match schedules
- **Data**: Game schedules, teams, venues, dates

**Schedule Pattern**: `0 */6 * * *`

### 2. NFL News Job
- **Frequency**: Twice daily (00:00, 12:00 EST)
- **Source**: RapidAPI NFL News
- **Purpose**: Fetch latest NFL news articles
- **Data**: Headlines, descriptions, images, publication dates

**Schedule Pattern**: `0 0,12 * * *`

## 🚀 Server Integration

The cron jobs are automatically initialized when the server starts:

```javascript
// In server.js
const { scheduleJobs } = require('./jobs');

// Start cron jobs after database connection
scheduleJobs();
```

## 📊 Monitoring & Management

### Health Check
Check server and cron job status:
```bash
GET /health
```

Response includes cron job information:
```json
{
  "status": "OK",
  "cronJobs": {
    "total": 2,
    "running": 2,
    "jobs": [
      {
        "name": "NFL Schedule Fetch",
        "schedule": "0 */6 * * *",
        "running": true,
        "nextRun": "2025-01-13T12:00:00.000Z"
      }
    ]
  }
}
```

### Cron Jobs Status
Get detailed cron job status:
```bash
GET /admin/cron/status
```

### Manual Job Triggers
Manually trigger jobs for testing:
```bash
# Trigger NFL schedule job
POST /admin/cron/trigger/schedule

# Trigger NFL news job
POST /admin/cron/trigger/news
```

## 📁 File Structure

```
jobs/
├── index.js              # Main cron job coordinator
├── nflScheduleJob.js      # NFL schedule fetching job
└── nflNewsJob.js          # NFL news fetching job

services/
└── apiService.js          # Axios wrapper for external APIs

init-cron.js               # Alternative cron initialization (backup)
```

## 🔄 Data Flow

### Schedule Job Flow
1. Fetch schedule from Sportradar API
2. Parse `rounds[].games[]` data
3. Filter for `status: "scheduled"` games
4. Transform to Match schema format
5. Upsert to MongoDB using `game_id`
6. Set status to "upcoming"

### News Job Flow
1. Fetch articles from RapidAPI
2. Parse `articles[]` data
3. Extract headline, description, images
4. Categorize content (trade, injury, game, etc.)
5. Extract relevant tags
6. Upsert to MongoDB using `news_id`

## 🛡️ Error Handling

### Graceful Degradation
- Jobs continue if one API fails
- Missing API keys disable specific jobs
- Database errors are logged but don't crash server
- Network timeouts are handled with retries

### Logging
All job activities are logged with emojis for easy identification:
- 🚀 Job start
- ✅ Successful operations
- ❌ Errors
- ⏭️ Skipped operations
- 📊 Summary statistics

## 🧪 Testing

### Manual Testing
Test individual jobs manually:

```bash
# Test schedule job
curl -X POST http://localhost:3000/admin/cron/trigger/schedule

# Test news job
curl -X POST http://localhost:3000/admin/cron/trigger/news
```

### Local Development
For development, you can disable cron jobs:
```bash
ENABLE_CRON_JOBS=false
```

## 📈 Performance Considerations

### Database Operations
- Uses `findOneAndUpdate` with `upsert: true` for efficiency
- Batch operations for multiple records
- Proper indexing on `game_id` and `news_id`

### API Rate Limits
- Built-in request timeout (30 seconds)
- Proper error handling for rate limit responses
- Exponential backoff for failed requests

### Memory Management
- Jobs process data in chunks
- Cleanup of old news articles (configurable)
- Efficient transformation functions

## 🔧 Troubleshooting

### Common Issues

1. **Jobs not starting**
   - Check `ENABLE_CRON_JOBS=true`
   - Verify API keys are set
   - Check database connection

2. **API errors**
   - Verify API keys are valid
   - Check API service status
   - Review rate limit usage

3. **Database errors**
   - Ensure MongoDB is running
   - Check connection string
   - Verify collection permissions

### Debug Mode
Enable detailed logging:
```bash
NODE_ENV=development
```

### Manual Job Control
```javascript
// Stop all jobs
const { stopAllJobs } = require('./jobs');
stopAllJobs();

// Get job status
const { getJobsStatus } = require('./jobs');
console.log(getJobsStatus());
```

## 🚦 Production Deployment

### Environment Setup
1. Set production API keys
2. Configure timezone (default: America/New_York)
3. Enable cron jobs: `ENABLE_CRON_JOBS=true`
4. Monitor server logs for job execution

### Monitoring
- Check `/health` endpoint regularly
- Monitor API usage/quotas
- Watch for error patterns in logs
- Track data freshness in database

### Scaling Considerations
- Jobs are designed to run on single instance
- Database operations are atomic
- API calls are sequential to respect rate limits

## 📋 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health + cron status |
| GET | `/admin/cron/status` | Detailed cron job status |
| POST | `/admin/cron/trigger/schedule` | Manual schedule job trigger |
| POST | `/admin/cron/trigger/news` | Manual news job trigger |

---

## 🎯 Next Steps

With the cron jobs implemented, your NFL backend will automatically:
- ✅ Fetch fresh NFL schedules every 6 hours
- ✅ Update news articles twice daily
- ✅ Maintain up-to-date match information
- ✅ Provide comprehensive admin monitoring

Your React Native app can now rely on consistently fresh data without manual intervention! 