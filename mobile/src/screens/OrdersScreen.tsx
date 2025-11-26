import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { isConsumer } from '../utils/roleHelpers'
import { getMyOrders, reorder } from '../api/orders'
import type { Order } from '../types/api'

export default function OrdersScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadOrders = async () => {
    try {
      const data = await getMyOrders()
      setOrders(data)
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || error.message || 'Failed to load orders'
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadOrders()
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'accepted':
        return '#10b981' // green
      case 'pending':
        return '#f59e0b' // yellow
      case 'rejected':
      case 'cancelled':
        return '#ef4444' // red
      case 'fulfilled':
        return '#3b82f6' // blue
      default:
        return '#6b7280'
    }
  }

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.ordersSection}>
          <Text style={styles.sectionTitle}>
            {isConsumer(user) ? 'My Orders' : 'Orders'}
          </Text>

          {orders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('orders.noOrders')}</Text>
              {isConsumer(user) && (
                <Text style={styles.emptySubtext}>
                  {t('orders.createFirstOrder', 'Go to Catalog to create your first order')}
                </Text>
              )}
            </View>
          ) : (
            orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderId}>{t('orders.orderId', { id: order.id })}</Text>
                    <Text style={styles.orderSupplier}>
                      {isConsumer(user) ? order.supplier_name : order.consumer_name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStatusColor(order.status) },
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {getStatusLabel(order.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.orderDetails}>
                  <Text style={styles.orderDetailText}>
                    {t('orders.items')}: {order.items.length}
                  </Text>
                  {order.total_amount && (
                    <Text style={styles.orderDetailText}>
                      {t('orders.total')}: ₸{parseFloat(order.total_amount).toFixed(2)}
                    </Text>
                  )}
                  {order.delivery_method && (
                    <Text style={styles.orderDetailText}>
                      {t('orders.deliveryMethod')}: {order.delivery_method.charAt(0).toUpperCase() + order.delivery_method.slice(1)}
                    </Text>
                  )}
                  {order.estimated_delivery_date && (
                    <Text style={styles.orderDetailText}>
                      {t('orders.estimatedDelivery')}: {new Date(order.estimated_delivery_date).toLocaleDateString()}
                    </Text>
                  )}
                  <Text style={styles.orderDetailText}>
                    {t('common.created')}: {new Date(order.created_at).toLocaleDateString()}
                  </Text>
                </View>

                {order.items.length > 0 && (
                  <View style={styles.itemsSection}>
                    <Text style={styles.itemsTitle}>{t('orders.items')}:</Text>
                    {order.items.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.itemText}>
                          {item.product_name} × {item.quantity}
                        </Text>
                        <Text style={styles.itemPrice}>
                          ₸{parseFloat(item.total_price).toFixed(2)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Reorder button for consumers */}
                {isConsumer(user) && (order.status === 'accepted' || order.status === 'fulfilled') && (
                  <TouchableOpacity
                    style={styles.reorderButton}
                    onPress={async () => {
                      try {
                        await reorder(order.id)
                        Alert.alert(t('common.success'), t('orders.orderRecreated'))
                        await loadOrders()
                      } catch (error: any) {
                        const errorMessage = error.response?.data?.detail || error.message || ''
                        
                        // Check if it's a stock-related error
                        const isStockError = errorMessage.toLowerCase().includes('out of stock') || 
                                            errorMessage.toLowerCase().includes('insufficient stock') ||
                                            errorMessage.toLowerCase().includes('available:')
                        
                        if (isStockError) {
                          // Extract product name - try multiple patterns
                          let productName = t('orders.outOfStockGeneric')
                          const namePatterns = [
                            /Product '([^']+)'/i,
                            /product ([^.]+)\./i,
                            /for product ([^.]+)/i
                          ]
                          
                          for (const pattern of namePatterns) {
                            const match = errorMessage.match(pattern)
                            if (match && match[1]) {
                              productName = match[1].trim()
                              break
                            }
                          }
                          
                          // Extract available and required quantities
                          let available = '0'
                          let required = '0'
                          const stockPatterns = [
                            /Available: (\d+)[^0-9]*Required: (\d+)/i,
                            /Available: (\d+)[^0-9]*Requested: (\d+)/i,
                            /Available: (\d+).*?(\d+)/i
                          ]
                          
                          for (const pattern of stockPatterns) {
                            const match = errorMessage.match(pattern)
                            if (match && match[1] && match[2]) {
                              available = match[1]
                              required = match[2]
                              break
                            }
                          }
                          
                          // Show user-friendly translated message
                          Alert.alert(
                            t('orders.outOfStock'),
                            t('orders.outOfStockMessage', { product: productName, available, required }),
                            [{ text: t('common.ok') }]
                          )
                        } else {
                          // For other errors, show a generic friendly message
                          Alert.alert(
                            t('errors.unableToReorder'),
                            t('errors.reorderError'),
                            [{ text: t('common.ok') }]
                          )
                        }
                      }
                    }}
                  >
                    <Text style={styles.reorderButtonText}>🔄 {t('orders.reorder')}</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  ordersSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
    marginRight: 12,
  },
  orderId: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  orderSupplier: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  orderDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderDetailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemsSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemText: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  // Modal styles
  reorderButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
