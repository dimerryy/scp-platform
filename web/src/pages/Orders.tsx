import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

interface Order {
  id: number
  supplier_id: number
  consumer_id: number
  status: string
  total_amount: string
  created_at: string
  items: OrderItem[]
}

interface OrderItem {
  id: number
  product_id: number
  quantity: number
  unit_price: string
  total_price: string
}

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const response = await apiClient.get('/orders/my')
      setOrders(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch orders')
    }
  }

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      await apiClient.post(`/orders/${orderId}/status`, {
        new_status: newStatus,
      })
      fetchOrders()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update order status')
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Orders</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Order #{order.id}
                </h3>
                <p className="text-sm text-gray-600">
                  {user?.user_type === 'consumer'
                    ? `Supplier ID: ${order.supplier_id}`
                    : `Consumer ID: ${order.consumer_id}`}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full ${
                    order.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : order.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {order.status}
                </span>
                {order.total_amount && (
                  <p className="text-lg font-bold text-gray-900 mt-2">
                    ₸{parseFloat(order.total_amount).toFixed(2)}
                  </p>
                )}
              </div>
            </div>

            {order.items && order.items.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Items:</h4>
                <ul className="space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="text-sm text-gray-600">
                      Product {item.product_id}: {item.quantity} × ₸{parseFloat(item.unit_price).toFixed(2)} = ₸{parseFloat(item.total_price).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {user?.user_type === 'supplier' && order.status === 'pending' && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleStatusChange(order.id, 'accepted')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Accept
                </button>
                <button
                  onClick={() => handleStatusChange(order.id, 'rejected')}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">No orders found</div>
      )}
    </div>
  )
}

