import apiClient from './client'
import type { Order, OrderCreate, OrderStatusUpdate } from '../types/api'

/**
 * Orders API functions
 * These match the FastAPI endpoints in ../backend/app/routers/orders.py
 */

/**
 * Get all orders for the current user
 * 
 * Backend endpoint: GET /orders/my
 * Returns: List[OrderResponse]
 * 
 * For consumers: returns orders where they are the consumer
 * For supplier staff: returns orders for their supplier(s)
 */
export const getMyOrders = async (): Promise<Order[]> => {
  const response = await apiClient.get<Order[]>('/orders/my')
  return response.data
}

/**
 * Create a new order (CONSUMER only)
 * 
 * Backend endpoint: POST /orders/
 * Body: { supplier_id: number, items: [{ product_id: number, quantity: number }] }
 * Returns: OrderResponse
 * 
 * Requires: ACCEPTED link between consumer and supplier
 * Validates: product availability, stock, minimum quantities
 */
export const createOrder = async (orderData: OrderCreate): Promise<Order> => {
  // Use /orders without trailing slash to avoid 307 redirects
  // Remove null/undefined delivery_method to avoid sending null in JSON
  const payload: any = {
    supplier_id: orderData.supplier_id,
    items: orderData.items,
  }
  
  // Only include delivery_method if it's actually set
  if (orderData.delivery_method) {
    payload.delivery_method = orderData.delivery_method
  }
  
  const response = await apiClient.post<Order>('/orders', payload)
  
  // Validate response
  if (!response.data || !response.data.id) {
    throw new Error('Invalid order response: missing required fields')
  }
  
  return response.data
}

/**
 * Update order status (supplier Owner or Manager only)
 * 
 * Backend endpoint: POST /orders/{order_id}/status
 * Body: { new_status: "accepted" | "rejected" }
 * Returns: OrderResponse
 */
export const updateOrderStatus = async (
  orderId: number,
  newStatus: 'accepted' | 'rejected'
): Promise<Order> => {
  const response = await apiClient.post<Order>(`/orders/${orderId}/status`, {
    new_status: newStatus,
  })
  return response.data
}

/**
 * Reorder a previous order (CONSUMER only)
 * 
 * Backend endpoint: POST /orders/{order_id}/reorder
 * Returns: OrderResponse
 * 
 * Creates a new order based on a previous order's items
 */
export const reorder = async (orderId: number): Promise<Order> => {
  const response = await apiClient.post<Order>(`/orders/${orderId}/reorder`)
  return response.data
}

