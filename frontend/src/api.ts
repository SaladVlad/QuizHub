// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5004/api'

// Environment Configuration  
export const IS_PRODUCTION = process.env.REACT_APP_IS_PRODUCTION === 'true'

// Validate required environment variables
if (!process.env.REACT_APP_API_BASE_URL) {
  console.warn('REACT_APP_API_BASE_URL is not set, using default: http://localhost:5004/api')
}
