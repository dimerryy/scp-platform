import apiClient from './client'
import type { Supplier } from '../types/api'

/**
 * Suppliers API functions
 * These match the FastAPI endpoints in ../backend/app/routers/suppliers.py
 */

/**
 * List all active suppliers
 * 
 * Backend endpoint: GET /suppliers
 * Returns: List[SupplierResponse]
 * 
 * This allows consumers to discover suppliers and find their IDs
 * to request links.
 */
export const getAllSuppliers = async (): Promise<Supplier[]> => {
  const response = await apiClient.get<Supplier[]>('/suppliers')
  return response.data
}

/**
 * Get suppliers where current user is staff
 * 
 * Backend endpoint: GET /suppliers/my
 * Returns: List[SupplierResponse]
 */
export const getMySuppliers = async (): Promise<Supplier[]> => {
  const response = await apiClient.get<Supplier[]>('/suppliers/my')
  return response.data
}

