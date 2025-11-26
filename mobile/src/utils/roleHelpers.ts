import type { User } from '../types/api'

/**
 * Role helper functions
 * These check user roles based on the User object structure from the backend
 */

/**
 * Check if user is a Consumer
 * 
 * A user is a consumer if:
 * - consumer_id is not null, OR
 * - main_role is 'CONSUMER'
 */
export const isConsumer = (user: User | null): boolean => {
  if (!user) return false
  return user.consumer_id !== null || user.main_role === 'CONSUMER'
}

/**
 * Check if user is Supplier Sales staff
 * 
 * A user is sales staff if:
 * - Has at least one supplier_role with role === 'SALES', OR
 * - main_role is 'SUPPLIER_SALES'
 */
export const isSales = (user: User | null): boolean => {
  if (!user) return false
  
  // Check main_role first (quick check)
  if (user.main_role === 'SUPPLIER_SALES') return true
  
  // Check supplier_roles array
  return user.supplier_roles.some((role) => role.role === 'SALES')
}

/**
 * Check if user is any type of Supplier staff (OWNER, MANAGER, or SALES)
 * 
 * A user is supplier staff if:
 * - Has at least one entry in supplier_roles array, OR
 * - main_role starts with 'SUPPLIER_'
 */
export const isSupplierStaff = (user: User | null): boolean => {
  if (!user) return false
  
  // Check main_role first (quick check)
  if (user.main_role.startsWith('SUPPLIER_')) return true
  
  // Check supplier_roles array
  return user.supplier_roles.length > 0
}

/**
 * Check if user is Supplier Owner
 */
export const isSupplierOwner = (user: User | null): boolean => {
  if (!user) return false
  
  if (user.main_role === 'SUPPLIER_OWNER') return true
  
  return user.supplier_roles.some((role) => role.role === 'OWNER')
}

/**
 * Check if user is Supplier Manager
 */
export const isSupplierManager = (user: User | null): boolean => {
  if (!user) return false
  
  if (user.main_role === 'SUPPLIER_MANAGER') return true
  
  return user.supplier_roles.some((role) => role.role === 'MANAGER')
}

/**
 * Check if user is Platform Admin
 */
export const isPlatformAdmin = (user: User | null): boolean => {
  if (!user) return false
  return user.global_role === 'PLATFORM_ADMIN' || user.main_role === 'PLATFORM_ADMIN'
}

