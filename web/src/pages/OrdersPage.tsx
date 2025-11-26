import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'
import { ordersApi } from '../api/orders'
import type { Order } from '../api/orders'

export default function OrdersPage() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const isSupplierStaff = useIsSupplierStaff()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSupplierStaff) {
      fetchOrders()
    }
  }, [isSupplierStaff])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const data = await ordersApi.getMyOrders()
      setOrders(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch orders')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: number, newStatus: 'accepted' | 'rejected') => {
    try {
      await ordersApi.updateOrderStatus(orderId, { new_status: newStatus })
      fetchOrders()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update order status')
    }
  }

  // Web Orders page is only for supplier staff
  if (!isSupplierStaff) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            Access Restricted
          </h2>
          <p className="text-yellow-800">
            This page is for Supplier Owners and Managers only.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('orders.title')}</h1>
      <p className="text-gray-600 mb-6">
        {t('orders.viewManage', 'View and manage incoming orders from consumers')}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t('orders.noOrders')}</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.orderId', 'Order ID')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.consumer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.totalAmount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.deliveryMethod')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.estimatedDelivery')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.created')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{order.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.consumer_name || `Consumer #${order.consumer_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        order.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {t(`orders.${order.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.total_amount
                      ? `₸${parseFloat(order.total_amount).toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.delivery_method ? (
                      <span className="capitalize">{order.delivery_method}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.estimated_delivery_date ? (
                      new Date(order.estimated_delivery_date).toLocaleDateString()
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {order.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusChange(order.id, 'accepted')}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          {t('orders.accept')}
                        </button>
                        <button
                          onClick={() => handleStatusChange(order.id, 'rejected')}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          {t('orders.reject')}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
