// Runtime configuration type
declare global {
  interface Window {
    RUNTIME_CONFIG?: {
      API_BASE_URL: string
      IS_PRODUCTION: boolean
    }
  }
}

// API Configuration - prioritize runtime config, then env vars, then defaults
export const API_BASE_URL =
  window.RUNTIME_CONFIG?.API_BASE_URL ||
  process.env.REACT_APP_API_BASE_URL ||
  'http://localhost:5004/api'

// Environment Configuration
export const IS_PRODUCTION =
  window.RUNTIME_CONFIG?.IS_PRODUCTION ??
  (process.env.REACT_APP_IS_PRODUCTION === 'true')

// Log the configuration being used
console.log('QuizHub Configuration:', {
  API_BASE_URL,
  IS_PRODUCTION,
  source: window.RUNTIME_CONFIG ? 'runtime config' : 'environment variables'
})
