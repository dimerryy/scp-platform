/**
 * Tests for API client
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import apiClient from '../../api/client'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should have correct base URL', () => {
    expect(apiClient.defaults.baseURL).toBe('http://localhost:8000')
  })

  it('should add Authorization header when token exists', async () => {
    localStorageMock.getItem.mockReturnValue('test-token')

    // Mock axios request
    const originalRequest = apiClient.request
    const mockRequest = vi.fn().mockResolvedValue({ data: {} })

    apiClient.request = mockRequest

    await apiClient.get('/test')

    expect(mockRequest).toHaveBeenCalled()
    const callConfig = mockRequest.mock.calls[0][0]
    expect(callConfig.headers?.Authorization).toBe('Bearer test-token')

    // Restore
    apiClient.request = originalRequest
  })

  it('should not add Authorization header when token is missing', async () => {
    localStorageMock.getItem.mockReturnValue(null)

    const originalRequest = apiClient.request
    const mockRequest = vi.fn().mockResolvedValue({ data: {} })

    apiClient.request = mockRequest

    await apiClient.get('/test')

    expect(mockRequest).toHaveBeenCalled()
    const callConfig = mockRequest.mock.calls[0][0]
    expect(callConfig.headers?.Authorization).toBeUndefined()

    // Restore
    apiClient.request = originalRequest
  })
})

