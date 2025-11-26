/**
 * Tests for AuthContext
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import type { User } from '../../types/api'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('AuthContext', () => {
  beforeEach(() => {
    localStorageMock.clear()
  })

  it('should initialize with no user when localStorage is empty', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    expect(result.current.user).toBeNull()
    expect(result.current.accessToken).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should restore user from localStorage on mount', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      global_role: null,
      supplier_roles: [],
      consumer_id: null,
      main_role: 'USER',
    }

    localStorageMock.setItem('scp_access_token', 'test-token')
    localStorageMock.setItem('scp_user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.accessToken).toBe('test-token')
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should login and store user in localStorage', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      global_role: null,
      supplier_roles: [],
      consumer_id: null,
      main_role: 'USER',
    }

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    act(() => {
      result.current.login('new-token', mockUser)
    })

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.accessToken).toBe('new-token')
    expect(result.current.isAuthenticated).toBe(true)
    expect(localStorageMock.getItem('scp_access_token')).toBe('new-token')
    expect(localStorageMock.getItem('scp_user')).toBe(JSON.stringify(mockUser))
  })

  it('should logout and clear localStorage', () => {
    const mockUser: User = {
      id: 1,
      email: 'test@example.com',
      full_name: 'Test User',
      is_active: true,
      global_role: null,
      supplier_roles: [],
      consumer_id: null,
      main_role: 'USER',
    }

    localStorageMock.setItem('scp_access_token', 'test-token')
    localStorageMock.setItem('scp_user', JSON.stringify(mockUser))

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.user).toBeNull()
    expect(result.current.accessToken).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(localStorageMock.getItem('scp_access_token')).toBeNull()
    expect(localStorageMock.getItem('scp_user')).toBeNull()
  })
})

