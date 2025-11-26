/**
 * Tests for role helper functions
 */
import { describe, it, expect } from '@jest/globals'
import { isConsumer, isSales, isSupplierStaff } from '../../utils/roleHelpers'
import type { User } from '../../types/api'

describe('roleHelpers', () => {
  describe('isConsumer', () => {
    it('should return true for user with consumer_id', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        global_role: null,
        supplier_roles: [],
        consumer_id: 1,
        main_role: 'CONSUMER',
      }

      expect(isConsumer(user)).toBe(true)
    })

    it('should return false for user without consumer_id', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        global_role: null,
        supplier_roles: [],
        consumer_id: null,
        main_role: 'SUPPLIER_STAFF',
      }

      expect(isConsumer(user)).toBe(false)
    })
  })

  describe('isSales', () => {
    it('should return true for user with SALES role', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        global_role: null,
        supplier_roles: [
          { supplier_id: 1, role: 'SALES' },
        ],
        consumer_id: null,
        main_role: 'SUPPLIER_STAFF',
      }

      expect(isSales(user)).toBe(true)
    })

    it('should return false for user without SALES role', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        global_role: null,
        supplier_roles: [
          { supplier_id: 1, role: 'OWNER' },
        ],
        consumer_id: null,
        main_role: 'SUPPLIER_STAFF',
      }

      expect(isSales(user)).toBe(false)
    })
  })

  describe('isSupplierStaff', () => {
    it('should return true for user with supplier roles', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        global_role: null,
        supplier_roles: [
          { supplier_id: 1, role: 'OWNER' },
        ],
        consumer_id: null,
        main_role: 'SUPPLIER_STAFF',
      }

      expect(isSupplierStaff(user)).toBe(true)
    })

    it('should return false for user without supplier roles', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        full_name: 'Test User',
        is_active: true,
        global_role: null,
        supplier_roles: [],
        consumer_id: 1,
        main_role: 'CONSUMER',
      }

      expect(isSupplierStaff(user)).toBe(false)
    })
  })
})

