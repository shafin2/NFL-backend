const axios = require('axios');

class ApiService {
  constructor() {
    // Create axios instance with common config
    this.client = axios.create({
      timeout: 30000, // 30 seconds timeout
      headers: {
        'User-Agent': 'NFL-Backend/1.0.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Store API call stats
    this.stats = {
      rapidapi_nfl_news: {
        endpoint: 'NFL News API',
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        total_response_time: 0,
        min_response_time: 0,
        max_response_time: 0,
        last_call_at: null,
        last_success_at: null,
        last_failure_at: null
      },
      sportsblaze_schedule: {
        endpoint: 'NFL Schedule API',
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        total_response_time: 0,
        min_response_time: 0,
        max_response_time: 0,
        last_call_at: null,
        last_success_at: null,
        last_failure_at: null
      }
    };

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Add request interceptor for tracking start time
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: Date.now() };
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging and tracking
    this.client.interceptors.response.use(
      (response) => {
        const endTime = Date.now();
        const startTime = response.config.metadata?.startTime || endTime;
        const responseTime = endTime - startTime;
        
        // Update stats
        this.updateStats(response.config.url, true, responseTime);
        
        // Track API call if jobHistory is provided
        if (response.config.jobHistory) {
          this.trackApiCall(response.config, response.status, responseTime, true);
        }
        
        console.log(`✅ API Response: ${response.status} ${response.config.url} (${responseTime}ms)`);
        return response;
      },
      (error) => {
        const endTime = Date.now();
        const startTime = error.config?.metadata?.startTime || endTime;
        const responseTime = endTime - startTime;
        const { response, config } = error;
        
        // Update stats
        this.updateStats(config?.url, false, responseTime);
        
        // Track API call if jobHistory is provided
        if (config?.jobHistory) {
          this.trackApiCall(config, response?.status || 0, responseTime, false, error.message);
        }
        
        if (response) {
          console.error(`❌ API Error: ${response.status} ${config?.url} - ${response.statusText} (${responseTime}ms)`);
        } else if (error.code === 'ECONNABORTED') {
          console.error(`⏰ API Timeout: ${config?.url} (${responseTime}ms)`);
        } else {
          console.error(`❌ API Network Error: ${error.message} (${responseTime}ms)`);
        }
        return Promise.reject(error);
      }
    );
  }

  updateStats(url, success, responseTime) {
    this.stats.totalCalls++;
    if (success) {
      this.stats.successfulCalls++;
    } else {
      this.stats.failedCalls++;
    }

    // Update average response time
    this.stats.averageResponseTime = Math.round(
      (this.stats.averageResponseTime * (this.stats.totalCalls - 1) + responseTime) / this.stats.totalCalls
    );

    // Update service-specific stats
    let service = 'unknown';
    if (url?.includes('rapidapi.com')) {
      service = 'rapidapi_nfl_news';
    } else if (url?.includes('sportsblaze.com')) {
      service = 'sportsblaze_schedule';
    }

    if (this.stats.callsByService[service]) {
      const serviceStats = this.stats.callsByService[service];
      serviceStats.total++;
      serviceStats.totalTime += responseTime;
      if (success) {
        serviceStats.success++;
      } else {
        serviceStats.failed++;
      }
    }
  }

  trackApiCall(config, statusCode, responseTime, success, errorMessage = null) {
    const jobHistory = config.jobHistory;
    let service = 'unknown';
    let endpoint = config.url;

    if (config.url?.includes('rapidapi.com')) {
      service = 'rapidapi_nfl_news';
    } else if (config.url?.includes('sportsblaze.com')) {
      service = 'sportsblaze_schedule';
    }

    // Use async/await properly and handle errors
    if (jobHistory && jobHistory.addApiCall) {
      jobHistory.addApiCall(service, endpoint, statusCode, responseTime, success, errorMessage)
        .catch(error => {
          console.warn('Failed to track API call:', error.message);
        });
    }
  }

  async makeRequest(service, endpoint, config = {}) {
    const startTime = Date.now();
    let success = false;
    let errorMessage = null;
    
    try {
      const response = await axios(config);
      success = true;
      const responseTime = Date.now() - startTime;
      
      await this.recordApiCall(service, endpoint, responseTime, success);
      
      return response.data;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      errorMessage = error.response?.data?.message || error.message;
      
      await this.recordApiCall(service, endpoint, responseTime, success, errorMessage);
      
      throw error;
    }
  }

  async getNFLNews(limit = 50) {
    const config = {
      method: 'GET',
      url: 'https://nfl-news-api.p.rapidapi.com/nfl-news',
      params: { limit },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'nfl-news-api.p.rapidapi.com'
      }
    };

    return await this.makeRequest('rapidapi_nfl_news', 'nfl-news', config);
  }

  async getNFLSchedule(season = '2024') {
    const config = {
      method: 'GET',
      url: `https://api.sportsblaze.com/v1/nfl/schedule?season=${season}`,
      headers: {
        'Authorization': `Bearer ${process.env.SPORTSBLAZE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    };

    return await this.makeRequest('sportsblaze_schedule', 'schedule', config);
  }

  getStats() {
    const processedStats = {};
    
    for (const [service, stats] of Object.entries(this.stats)) {
      processedStats[service] = {
        ...stats,
        avg_response_time: stats.total_calls > 0 ? stats.total_response_time / stats.total_calls : 0,
        success_rate: stats.total_calls > 0 ? (stats.successful_calls / stats.total_calls) * 100 : 0
      };
    }
    
    return processedStats;
  }

  resetStats() {
    for (const service in this.stats) {
      this.stats[service] = {
        ...this.stats[service],
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        total_response_time: 0,
        min_response_time: 0,
        max_response_time: 0,
        last_call_at: null,
        last_success_at: null,
        last_failure_at: null
      };
    }
  }

  /**
   * Check API health/connectivity
   */
  async healthCheck() {
    const checks = {
      sportsblaze: false,
      rapidapi: false
    };

    try {
      // Test SportsBlaze API (lightweight endpoint or just connectivity)
      if (process.env.SPORTSBLAZE_API_KEY) {
        // Note: Using a lighter endpoint or just checking headers
        await this.client.head('https://api.sportsblaze.com', {
          timeout: 5000
        });
        checks.sportsblaze = true;
      }
    } catch (error) {
      console.warn('⚠️ SportsBlaze API health check failed:', error.message);
    }

    try {
      // Test RapidAPI connectivity
      if (process.env.RAPIDAPI_KEY) {
        await this.client.head('https://nfl-api-data.p.rapidapi.com', {
          headers: {
            'x-rapidapi-key': process.env.RAPIDAPI_KEY,
            'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com'
          },
          timeout: 5000
        });
        checks.rapidapi = true;
      }
    } catch (error) {
      console.warn('⚠️ RapidAPI health check failed:', error.message);
    }

    return checks;
  }
}

// Export singleton instance
module.exports = new ApiService(); 