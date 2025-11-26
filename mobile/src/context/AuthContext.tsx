import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { login as apiLogin } from '../api/auth'
import { saveAuth, getAccessToken, getStoredUser, clearAuth } from '../api/authStorage'
import type { User } from '../types/api'

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore session from AsyncStorage on mount
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const [storedToken, storedUser] = await Promise.all([
          getAccessToken(),
          getStoredUser(),
        ])

        if (storedToken && storedUser) {
          setAccessToken(storedToken)
          setUser(storedUser)
        }
      } catch (error) {
        console.error('Failed to restore session:', error)
        // Clear corrupted data
        await clearAuth()
      } finally {
        setIsLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      // Call real API
      const response = await apiLogin(email, password)

      // Validate response before saving
      if (!response || !response.access_token || !response.user) {
        throw new Error('Invalid login response')
      }

      // Save to storage
      await saveAuth(response.access_token, response.user)

      // Update state
      setAccessToken(response.access_token)
      setUser(response.user)
    } catch (error: any) {
      // Don't save anything on error - ensure state is cleared
      setAccessToken(null)
      setUser(null)
      
      // Re-throw with user-friendly message
      const errorMessage =
        error.response?.data?.detail || error.message || 'Login failed. Please try again.'
      throw new Error(errorMessage)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      // Clear storage
      await clearAuth()

      // Reset state
      setAccessToken(null)
      setUser(null)
    } catch (error) {
      console.error('Failed to logout:', error)
      // Still reset state even if storage clear fails
      setAccessToken(null)
      setUser(null)
    }
  }, [])

  const value: AuthContextType = {
    user,
    accessToken,
    isLoading,
    login,
    logout,
    isAuthenticated: !!accessToken && !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
