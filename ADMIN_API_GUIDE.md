# 🔐 NFL Backend - Complete Admin API Guide

Comprehensive documentation for all NFL backend admin APIs with authentication, CRUD operations, streaming management, and cron job monitoring.

## 🔑 Authentication System

### Token-Based Authentication
All admin endpoints require authentication using the `x-admin-token` header.

**Request Header:**
```bash
x-admin-token: your_secure_admin_token
```

**Environment Configuration:**
```env
# Single admin token
ADMIN_TOKEN=your_secure_admin_token

# Multiple admin tokens (comma-separated)
ADMIN_API_TOKENS=token1,token2,token3
```

### Authentication Flow
1. **Client Request**: Send admin token in `x-admin-token` header
2. **Server Validation**: Middleware validates token against environment config
3. **Access Control**: Valid token grants access, invalid returns 401 error
4. **Route Protection**: All `/admin/*` routes require authentication

### Authentication Responses

**Missing Token (401):**
```json
{
  "success": false,
  "error": "Access denied",
  "message": "Admin token required"
}
```

**Invalid Token (401):**
```json
{
  "success": false,
  "error": "Unauthorized", 
  "message": "Invalid admin token"
}
```

**Valid Authentication Example:**
```bash
curl -H "x-admin-token: mysecrettoken" \
     -H "Content-Type: application/json" \
     http://localhost:3000/admin/dashboard
```

---

## 📊 Dashboard & Analytics

### GET /admin/dashboard
Get comprehensive dashboard statistics for admin overview.

**Headers Required:**
```
x-admin-token: your_token
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "overview": {
      "total_matches": 150,
      "total_news": 89,
      "total_channels": 12,
      "active_channels": 10
    },
    "matches": {
      "total": 150,
      "live": 3,
      "replay": 120,
      "upcoming": 27,
      "by_status": {
        "upcoming": 27,
        "live": 3,
        "replay": 120
      }
    },
    "news": {
      "total": 89,
      "featured": 5,
      "by_category": {
        "general": 45,
        "trade": 15,
        "injury": 12,
        "game": 17
      },
      "by_source": {
        "api": 65,
        "manual": 24
      }
    },
    "channels": {
      "total": 12,
      "active": 10,
      "by_category": {
        "sports": 8,
        "news": 4
      }
    },
    "system": {
      "app_version": "1.0.0",
      "maintenance_mode": false,
      "cron_jobs_enabled": true
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

## 🏈 Match Management

### GET /admin/matches
Retrieve all matches with comprehensive filtering and pagination.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50, max: 100)
- `status` - Filter by status: upcoming/live/replay
- `season` - NFL season year (e.g., 2024)
- `week` - NFL week number (1-22)
- `team` - Team name search (partial match)
- `sort` - Sort field: scheduled_at/created_at/updated_at
- `order` - Sort order: asc/desc

**Example Request:**
```bash
curl -H "x-admin-token: mysecrettoken" \
  "http://localhost:3000/admin/matches?status=live&season=2024&page=1&limit=20&sort=scheduled_at&order=desc"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "matches": [
      {
        "_id": "64f01a2b3c4d5e6f7a8b9c0d",
        "game_id": "NFL2024_W1_KC_vs_BAL",
        "title": "Kansas City Chiefs vs Baltimore Ravens",
        "round": "Week 1",
        "status": "live",
        "scheduled_at": "2024-09-15T20:00:00.000Z",
        "home_team": "Kansas City Chiefs",
        "away_team": "Baltimore Ravens",
        "score": {
          "home": 14,
          "away": 10
        },
        "m3u8_links": [
          {
            "name": "Main Stream",
            "url": "https://example.com/stream.m3u8"
          }
        ],
        "live_channel_ids": ["64f01a2b3c4d5e6f7a8b9c0e"],
        "metadata": {
          "week": 1,
          "season": 2024,
          "venue": "Arrowhead Stadium",
          "weather": "Clear, 72°F"
        },
        "source": "api",
        "created_at": "2024-01-15T10:00:00.000Z",
        "updated_at": "2024-01-15T10:30:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 8,
      "total_count": 150,
      "limit": 20,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

### POST /admin/matches
Create a new match manually.

**Request Body:**
```json
{
  "game_id": "NFL2024_W1_KC_vs_BAL",
  "title": "Kansas City Chiefs vs Baltimore Ravens",
  "round": "Week 1",
  "status": "upcoming",
  "scheduled_at": "2024-09-15T20:00:00.000Z",
  "home_team": "Kansas City Chiefs",
  "away_team": "Baltimore Ravens",
  "metadata": {
    "week": 1,
    "season": 2024,
    "venue": "Arrowhead Stadium",
    "weather": "Clear, 72°F"
  },
  "score": {
    "home": 0,
    "away": 0
  }
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "match": {
      "_id": "64f01a2b3c4d5e6f7a8b9c0d",
      "game_id": "NFL2024_W1_KC_vs_BAL",
      "title": "Kansas City Chiefs vs Baltimore Ravens",
      // ... full match object
    }
  },
  "message": "Match created successfully"
}
```

### GET /admin/matches/:id
Get detailed match information by ID.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match": {
      // Full match object with all details
    }
  }
}
```

### PUT /admin/matches/:id
Update an existing match (partial updates supported).

**Request Body (Partial Update Example):**
```json
{
  "title": "Updated Game Title",
  "status": "live",
  "score": {
    "home": 21,
    "away": 14
  },
  "metadata": {
    "weather": "Overcast, 65°F"
  }
}
```

### DELETE /admin/matches/:id
Permanently delete a match.

**Response (200):**
```json
{
  "success": true,
  "message": "Match deleted successfully"
}
```

---

## 🎥 Streaming Management

### PUT /admin/matches/:id/replay-url
Add or update replay streaming URL for a match.

**Request Body:**
```json
{
  "url": "https://example.com/replay-stream.m3u8",
  "quality": "HD"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match": {
      "_id": "64f01a2b3c4d5e6f7a8b9c0d",
      "status": "replay",
      "m3u8_links": [
        {
          "name": "Replay",
          "url": "https://example.com/replay-stream.m3u8"
        }
      ]
    }
  },
  "message": "Replay URL added successfully"
}
```

### PUT /admin/matches/:id/live-links
Add multiple live streaming links to a match.

**Request Body:**
```json
{
  "links": [
    {
      "name": "Main Stream",
      "url": "https://example.com/main-stream.m3u8"
    },
    {
      "name": "Backup Stream",
      "url": "https://example.com/backup-stream.m3u8"
    },
    {
      "name": "Mobile Stream",
      "url": "https://example.com/mobile-stream.m3u8"
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match": {
      "_id": "64f01a2b3c4d5e6f7a8b9c0d",
      "status": "live",
      "m3u8_links": [
        {
          "name": "Main Stream",
          "url": "https://example.com/main-stream.m3u8"
        },
        {
          "name": "Backup Stream",
          "url": "https://example.com/backup-stream.m3u8"
        },
        {
          "name": "Mobile Stream",
          "url": "https://example.com/mobile-stream.m3u8"
        }
      ]
    }
  },
  "message": "Live streaming links updated successfully"
}
```

### PUT /admin/matches/:id/assign-channels
Assign broadcast channels to a live match.

**Request Body:**
```json
{
  "channel_ids": [
    "64f01a2b3c4d5e6f7a8b9c0d",
    "64f01a2b3c4d5e6f7a8b9c0e"
  ]
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match": {
      "_id": "64f01a2b3c4d5e6f7a8b9c0d",
      "live_channel_ids": [
        "64f01a2b3c4d5e6f7a8b9c0d",
        "64f01a2b3c4d5e6f7a8b9c0e"
      ]
    }
  },
  "message": "Channels assigned successfully"
}
```

---

## 📺 Channel Management

### GET /admin/channels
Retrieve all channels with filtering options.

**Query Parameters:**
- `page`, `limit` - Pagination
- `category` - Channel category (sports/news/entertainment)
- `is_active` - Filter by active status (true/false)
- `sort` - Sort field: name/created_at/sort_order
- `search` - Search by channel name

**Response (200):**
```json
{
  "success": true,
  "data": {
    "channels": [
      {
        "_id": "64f01a2b3c4d5e6f7a8b9c0d",
        "name": "ESPN HD",
        "description": "ESPN High Definition Sports Channel",
        "logo_url": "https://example.com/espn-logo.png",
        "category": "sports",
        "is_active": true,
        "sort_order": 1,
        "created_at": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_count": 12,
      "limit": 20
    }
  }
}
```

### POST /admin/channels
Create a new broadcast channel.

**Request Body:**
```json
{
  "name": "ESPN HD",
  "description": "ESPN High Definition Sports Channel",
  "logo_url": "https://example.com/espn-logo.png",
  "category": "sports",
  "is_active": true,
  "sort_order": 1
}
```

### GET /admin/channels/:id
Get detailed channel information.

### PUT /admin/channels/:id
Update channel information.

### DELETE /admin/channels/:id
Delete a channel (only if not assigned to any matches).

---

## 📰 News Management

### GET /admin/news
Retrieve all news articles with comprehensive filtering.

**Query Parameters:**
- `page`, `limit` - Pagination
- `category` - News category (general/trade/injury/game/draft/playoff)
- `source` - News source (api/manual)
- `is_featured` - Featured articles only (true/false)
- `search` - Search in headline and description
- `date_from`, `date_to` - Filter by publication date range

**Response (200):**
```json
{
  "success": true,
  "data": {
    "news": [
      {
        "_id": "64f01a2b3c4d5e6f7a8b9c0d",
        "news_id": "NFL_NEWS_2024_001",
        "headline": "Chiefs Sign New Quarterback",
        "description": "Kansas City Chiefs have signed a promising new quarterback for the upcoming season...",
        "image_url": "https://example.com/news-image.jpg",
        "article_link": "https://example.com/full-article",
        "published_at": "2024-01-15T10:00:00.000Z",
        "category": "trade",
        "tags": ["chiefs", "quarterback", "nfl"],
        "is_featured": false,
        "source": "manual",
        "view_count": 1250,
        "created_at": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_count": 89,
      "limit": 20
    }
  }
}
```

### POST /admin/news
Create a new news article.

**Request Body:**
```json
{
  "news_id": "NFL_NEWS_2024_001",
  "headline": "Chiefs Sign New Quarterback",
  "description": "Kansas City Chiefs have signed a promising new quarterback for the upcoming season. The new addition is expected to strengthen the team's offensive capabilities...",
  "image_url": "https://example.com/news-image.jpg",
  "article_link": "https://example.com/full-article",
  "published_at": "2024-01-15T10:00:00.000Z",
  "category": "trade",
  "tags": ["chiefs", "quarterback", "nfl", "2024"],
  "is_featured": false
}
```

### GET /admin/news/:id
Get detailed news article information.

### PUT /admin/news/:id
Update news article content.

### DELETE /admin/news/:id
Delete news article permanently.

### PUT /admin/news/:id/toggle-featured
Toggle the featured status of a news article.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "news": {
      "_id": "64f01a2b3c4d5e6f7a8b9c0d",
      "is_featured": true
    }
  },
  "message": "News article featured status updated"
}
```

### PUT /admin/news/bulk-update
Bulk update multiple news articles.

**Request Body:**
```json
{
  "ids": [
    "64f01a2b3c4d5e6f7a8b9c0d",
    "64f01a2b3c4d5e6f7a8b9c0e",
    "64f01a2b3c4d5e6f7a8b9c0f"
  ],
  "update_data": {
    "category": "general",
    "is_featured": false
  }
}
```

---

## ⚙️ App Settings Management

### GET /admin/app-settings
Get current application settings configuration.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "_id": "64f01a2b3c4d5e6f7a8b9c0d",
      "app_version": "1.0.1",
      "force_update": false,
      "min_supported_version": "1.0.0",
      "ads": {
        "enable_banner": true,
        "enable_interstitial": false,
        "banner_frequency": 30,
        "interstitial_frequency": 180,
        "ad_network": "admob"
      },
      "maintenance": {
        "is_enabled": false,
        "message": "App under scheduled maintenance",
        "start_time": null,
        "end_time": null
      },
      "features": {
        "live_streaming": true,
        "replays": true,
        "news": true,
        "push_notifications": true,
        "social_sharing": true
      },
      "api_config": {
        "base_url": "https://api.nflapp.com",
        "timeout": 30000
      },
      "updated_at": "2024-01-15T10:00:00.000Z"
    }
  }
}
```

### PUT /admin/app-settings
Update application settings.

**Request Body:**
```json
{
  "app_version": "1.0.2",
  "force_update": true,
  "min_supported_version": "1.0.0",
  "ads": {
    "enable_banner": true,
    "enable_interstitial": true,
    "banner_frequency": 45,
    "interstitial_frequency": 300
  },
  "maintenance": {
    "is_enabled": false,
    "message": "Scheduled maintenance from 2-4 AM EST",
    "start_time": "2024-01-16T02:00:00.000Z",
    "end_time": "2024-01-16T04:00:00.000Z"
  },
  "features": {
    "live_streaming": true,
    "replays": true,
    "news": true,
    "push_notifications": true,
    "social_sharing": false
  }
}
```

---

## 🕐 Cron Jobs Management

### GET /admin/cron/status
Get current status of all automated cron jobs.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "total": 2,
    "running": 2,
    "stopped": 0,
    "jobs": [
      {
        "name": "NFL Schedule Fetch",
        "schedule": "0 */6 * * *",
        "description": "Fetches NFL schedule from Sportradar API every 6 hours",
        "running": true,
        "nextRun": "2024-01-15T18:00:00.000Z",
        "lastRun": "2024-01-15T12:00:00.000Z",
        "status": "healthy"
      },
      {
        "name": "NFL News Fetch",
        "schedule": "0 0,12 * * *",
        "description": "Fetches NFL news from RapidAPI twice daily",
        "running": true,
        "nextRun": "2024-01-16T00:00:00.000Z",
        "lastRun": "2024-01-15T12:00:00.000Z",
        "status": "healthy"
      }
    ]
  },
  "timestamp": "2024-01-15T15:30:00.000Z"
}
```

### POST /admin/cron/trigger/:jobName
Manually trigger a specific cron job for testing.

**Available Job Names:**
- `schedule` or `nfl-schedule`
- `news` or `nfl-news`

**Example:**
```bash
curl -X POST -H "x-admin-token: mysecrettoken" \
  http://localhost:3000/admin/cron/trigger/schedule
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "job_name": "NFL Schedule Fetch",
    "triggered_at": "2024-01-15T15:30:00.000Z",
    "result": {
      "success": true,
      "processed": 45,
      "upserted": 12,
      "skipped": 33,
      "errors": 0
    }
  },
  "message": "NFL Schedule job triggered successfully"
}
```

---

## 🔄 Common Admin Workflows

### 1. Complete Match Setup with Live Streaming
```bash
# Step 1: Create match
curl -X POST \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "game_id": "NFL2024_W1_KC_vs_BAL",
    "title": "Chiefs vs Ravens - Week 1",
    "round": "Week 1",
    "scheduled_at": "2024-09-15T20:00:00.000Z",
    "home_team": "Kansas City Chiefs",
    "away_team": "Baltimore Ravens",
    "metadata": {
      "week": 1,
      "season": 2024,
      "venue": "Arrowhead Stadium"
    }
  }' \
  http://localhost:3000/admin/matches

# Step 2: Add live streaming links
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "links": [
      {
        "name": "Main Stream HD",
        "url": "https://example.com/main-hd.m3u8"
      },
      {
        "name": "Backup Stream",
        "url": "https://example.com/backup.m3u8"
      }
    ]
  }' \
  http://localhost:3000/admin/matches/MATCH_ID/live-links

# Step 3: Assign channels
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_ids": ["CHANNEL_ID_1", "CHANNEL_ID_2"]
  }' \
  http://localhost:3000/admin/matches/MATCH_ID/assign-channels
```

### 2. Featured News Article Management
```bash
# Create featured news article
curl -X POST \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "headline": "Breaking: Major NFL Trade Announcement",
    "description": "A blockbuster trade has shaken up the NFL landscape...",
    "category": "trade",
    "is_featured": true,
    "tags": ["trade", "breaking", "nfl"]
  }' \
  http://localhost:3000/admin/news

# Toggle featured status
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  http://localhost:3000/admin/news/NEWS_ID/toggle-featured
```

### 3. App Maintenance Mode
```bash
# Enable maintenance mode
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenance": {
      "is_enabled": true,
      "message": "App is undergoing scheduled maintenance. Please check back in 2 hours.",
      "start_time": "2024-01-16T02:00:00.000Z",
      "end_time": "2024-01-16T04:00:00.000Z"
    }
  }' \
  http://localhost:3000/admin/app-settings
```

---

## 🛡️ Security & Best Practices

### Authentication Security
1. **Secure Token Storage**: Store `ADMIN_TOKEN` in environment variables, never in code
2. **HTTPS Required**: Use HTTPS in production for secure token transmission
3. **Token Rotation**: Regularly rotate admin tokens for enhanced security
4. **Access Logging**: Monitor admin API usage for suspicious activity

### Input Validation
- All request bodies are validated using Mongoose schemas
- Required fields are enforced
- Data type validation prevents injection attacks
- Maximum field lengths prevent overflow attacks

### Rate Limiting
- Admin routes inherit the same rate limiting as public APIs (100 requests per 15 minutes)
- Consider implementing separate, more restrictive limits for admin endpoints in production

### Error Handling
- Comprehensive error responses for debugging
- Sensitive information is never exposed in error messages
- Database errors are sanitized before sending to client

---

## 📋 Standard Response Formats

### Success Response Structure
```json
{
  "success": true,
  "data": {
    // Response data here (object, array, or primitive)
  },
  "message": "Operation completed successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Error Response Structure
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### Pagination Response Structure
```json
{
  "success": true,
  "data": {
    "items": [/* array of items */],
    "pagination": {
      "current_page": 1,
      "total_pages": 10,
      "total_count": 200,
      "limit": 20,
      "has_next_page": true,
      "has_prev_page": false
    }
  }
}
```

---

## 🚀 Ready for Frontend Development

With these comprehensive admin APIs, you can now build:
- **Complete Admin Dashboard** with real-time statistics
- **Match Management Interface** with streaming controls
- **News Content Management** with bulk operations
- **Channel Administration** with assignment capabilities
- **App Settings Control** with feature toggles
- **Cron Job Monitoring** with manual trigger options

All endpoints are fully tested, documented, and ready for integration with your React.js admin panel! 🎯 