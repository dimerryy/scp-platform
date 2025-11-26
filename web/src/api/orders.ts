import apiClient from './client'

export interface OrderItem {
  id: number
  product_id: number
  quantity: number
  unit_price: string
  total_price: string
}

export interface Order {
  id: number
  supplier_id: number
  supplier_name: string
  consumer_id: number
  consumer_name: string
  status: 'pending' | 'accepted' | 'rejected' | 'fulfilled' | 'cancelled'
  total_amount: string | null
  delivery_method: string | null
  estimated_delivery_date: string | null
  created_by: number
  created_at: string
  items: OrderItem[]
}

export interface OrderItemCreate {
  product_id: number
  quantity: number
}

export interface CreateOrderData {
  supplier_id: number
  items: OrderItemCreate[]
}

export interface UpdateOrderStatusData {
  new_status: 'accepted' | 'rejected'
}

export const ordersApi = {
  // Get all orders for current user
  getMyOrders: async (): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders/my')
    return response.data
  },

  // Create a new order (consumer only)
  createOrder: async (data: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders', data)
    return response.data
  },

  // Update order status (supplier OWNER/MANAGER only)
  updateOrderStatus: async (
    orderId: number,
    data: UpdateOrderStatusData
  ): Promise<Order> => {
    const response = await apiClient.post<Order>(
      `/orders/${orderId}/status`,
      data
    )
    return response.data
  },
}

