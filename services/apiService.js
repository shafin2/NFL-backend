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

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ API Request Error:', error.message);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        const { response, config } = error;
        if (response) {
          console.error(`❌ API Error: ${response.status} ${config?.url} - ${response.statusText}`);
        } else if (error.code === 'ECONNABORTED') {
          console.error(`⏰ API Timeout: ${config?.url}`);
        } else {
          console.error(`❌ API Network Error: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Fetch NFL schedule from Sportradar API
   */
  async fetchNFLSchedule() {
    try {
      const apiKey = process.env.SPORTRADAR_API_KEY;
      
      if (!apiKey) {
        throw new Error('SPORTRADAR_API_KEY is not configured in environment variables');
      }

      const response = await this.client.get(
        'https://api.sportradar.com/nfl/official/trial/v7/en/tournaments/d128603c-516d-4814-83bf-b14085503e1a/schedule.json',
        {
          headers: {
            'x-api-key': apiKey
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('🏈 Error fetching NFL schedule:', error.message);
      throw error;
    }
  }

  /**
   * Fetch NFL news from RapidAPI
   */
  async fetchNFLNews() {
    try {
      const rapidApiKey = process.env.RAPIDAPI_KEY;
      
      if (!rapidApiKey) {
        throw new Error('RAPIDAPI_KEY is not configured in environment variables');
      }

      const response = await this.client.get(
        'https://nfl-api-data.p.rapidapi.com/nfl-news',
        {
          headers: {
            'x-rapidapi-key': rapidApiKey,
            'x-rapidapi-host': 'nfl-api-data.p.rapidapi.com'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('📰 Error fetching NFL news:', error.message);
      throw error;
    }
  }

  /**
   * Generic GET request method
   */
  async get(url, config = {}) {
    try {
      const response = await this.client.get(url, config);
      return response.data;
    } catch (error) {
      console.error(`❌ GET request failed for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Generic POST request method
   */
  async post(url, data = {}, config = {}) {
    try {
      const response = await this.client.post(url, data, config);
      return response.data;
    } catch (error) {
      console.error(`❌ POST request failed for ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Check API health/connectivity
   */
  async healthCheck() {
    const checks = {
      sportradar: false,
      rapidapi: false
    };

    try {
      // Test Sportradar API (lightweight endpoint or just connectivity)
      if (process.env.SPORTRADAR_API_KEY) {
        // Note: Using a lighter endpoint or just checking headers
        await this.client.head('https://api.sportradar.com', {
          headers: { 'x-api-key': process.env.SPORTRADAR_API_KEY },
          timeout: 5000
        });
        checks.sportradar = true;
      }
    } catch (error) {
      console.warn('⚠️ Sportradar API health check failed:', error.message);
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