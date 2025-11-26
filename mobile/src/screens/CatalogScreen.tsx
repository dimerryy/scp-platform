import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
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
import { getMyLinks } from '../api/links'
import { getProductsForSupplier } from '../api/products'
import { createOrder } from '../api/orders'
import type { Link, Product, OrderItemCreate, OrderCreate } from '../types/api'

interface DraftOrderItem {
  product_id: number
  product_name: string
  quantity: number
  unit_price: string
}

export default function CatalogScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [links, setLinks] = useState<Link[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  
  // Draft order state
  const [draftOrder, setDraftOrder] = useState<Map<number, DraftOrderItem>>(new Map())
  const [deliveryMethod, setDeliveryMethod] = useState<string | null>(null) // "delivery" or "pickup"
  const [submitting, setSubmitting] = useState(false)

  const loadLinks = async () => {
    try {
      const data = await getMyLinks()
      // Filter to only accepted links
      const acceptedLinks = data.filter((link) => link.status === 'accepted')
      setLinks(acceptedLinks)
      
      // Auto-select first supplier if available
      if (acceptedLinks.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(acceptedLinks[0].supplier_id)
      }
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.detail || error.message || t('links.failedToLoad')
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLinks()
  }, [])

  useEffect(() => {
    if (selectedSupplierId) {
      loadProducts(selectedSupplierId)
    } else {
      setProducts([])
    }
  }, [selectedSupplierId])

  const loadProducts = async (supplierId: number) => {
    setLoadingProducts(true)
    try {
      const data = await getProductsForSupplier(supplierId)
      setProducts(data)
    } catch (error: any) {
      Alert.alert(
        t('common.error'),
        error.response?.data?.detail || error.message || t('catalog.failedToLoadProducts', 'Failed to load products')
      )
    } finally {
      setLoadingProducts(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadLinks()
  }

  const handleQuantityChange = (product: Product, quantity: number) => {
    if (quantity < 0) return
    
    const minQuantity = product.min_order_quantity || 1
    if (quantity > 0 && quantity < minQuantity) {
      Alert.alert(t('common.error'), t('catalog.minimumOrderQuantity', { quantity: minQuantity }, `Minimum order quantity is ${minQuantity}`))
      return
    }

    const newDraft = new Map(draftOrder)
    
    if (quantity === 0) {
      newDraft.delete(product.id)
    } else {
      const unitPrice = parseFloat(product.price)
      const discount = product.discount ? parseFloat(product.discount) : 0
      const finalPrice = discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice

      newDraft.set(product.id, {
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: finalPrice.toString(),
      })
    }
    
    setDraftOrder(newDraft)
  }

  const getDraftTotal = (): number => {
    let total = 0
    draftOrder.forEach((item) => {
      total += parseFloat(item.unit_price) * item.quantity
    })
    return total
  }

  const getSelectedSupplierName = (): string => {
    const link = links.find((l) => l.supplier_id === selectedSupplierId)
    return link?.supplier_name || t('catalog.unknownSupplier', 'Unknown Supplier')
  }

  const handleCreateOrder = async () => {
    if (draftOrder.size === 0) {
      Alert.alert(t('common.error'), t('catalog.selectAtLeastOneProduct'))
      return
    }

    if (!selectedSupplierId) {
      Alert.alert(t('common.error'), t('catalog.selectSupplierFirst'))
      return
    }

    // Check if delivery method is required (if any product requires it)
    const selectedProducts = Array.from(draftOrder.keys()).map(id => 
      products.find(p => p.id === id)
    ).filter(Boolean) as Product[]

    const requiresDeliveryMethod = selectedProducts.some(p => 
      (p.delivery_available && !p.pickup_available) || 
      (!p.delivery_available && p.pickup_available)
    )

    if (requiresDeliveryMethod && !deliveryMethod) {
      Alert.alert(t('common.error'), t('catalog.selectDeliveryMethod'))
      return
    }

    setSubmitting(true)
    try {
      const items: OrderItemCreate[] = Array.from(draftOrder.values()).map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
      }))

      const orderPayload: OrderCreate = {
        supplier_id: selectedSupplierId,
        items,
      }
      
      // Only include delivery_method if it's set
      if (deliveryMethod) {
        orderPayload.delivery_method = deliveryMethod
      }

      await createOrder(orderPayload)

      Alert.alert(t('common.success'), t('catalog.orderCreated'))
      
      // Clear draft order and delivery method
      setDraftOrder(new Map())
      setDeliveryMethod(null)
    } catch (error: any) {
      const errorMessage = 
        error.response?.data?.detail || 
        error.message || 
        t('catalog.failedToCreateOrder')
      
      // Check if it's a stock-related error
      const isStockError = errorMessage.toLowerCase().includes('out of stock') || 
                          errorMessage.toLowerCase().includes('insufficient stock') ||
                          errorMessage.toLowerCase().includes('available:')
      
      if (isStockError) {
        // Extract product name
        let productName = t('common.someProducts')
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
        
        Alert.alert(
          t('stock.outOfStock'),
          t('stock.insufficientStock', { productName, available, required }),
          [{ text: t('common.ok') }]
        )
      } else {
        Alert.alert(t('common.error'), errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  // For sales staff, show read-only view
  if (!isConsumer(user)) {
    return (
      <View style={styles.container}>
        <View style={styles.readOnlyContainer}>
          <Text style={styles.readOnlyText}>{t('catalog.catalogView', 'Catalog View')}</Text>
          <Text style={styles.readOnlySubtext}>
            {t('catalog.consumersOnly', 'Product catalog is available for consumers only')}
          </Text>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t('catalog.loadingSuppliers', 'Loading suppliers...')}</Text>
      </View>
    )
  }

  const acceptedLinks = links.filter((link) => link.status === 'accepted')

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Supplier Selection */}
      {acceptedLinks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('catalog.noAcceptedSuppliers', 'No Accepted Suppliers')}</Text>
          <Text style={styles.emptySubtext}>
            {t('catalog.needAcceptedLink', 'You need at least one accepted supplier link to view products')}
          </Text>
          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => {
              // Navigate to Links screen - would need navigation prop
            }}
          >
            <Text style={styles.linkButtonText}>{t('catalog.goToLinks', 'Go to Links')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.supplierSection}>
            <Text style={styles.sectionTitle}>{t('catalog.selectSupplier')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.supplierList}>
              {acceptedLinks.map((link) => (
                <TouchableOpacity
                  key={link.id}
                  style={[
                    styles.supplierButton,
                    selectedSupplierId === link.supplier_id && styles.supplierButtonActive,
                  ]}
                  onPress={() => {
                    setSelectedSupplierId(link.supplier_id)
                    setDraftOrder(new Map()) // Clear draft when switching suppliers
                    setDeliveryMethod(null) // Clear delivery method when switching suppliers
                  }}
                >
                  <Text
                    style={[
                      styles.supplierButtonText,
                      selectedSupplierId === link.supplier_id && styles.supplierButtonTextActive,
                    ]}
                  >
                    {link.supplier_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Products List */}
          {selectedSupplierId && (
            <View style={styles.productsSection}>
              <Text style={styles.sectionTitle}>
                {t('catalog.products', 'Products')} - {getSelectedSupplierName()}
              </Text>

              {loadingProducts ? (
                <View style={styles.loadingProductsContainer}>
                  <ActivityIndicator size="large" color="#3b82f6" />
                  <Text style={styles.loadingText}>{t('catalog.loadingProducts', 'Loading products...')}</Text>
                </View>
              ) : products.length === 0 ? (
                <View style={styles.emptyProductsContainer}>
                  <Text style={styles.emptyText}>{t('catalog.noProducts')}</Text>
                </View>
              ) : (
                <>
                  {products.map((product) => {
                    const draftItem = draftOrder.get(product.id)
                    const minQuantity = product.min_order_quantity || 1
                    // Display quantity: use draft quantity if exists, otherwise show min_order_quantity
                    const displayQuantity = draftItem?.quantity || minQuantity
                    // Actual quantity in draft (0 if not in draft)
                    const actualQuantity = draftItem?.quantity || 0
                    const unitPrice = parseFloat(product.price)
                    const discount = product.discount ? parseFloat(product.discount) : 0
                    const finalPrice = discount > 0 ? unitPrice * (1 - discount / 100) : unitPrice
                    const stock = product.stock || 0

                    return (
                      <View key={product.id} style={styles.productCard}>
                        <View style={styles.productHeader}>
                          <View style={styles.productInfo}>
                            <Text style={styles.productName}>{product.name}</Text>
                            {product.description && (
                              <Text style={styles.productDescription}>{product.description}</Text>
                            )}
                          </View>
                          <View style={styles.productPrice}>
                            <Text style={styles.priceText}>
                              ₸{finalPrice.toFixed(2)} / {product.unit}
                            </Text>
                            {discount > 0 && (
                              <Text style={styles.originalPrice}>
                                ₸{unitPrice.toFixed(2)}
                              </Text>
                            )}
                          </View>
                        </View>

                        <View style={styles.productMeta}>
                          <Text style={styles.metaText}>
                            {t('catalog.min', 'Min')}: {product.min_order_quantity} {product.unit}
                          </Text>
                          <Text style={styles.metaText}>
                            {t('catalog.stock')}: {stock} {product.unit}
                          </Text>
                        </View>

                        <View style={styles.quantitySection}>
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              if (actualQuantity === 0) {
                                // Already at 0, do nothing
                                return
                              }
                              const newQuantity = actualQuantity - 1
                              if (newQuantity < minQuantity) {
                                // Remove from draft if going below minimum
                                handleQuantityChange(product, 0)
                              } else {
                                handleQuantityChange(product, newQuantity)
                              }
                            }}
                            disabled={actualQuantity === 0}
                          >
                            <Text style={styles.quantityButtonText}>−</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={styles.quantityInput}
                            value={displayQuantity.toString()}
                            onChangeText={(text) => {
                              const num = parseInt(text) || minQuantity
                              // If user enters 0 or below minimum, set to minimum
                              const finalNum = num < minQuantity ? minQuantity : num
                              handleQuantityChange(product, finalNum)
                            }}
                            keyboardType="numeric"
                            placeholder={minQuantity.toString()}
                          />
                          <TouchableOpacity
                            style={styles.quantityButton}
                            onPress={() => {
                              if (actualQuantity === 0) {
                                // First time adding: set to minimum
                                handleQuantityChange(product, minQuantity)
                              } else {
                                handleQuantityChange(product, actualQuantity + 1)
                              }
                            }}
                            disabled={stock > 0 && actualQuantity >= stock}
                          >
                            <Text style={styles.quantityButtonText}>+</Text>
                          </TouchableOpacity>
                          {actualQuantity > 0 && (
                            <Text style={styles.itemTotal}>
                              ₸{(finalPrice * actualQuantity).toFixed(2)}
                            </Text>
                          )}
                        </View>
                      </View>
                    )
                  })}

                  {/* Draft Order Summary */}
                  {draftOrder.size > 0 && (
                    <View style={styles.draftOrderSection}>
                      <Text style={styles.draftOrderTitle}>{t('catalog.orderSummary')}</Text>
                      {Array.from(draftOrder.values()).map((item) => (
                        <View key={item.product_id} style={styles.draftOrderItem}>
                          <Text style={styles.draftOrderItemText}>
                            {item.product_name} × {item.quantity}
                          </Text>
                          <Text style={styles.draftOrderItemPrice}>
                            ₸{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}
                          </Text>
                        </View>
                      ))}
                      <View style={styles.draftOrderTotal}>
                        <Text style={styles.draftOrderTotalLabel}>{t('orders.total')}:</Text>
                        <Text style={styles.draftOrderTotalAmount}>
                          ₸{getDraftTotal().toFixed(2)}
                        </Text>
                      </View>
                      
                      {/* Delivery Method Selection */}
                      {(() => {
                        const selectedProducts = Array.from(draftOrder.keys()).map(id => 
                          products.find(p => p.id === id)
                        ).filter(Boolean) as Product[]
                        
                        const hasDeliveryOption = selectedProducts.some(p => p.delivery_available)
                        const hasPickupOption = selectedProducts.some(p => p.pickup_available)
                        const requiresChoice = (hasDeliveryOption && hasPickupOption) || 
                                             (hasDeliveryOption && !hasPickupOption) ||
                                             (!hasDeliveryOption && hasPickupOption)
                        
                        if (requiresChoice) {
                          return (
                            <View style={styles.deliveryMethodSection}>
                              <Text style={styles.deliveryMethodLabel}>{t('catalog.deliveryMethod')}:</Text>
                              <View style={styles.deliveryMethodButtons}>
                                {hasDeliveryOption && (
                                  <TouchableOpacity
                                    style={[
                                      styles.deliveryMethodButton,
                                      deliveryMethod === 'delivery' && styles.deliveryMethodButtonActive,
                                    ]}
                                    onPress={() => setDeliveryMethod('delivery')}
                                  >
                                    <Text
                                      style={[
                                        styles.deliveryMethodButtonText,
                                        deliveryMethod === 'delivery' && styles.deliveryMethodButtonTextActive,
                                      ]}
                                    >
                                      {t('catalog.delivery')}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                                {hasPickupOption && (
                                  <TouchableOpacity
                                    style={[
                                      styles.deliveryMethodButton,
                                      deliveryMethod === 'pickup' && styles.deliveryMethodButtonActive,
                                    ]}
                                    onPress={() => setDeliveryMethod('pickup')}
                                  >
                                    <Text
                                      style={[
                                        styles.deliveryMethodButtonText,
                                        deliveryMethod === 'pickup' && styles.deliveryMethodButtonTextActive,
                                      ]}
                                    >
                                      {t('catalog.pickup')}
                                    </Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          )
                        }
                        return null
                      })()}
                      
                      {/* Create Order Button */}
                      <TouchableOpacity
                        style={[styles.createOrderButton, submitting && styles.createOrderButtonDisabled]}
                        onPress={handleCreateOrder}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.createOrderButtonText}>
                            {t('catalog.createOrder')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
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
  readOnlyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  readOnlyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  readOnlySubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  linkButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  linkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  supplierSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  supplierList: {
    flexDirection: 'row',
  },
  supplierButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  supplierButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  supplierButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  supplierButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  productsSection: {
    padding: 16,
  },
  loadingProductsContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyProductsContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  productCard: {
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  productPrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  originalPrice: {
    fontSize: 12,
    color: '#9ca3af',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  productMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  metaText: {
    fontSize: 12,
    color: '#6b7280',
  },
  quantitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
  },
  quantityInput: {
    width: 60,
    height: 36,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: '#fff',
  },
  itemTotal: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  draftOrderSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  draftOrderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  draftOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  draftOrderItemText: {
    fontSize: 14,
    color: '#374151',
  },
  draftOrderItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  draftOrderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  draftOrderTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  draftOrderTotalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  draftOrderNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
    fontStyle: 'italic',
  },
  deliveryMethodSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  deliveryMethodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  deliveryMethodButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  deliveryMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  deliveryMethodButtonActive: {
    backgroundColor: '#dbeafe',
    borderColor: '#3b82f6',
  },
  deliveryMethodButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  deliveryMethodButtonTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  createOrderButton: {
    marginTop: 16,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  createOrderButtonDisabled: {
    opacity: 0.6,
  },
  createOrderButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
})
