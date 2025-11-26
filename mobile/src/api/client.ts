import axios, { AxiosError, type AxiosResponse } from 'axios'
import { API_BASE_URL } from '../config'
import { getAccessToken } from './authStorage'

/**
 * Axios instance configured for the SCP backend API
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 120 second timeout (increased for order creation which may take longer)
  maxRedirects: 0, // Prevent redirects that can cause timeouts
  validateStatus: (status) => status >= 200 && status < 300, // Only treat 2xx as success
})

/**
 * Request interceptor: Add Authorization header with token
 */
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await getAccessToken()
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`
      }
    } catch (error) {
      console.error('Failed to get access token for request:', error)
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

/**
 * Response interceptor: Handle errors, especially 401 (unauthorized)
 * 
 * Note: We log 401 errors here. In the future, we can hook this into
 * AuthContext to automatically logout the user when token expires.
 */
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    const url = error.config?.url || ''
    const isLoginEndpoint = url.includes('/auth/login')
    
    if (error.response?.status === 401) {
      // Don't log login failures - they're expected and handled by the UI
      if (!isLoginEndpoint) {
        console.warn('Received 401 Unauthorized - token may be expired or invalid')
        // TODO: Hook into AuthContext to trigger logout
        // This can be done by emitting an event or using a callback
      }
    }

    // Log other errors for debugging (but skip login endpoint errors)
    if (error.response && !isLoginEndpoint) {
      // Server responded with error status
      console.error('API Error:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
      })
    } else if (error.request && !isLoginEndpoint) {
      // Request was made but no response received
      console.error('Network Error:', error.message)
    } else if (!isLoginEndpoint) {
      // Something else happened
      console.error('Request Error:', error.message)
    }

    return Promise.reject(error)
  }
)

export default apiClient
