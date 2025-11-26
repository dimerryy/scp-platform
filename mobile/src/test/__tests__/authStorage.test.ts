/**
 * Tests for auth storage utilities
 */
import { describe, it, expect, beforeEach } from '@jest/globals'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  saveAuth,
  getAccessToken,
  getStoredUser,
  clearAuth,
} from '../../api/authStorage'
import type { User } from '../../types/api'

describe('authStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear()
  })

  describe('saveAuth', () => {
    it('should save token and user to AsyncStorage', async () => {
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

      await saveAuth('test-token', mockUser)

      const token = await AsyncStorage.getItem('scp_access_token')
      const user = await AsyncStorage.getItem('scp_user')

      expect(token).toBe('test-token')
      expect(user).toBe(JSON.stringify(mockUser))
    })
  })

  describe('getAccessToken', () => {
    it('should retrieve token from AsyncStorage', async () => {
      await AsyncStorage.setItem('scp_access_token', 'test-token')

      const token = await getAccessToken()

      expect(token).toBe('test-token')
    })

    it('should return null if token does not exist', async () => {
      const token = await getAccessToken()

      expect(token).toBeNull()
    })
  })

  describe('getStoredUser', () => {
    it('should retrieve user from AsyncStorage', async () => {
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

      await AsyncStorage.setItem('scp_user', JSON.stringify(mockUser))

      const user = await getStoredUser()

      expect(user).toEqual(mockUser)
    })

    it('should return null if user does not exist', async () => {
      const user = await getStoredUser()

      expect(user).toBeNull()
    })
  })

  describe('clearAuth', () => {
    it('should remove token and user from AsyncStorage', async () => {
      await AsyncStorage.setItem('scp_access_token', 'test-token')
      await AsyncStorage.setItem('scp_user', JSON.stringify({ id: 1 }))

      await clearAuth()

      const token = await AsyncStorage.getItem('scp_access_token')
      const user = await AsyncStorage.getItem('scp_user')

      expect(token).toBeNull()
      expect(user).toBeNull()
    })
  })
})

