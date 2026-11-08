# NFL Backend API

A Node.js/Express backend for an NFL streaming and updates mobile app built with React Native.

## 🏗️ Architecture

This backend provides APIs for:
- **NFL Match Schedule** - Upcoming games
- **Live Streaming** - Live matches with HLS (m3u8) links  
- **Replays** - Past game replays
- **News** - Latest NFL news and updates
- **App Settings** - Version control, ads, maintenance mode

## 📦 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Cron Jobs:** node-cron
- **Security:** Helmet, CORS, Rate Limiting
- **Pagination:** mongoose-paginate-v2

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the sample environment file and configure your settings:
```bash
cp env.sample .env
```

Edit `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nfl_app
# Add your API keys and other settings
```

### 3. Start MongoDB
Make sure MongoDB is running locally or update `MONGODB_URI` for MongoDB Atlas.

### 4. Run the Server
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## 📊 API Endpoints

### Health Check
- `GET /health` - Server health status

### Match Endpoints
- `GET /api/schedule` - Get upcoming matches
- `GET /api/replays` - Get replay matches  
- `GET /api/live` - Get live matches with streaming links
- `GET /api/matches/:id` - Get match details by ID

### News Endpoints
- `GET /api/news` - Get latest news (with pagination)
- `GET /api/news/featured` - Get featured news
- `GET /api/news/search?q=query` - Search news articles
- `GET /api/news/category/:category` - Get news by category
- `GET /api/news/:id` - Get news article by ID

### App Settings
- `GET /api/app-settings` - Get current app configuration
- `GET /api/app-settings/version-check?client_version=1.0.0` - Check version compatibility
- `GET /api/app-settings/features` - Get feature flags
- `GET /api/app-settings/ads` - Get ad configuration

### Admin Endpoints (Protected)
- `GET /admin/dashboard` - Admin dashboard stats
- `GET/POST/PUT/DELETE /admin/matches` - Match CRUD operations
- `PUT /admin/matches/:id/replay-url` - Add replay streaming links
- `PUT /admin/matches/:id/live-links` - Add live streaming links  
- `PUT /admin/matches/:id/assign-channels` - Assign channels to matches
- `GET/POST/PUT/DELETE /admin/channels` - Channel CRUD operations
- `GET/POST/PUT/DELETE /admin/news` - News CRUD operations
- `GET/PUT /admin/app-settings` - App settings management

**Authentication:** All admin endpoints require `x-admin-token` header

## 🔧 Query Parameters

### Pagination (Most endpoints)
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20)

### Match Filters
- `week` - NFL week number
- `season` - NFL season year
- `team` - Team name (partial match)

### News Filters  
- `category` - News category (general, trade, injury, game, draft, playoff)
- `featured` - Featured articles only (true/false)
- `source` - News source (api/manual)

## 📱 Response Format

All API responses follow this structure:
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "message": "Operation successful"
}
```

### Error Responses
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message"
}
```

## 🗄️ Database Models

### Match
- `game_id` - Unique game identifier
- `title` - Match title
- `round` - Game round/week
- `status` - upcoming | replay | live
- `scheduled_at` - Game date/time
- `home_team` / `away_team` - Team names
- `m3u8_links` - Array of streaming links
- `live_channel_ids` - References to channels
- `score` - Game score object
- `metadata` - Additional game info

### News  
- `news_id` - Unique news identifier
- `headline` - News headline
- `description` - News content
- `image_url` - Featured image
- `article_link` - External article link
- `published_at` - Publication date
- `category` - News category
- `is_featured` - Featured flag

### Channel
- `name` - Channel name
- `description` - Channel description
- `logo_url` - Channel logo
- `is_active` - Active status

### AppSettings
- `app_version` - Current app version
- `force_update` - Force update flag
- `ads` - Ad configuration
- `maintenance` - Maintenance mode settings
- `features` - Feature toggles

## 🔄 Cron Jobs ✅

Automated scheduled tasks running in background:

### Active Jobs
- **NFL Schedule Fetch** - Every 6 hours from Sportradar API
- **NFL News Fetch** - Twice daily from RapidAPI

### Cron Management Endpoints
- `GET /admin/cron/status` - Get cron job status and monitoring
- `POST /admin/cron/trigger/schedule` - Manually trigger schedule fetch
- `POST /admin/cron/trigger/news` - Manually trigger news fetch

### Configuration
Set these environment variables:
```env
ENABLE_CRON_JOBS=true
SPORTRADAR_API_KEY=your_sportradar_key
RAPIDAPI_KEY=your_rapidapi_key
```

See `CRON_JOBS_GUIDE.md` for complete setup instructions.

## 🛡️ Security Features

- **Rate Limiting** - 100 requests per 15 minutes per IP
- **CORS** - Cross-origin request handling
- **Helmet** - Security headers
- **Input Validation** - Mongoose schema validation
- **Error Handling** - Comprehensive error responses

## 📈 Performance

- **Database Indexing** - Optimized queries
- **Response Compression** - Gzip compression
- **Pagination** - Efficient data loading
- **Lean Queries** - Optimized MongoDB queries

## 🔧 Development

### Project Structure
```
├── config/              # Database configuration
├── controllers/         # Route logic
│   ├── admin/          # Admin controllers
│   ├── matchController.js
│   ├── newsController.js
│   └── appSettingsController.js
├── middleware/         # Authentication & security
├── models/             # Mongoose schemas
├── routes/             # API routes
│   ├── admin/         # Admin routes (protected)
│   ├── matchRoutes.js
│   ├── newsRoutes.js
│   └── appSettingsRoutes.js
├── jobs/              # Automated cron jobs
│   ├── index.js       # Job manager
│   ├── nflScheduleJob.js
│   └── nflNewsJob.js
├── services/          # External API services
│   └── apiService.js  # Axios wrapper
├── server.js          # Main application
├── package.json       # Dependencies
├── env.sample         # Environment template
├── ADMIN_API_GUIDE.md # Admin API documentation
├── CRON_JOBS_GUIDE.md # Cron jobs setup guide
└── PHASE_3_COMPLETE.md # Implementation summary
```

### Adding New Features
1. Create model in `/models`
2. Add controller logic in `/controllers` 
3. Define routes in `/routes`
4. Import routes in `server.js`

## 🚦 Completed Features ✅

1. **Public APIs** - Match schedules, news, app settings ✅
2. **Admin APIs** - Complete CRUD operations for all entities ✅
3. **Cron Jobs** - Automated data fetching from external APIs ✅
4. **Authentication** - Token-based admin authentication ✅

## 🚀 Future Enhancements

1. **File Upload** - Image upload for news and channels
2. **Real-time Updates** - WebSocket support for live scores
3. **Push Notifications** - Game alerts and news notifications
4. **Analytics** - User engagement and content metrics
5. **Caching** - Redis integration for improved performance

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include input validation
4. Update documentation
5. Test all endpoints

## 📄 License

MIT License - see LICENSE file for details


---

## Author

Built by **[Shafin Zaman](https://www.shafinzaman.dev)** (Shafin Uz Zaman), Senior AI Engineer. Case study: [NFL Streaming App](https://www.shafinzaman.dev/work/nfl-streaming). More of my work: [shafinzaman.dev/work](https://www.shafinzaman.dev/work).
