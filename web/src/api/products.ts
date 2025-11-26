import apiClient from './client'

export interface Product {
  id: number
  supplier_id: number
  name: string
  description: string | null
  unit: string
  price: string
  discount: string | null
  stock: number
  min_order_quantity: number
  delivery_available: boolean
  pickup_available: boolean
  lead_time_days: number
  is_active: boolean
  created_at: string
  updated_at: string | null
}

export interface ProductCreate {
  name: string
  description?: string | null
  unit: string
  price: string
  discount?: string | null
  stock: number
  min_order_quantity: number
  delivery_available?: boolean
  pickup_available?: boolean
  lead_time_days?: number
}

export const productsApi = {
  // Get products for a supplier
  getProducts: async (supplierId: number): Promise<Product[]> => {
    const response = await apiClient.get<Product[]>(`/products?supplier_id=${supplierId}`)
    return response.data
  },

  // Create a new product
  createProduct: async (supplierId: number, data: ProductCreate): Promise<Product> => {
    const response = await apiClient.post<Product>(`/suppliers/${supplierId}/products`, data)
    return response.data
  },

  // Update a product
  updateProduct: async (
    supplierId: number,
    productId: number,
    data: ProductCreate
  ): Promise<Product> => {
    const response = await apiClient.put<Product>(
      `/suppliers/${supplierId}/products/${productId}`,
      data
    )
    return response.data
  },

  // Delete a product (soft delete)
  deleteProduct: async (supplierId: number, productId: number): Promise<void> => {
    await apiClient.delete(`/suppliers/${supplierId}/products/${productId}`)
  },
}

