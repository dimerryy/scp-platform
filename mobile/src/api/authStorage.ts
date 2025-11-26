import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../config'
import type { User } from '../types/api'

/**
 * Auth storage utilities using AsyncStorage
 * Handles persistence of access token and user data
 */

/**
 * Save authentication data to AsyncStorage
 */
export const saveAuth = async (accessToken: string, user: User): Promise<void> => {
  // Validate inputs before saving
  if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
    throw new Error('Invalid access token: cannot save undefined or null value')
  }
  if (!user) {
    throw new Error('Invalid user: cannot save undefined or null value')
  }

  try {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.ACCESS_TOKEN, accessToken],
      [STORAGE_KEYS.USER, JSON.stringify(user)],
    ])
  } catch (error) {
    console.error('Failed to save auth data:', error)
    throw error
  }
}

/**
 * Get stored access token from AsyncStorage
 */
export const getAccessToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  } catch (error) {
    console.error('Failed to get access token:', error)
    return null
  }
}

/**
 * Get stored user data from AsyncStorage
 */
export const getStoredUser = async (): Promise<User | null> => {
  try {
    const userJson = await AsyncStorage.getItem(STORAGE_KEYS.USER)
    if (!userJson) {
      return null
    }
    return JSON.parse(userJson) as User
  } catch (error) {
    console.error('Failed to get stored user:', error)
    return null
  }
}

/**
 * Clear all authentication data from AsyncStorage
 */
export const clearAuth = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.ACCESS_TOKEN, STORAGE_KEYS.USER])
  } catch (error) {
    console.error('Failed to clear auth data:', error)
    throw error
  }
}

