# 🔐 Admin API Guide

Complete documentation for all NFL backend admin APIs with authentication, CRUD operations, and streaming management.

## 🔑 Authentication

All admin endpoints require authentication using the `x-admin-token` header.

```bash
curl -H "x-admin-token: mysecrettoken" http://localhost:3000/admin/dashboard
```

**Environment Variable:**
```env
ADMIN_TOKEN=mysecrettoken
```

---

## 📊 Dashboard

### GET /admin/dashboard
Get overview statistics for admin dashboard.

**Response:**
```json
{
  "success": true,
  "data": {
    "matches": {
      "total": 150,
      "live": 3,
      "replay": 120,
      "upcoming": 27
    },
    "news": {
      "total": 89,
      "featured": 5
    },
    "channels": {
      "total": 12,
      "active": 10
    }
  }
}
```

---

## 🏈 Match Management

### GET /admin/matches
Get all matches with admin filters.

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)  
- `status` - Match status (upcoming/live/replay)
- `season` - NFL season year
- `week` - NFL week number

**Example:**
```bash
curl -H "x-admin-token: mysecrettoken" \
  "http://localhost:3000/admin/matches?status=live&page=1&limit=20"
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
    "venue": "Arrowhead Stadium"
  }
}
```

### PUT /admin/matches/:id
Update an existing match.

**Request Body:** (Partial update supported)
```json
{
  "title": "Updated Game Title",
  "status": "live",
  "score": {
    "home": 14,
    "away": 10
  }
}
```

### DELETE /admin/matches/:id
Delete a match permanently.

---

## 🎥 Streaming Management

### PUT /admin/matches/:id/replay-url
Add or update replay streaming URL.

**Request Body:**
```json
{
  "url": "https://example.com/replay-stream.m3u8"
}
```

**Effect:**
- Sets match status to `replay`
- Adds m3u8 link with name "Replay"

### PUT /admin/matches/:id/live-links
Add multiple live streaming links.

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
    }
  ]
}
```

**Effect:**
- Sets match status to `live`
- Replaces all existing m3u8 links

### PUT /admin/matches/:id/assign-channels
Assign channels to a live match.

**Request Body:**
```json
{
  "channel_ids": [
    "64f01a2b3c4d5e6f7a8b9c0d",
    "64f01a2b3c4d5e6f7a8b9c0e"
  ]
}
```

---

## 📺 Channel Management

### GET /admin/channels
Get all channels.

**Query Parameters:**
- `page`, `limit` - Pagination
- `category` - Channel category
- `is_active` - Filter by active status

### POST /admin/channels
Create a new channel.

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
Get channel details by ID.

### PUT /admin/channels/:id
Update channel information.

### DELETE /admin/channels/:id
Delete a channel (only if not assigned to any matches).

---

## 📰 News Management

### GET /admin/news
Get all news articles.

**Query Parameters:**
- `page`, `limit` - Pagination
- `category` - News category
- `source` - News source (api/manual)
- `is_featured` - Featured articles only

### POST /admin/news
Create a new news article.

**Request Body:**
```json
{
  "news_id": "NFL_NEWS_2024_001",
  "headline": "Chiefs Sign New Quarterback",
  "description": "Kansas City Chiefs have signed a promising new quarterback...",
  "image_url": "https://example.com/news-image.jpg",
  "article_link": "https://example.com/full-article",
  "published_at": "2024-01-15T10:00:00.000Z",
  "category": "trade",
  "tags": ["chiefs", "quarterback", "nfl"],
  "is_featured": false
}
```

### GET /admin/news/:id
Get news article by ID.

### PUT /admin/news/:id
Update news article.

### DELETE /admin/news/:id
Delete news article.

### PUT /admin/news/:id/toggle-featured
Toggle featured status of a news article.

### PUT /admin/news/bulk-update
Bulk update multiple news articles.

**Request Body:**
```json
{
  "ids": [
    "64f01a2b3c4d5e6f7a8b9c0d",
    "64f01a2b3c4d5e6f7a8b9c0e"
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
Get current app settings.

### PUT /admin/app-settings
Update app settings.

**Request Body Example:**
```json
{
  "app_version": "1.0.1",
  "force_update": true,
  "min_supported_version": "1.0.0",
  "ads": {
    "enable_banner": true,
    "enable_interstitial": false,
    "banner_frequency": 30,
    "interstitial_frequency": 180
  },
  "maintenance": {
    "is_enabled": false,
    "message": "App under maintenance",
    "start_time": "2024-01-15T02:00:00.000Z",
    "end_time": "2024-01-15T04:00:00.000Z"
  },
  "features": {
    "live_streaming": true,
    "replays": true,
    "news": true,
    "push_notifications": true
  }
}
```

---

## 🔥 Common Usage Examples

### 1. Create Match and Add Live Stream
```bash
# 1. Create match
curl -X POST \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "game_id": "NFL2024_W1_KC_vs_BAL",
    "title": "Chiefs vs Ravens",
    "round": "Week 1", 
    "scheduled_at": "2024-09-15T20:00:00.000Z",
    "home_team": "Kansas City Chiefs",
    "away_team": "Baltimore Ravens"
  }' \
  http://localhost:3000/admin/matches

# 2. Add live streaming links (use returned match ID)
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "links": [
      {
        "name": "Main Stream",
        "url": "https://example.com/main.m3u8"
      }
    ]
  }' \
  http://localhost:3000/admin/matches/MATCH_ID/live-links
```

### 2. Create Channel and Assign to Match
```bash
# 1. Create channel
curl -X POST \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ESPN HD",
    "category": "sports"
  }' \
  http://localhost:3000/admin/channels

# 2. Assign to match (use returned channel ID)
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "channel_ids": ["CHANNEL_ID"]
  }' \
  http://localhost:3000/admin/matches/MATCH_ID/assign-channels
```

### 3. Feature News Article
```bash
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  http://localhost:3000/admin/news/NEWS_ID/toggle-featured
```

### 4. Enable Maintenance Mode
```bash
curl -X PUT \
  -H "x-admin-token: mysecrettoken" \
  -H "Content-Type: application/json" \
  -d '{
    "maintenance": {
      "is_enabled": true,
      "message": "Scheduled maintenance in progress"
    }
  }' \
  http://localhost:3000/admin/app-settings
```

---

## 🛡️ Security Notes

1. **Token Security:** Store `ADMIN_TOKEN` securely in environment variables
2. **HTTPS:** Use HTTPS in production for token transmission
3. **Rate Limiting:** Admin routes inherit the same rate limiting as public APIs
4. **Validation:** All inputs are validated using Mongoose schemas
5. **Error Handling:** Comprehensive error responses for debugging

---

## 📋 Response Format

All admin endpoints follow the same response structure:

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "message": "Operation completed successfully"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

---

## 🚀 Next Steps

With these admin APIs, you can now:
- Build an admin dashboard/panel
- Manage all NFL content
- Control app settings and features
- Handle live streaming and replays
- Manage news and channels

Ready for **Prompt 3** - Cron jobs and automated data fetching! 🎯 