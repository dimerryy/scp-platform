import apiClient from './client'
import type { Product } from '../types/api'

/**
 * Products API functions
 * These match the FastAPI endpoints in ../backend/app/routers/products.py
 */

/**
 * Get products for a specific supplier
 * 
 * Backend endpoint: GET /products?supplier_id={supplierId}
 * Returns: List[ProductResponse]
 * 
 * Only returns active products (is_active = true)
 */
export const getProductsForSupplier = async (supplierId: number): Promise<Product[]> => {
  const response = await apiClient.get<Product[]>('/products', {
    params: {
      supplier_id: supplierId,
    },
  })
  return response.data
}

