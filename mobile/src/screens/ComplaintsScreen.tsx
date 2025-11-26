import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { isConsumer, isSales, isSupplierManager, isSupplierOwner } from '../utils/roleHelpers'
import { getMyComplaints, createComplaint, escalateComplaint, updateComplaintStatus } from '../api/complaints'
import { getMyOrders } from '../api/orders'
import type { Complaint, Order } from '../types/api'

export default function ComplaintsScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false)
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null)
  const [resolutionText, setResolutionText] = useState('')

  const loadComplaints = useCallback(async () => {
    try {
      const data = await getMyComplaints()
      // Sort by created_at descending (newest first)
      const sorted = data.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      setComplaints(sorted)
    } catch (error: any) {
      console.error('Failed to load complaints:', error)
      Alert.alert(t('common.error'), error.message || t('complaints.failedToLoad'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const loadOrders = useCallback(async () => {
    if (!isConsumer(user)) return

    setLoadingOrders(true)
    try {
      const data = await getMyOrders()
      setOrders(data)
    } catch (error: any) {
      console.error('Failed to load orders:', error)
      Alert.alert(t('common.error'), error.message || t('orders.failedToLoad'))
    } finally {
      setLoadingOrders(false)
    }
  }, [user])

  useEffect(() => {
    loadComplaints()
  }, [loadComplaints])

  useEffect(() => {
    if (showCreateForm && isConsumer(user)) {
      loadOrders()
    }
  }, [showCreateForm, user, loadOrders])

  const handleRefresh = () => {
    setRefreshing(true)
    loadComplaints()
  }

  const handleCreateComplaint = async () => {
    if (!selectedOrderId) {
      Alert.alert(t('common.error'), t('complaints.selectOrder'))
      return
    }
    if (!description.trim()) {
      Alert.alert(t('common.error'), t('complaints.enterDescription'))
      return
    }

    setSubmitting(true)
    try {
      await createComplaint({
        order_id: selectedOrderId,
        description: description.trim(),
      })
      Alert.alert(t('common.success'), t('complaints.complaintCreated'))
      setShowCreateForm(false)
      setSelectedOrderId(null)
      setDescription('')
      loadComplaints() // Refresh list
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('complaints.failedToSubmit'))
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return { bg: '#fef3c7', text: '#d97706' }
      case 'in_progress':
        return { bg: '#dbeafe', text: '#2563eb' }
      case 'resolved':
        return { bg: '#d1fae5', text: '#059669' }
      case 'escalated':
        return { bg: '#fee2e2', text: '#dc2626' }
      default:
        return { bg: '#f3f4f6', text: '#6b7280' }
    }
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const renderComplaintItem = ({ item }: { item: Complaint }) => {
    const statusStyle = getStatusColor(item.status)

    return (
      <View style={styles.complaintItem}>
        <View style={styles.complaintHeader}>
          <View style={styles.complaintHeaderLeft}>
            <Text style={styles.complaintOrderId}>{t('orders.orderId', { id: item.order_id })}</Text>
            <View
              style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}
            >
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {item.status.toUpperCase().replace('_', ' ')}
              </Text>
            </View>
          </View>
          <Text style={styles.complaintDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={styles.complaintDescription}>{item.description}</Text>
        {item.resolution && (
          <View style={styles.resolutionContainer}>
            <Text style={styles.resolutionLabel}>{t('complaints.resolution')}:</Text>
            <Text style={styles.resolutionText}>{item.resolution}</Text>
          </View>
        )}
        
        {/* Status change buttons for Sales staff */}
        {isSales(user) && (
          <View style={styles.statusButtonsContainer}>
            {item.status === 'open' && (
              <TouchableOpacity
                style={[styles.statusButton, styles.statusButtonInProgress]}
                onPress={async () => {
                  try {
                    await updateComplaintStatus(item.id, 'in_progress')
                    Alert.alert(t('common.success'), t('complaints.statusUpdatedToInProgress', 'Status updated to In Progress'))
                    loadComplaints()
                  } catch (error: any) {
                    Alert.alert(
                      t('common.error'),
                      error.response?.data?.detail || error.message || t('complaints.failedToUpdateStatus', 'Failed to update status')
                    )
                  }
                }}
              >
                <Text style={styles.statusButtonText}>
                  {t('complaints.setToInProgress', 'Set to In Progress')}
                </Text>
              </TouchableOpacity>
            )}
            {item.status === 'in_progress' && (
              <>
                <TouchableOpacity
                  style={[styles.statusButton, styles.statusButtonResolved]}
                  onPress={() => {
                    setSelectedComplaintId(item.id)
                    setResolutionText('')
                    setResolutionModalVisible(true)
                  }}
                >
                  <Text style={styles.statusButtonText}>
                    {t('complaints.setToResolved', 'Set to Resolved')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusButton, styles.statusButtonEscalate]}
                  onPress={async () => {
                    Alert.alert(
                      t('complaints.escalate'),
                      t('complaints.escalateConfirm', 'Are you sure you want to escalate this complaint to a Manager?'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('complaints.escalate'),
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await updateComplaintStatus(item.id, 'escalated')
                              Alert.alert(t('common.success'), t('complaints.escalated'))
                              loadComplaints()
                            } catch (error: any) {
                              Alert.alert(
                                t('common.error'),
                                error.response?.data?.detail || error.message || t('complaints.failedToEscalate')
                              )
                            }
                          },
                        },
                      ]
                    )
                  }}
                >
                  <Text style={styles.statusButtonText}>
                    {t('complaints.setToEscalated', 'Escalate to Manager')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        
        {/* Status change button for Manager/Owner (any non-resolved complaint) */}
        {(isSupplierManager(user) || isSupplierOwner(user)) && item.status !== 'resolved' && (
          <TouchableOpacity
            style={[styles.statusButton, styles.statusButtonResolved]}
            onPress={() => {
              setSelectedComplaintId(item.id)
              setResolutionText('')
              setResolutionModalVisible(true)
            }}
          >
            <Text style={styles.statusButtonText}>{t('complaints.setToResolved', 'Set to Resolved')}</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {isConsumer(user) && (
        <View style={styles.createButtonContainer}>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setShowCreateForm(true)}
          >
            <Text style={styles.createButtonText}>+ {t('complaints.createComplaint')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {complaints.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('complaints.noComplaints')}</Text>
          <Text style={styles.emptySubtext}>
            {isConsumer(user)
              ? t('complaints.noComplaintsConsumer', 'You have not submitted any complaints yet')
              : t('complaints.noComplaintsSales', 'No complaints have been filed for your supplier(s)')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderComplaintItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}

      {/* Create Complaint Modal */}
      <Modal
        visible={showCreateForm}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateForm(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('complaints.createComplaint')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateForm(false)
                  setSelectedOrderId(null)
                  setDescription('')
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>{t('complaints.selectOrder')}</Text>
              {loadingOrders ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : orders.length === 0 ? (
                <Text style={styles.noOrdersText}>
                  {t('complaints.noOrdersAvailable', 'No orders available. Please create an order first.')}
                </Text>
              ) : (
                <View style={styles.orderPicker}>
                  {orders.map((order) => (
                    <TouchableOpacity
                      key={order.id}
                      style={[
                        styles.orderOption,
                        selectedOrderId === order.id &&
                          styles.orderOptionSelected,
                      ]}
                      onPress={() => setSelectedOrderId(order.id)}
                    >
                      <Text
                        style={[
                          styles.orderOptionText,
                          selectedOrderId === order.id &&
                            styles.orderOptionTextSelected,
                        ]}
                      >
                        {t('orders.orderId', { id: order.id })} - {order.supplier_name} -{' '}
                        {t(`orders.${order.status}`, order.status)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.formLabel}>{t('complaints.description')}</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Describe your complaint..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {description.length}/1000 {t('common.characters', 'characters')}
              </Text>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateForm(false)
                  setSelectedOrderId(null)
                  setDescription('')
                }}
                disabled={submitting}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedOrderId || !description.trim() || submitting) &&
                    styles.submitButtonDisabled,
                ]}
                onPress={handleCreateComplaint}
                disabled={
                  !selectedOrderId || !description.trim() || submitting
                }
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('common.submit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </Modal>

      {/* Resolution Modal */}
      <Modal
        visible={resolutionModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setResolutionModalVisible(false)
          setSelectedComplaintId(null)
          setResolutionText('')
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('complaints.resolution')}</Text>
              <TouchableOpacity
                onPress={() => {
                  setResolutionModalVisible(false)
                  setSelectedComplaintId(null)
                  setResolutionText('')
                }}
              >
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formLabel}>{t('complaints.enterResolution', 'Enter resolution details (optional)')}</Text>
              <TextInput
                style={styles.descriptionInput}
                multiline
                numberOfLines={4}
                value={resolutionText}
                onChangeText={setResolutionText}
                placeholder={t('complaints.resolutionPlaceholder', 'Resolution details...')}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.submitButton, styles.cancelButton]}
                onPress={() => {
                  setResolutionModalVisible(false)
                  setSelectedComplaintId(null)
                  setResolutionText('')
                }}
              >
                <Text style={styles.submitButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={async () => {
                  if (!selectedComplaintId) return
                  
                  setSubmitting(true)
                  try {
                    await updateComplaintStatus(
                      selectedComplaintId,
                      'resolved',
                      resolutionText.trim() || undefined
                    )
                    Alert.alert(t('common.success'), t('complaints.resolved', 'Complaint resolved'))
                    setResolutionModalVisible(false)
                    setSelectedComplaintId(null)
                    setResolutionText('')
                    loadComplaints()
                  } catch (error: any) {
                    Alert.alert(
                      t('common.error'),
                      error.response?.data?.detail || error.message || t('complaints.failedToUpdateStatus')
                    )
                  } finally {
                    setSubmitting(false)
                  }
                }}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>{t('complaints.resolve')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
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
  createButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  createButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  complaintItem: {
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
  complaintHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  complaintHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  complaintOrderId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  complaintDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  complaintDescription: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 8,
  },
  resolutionContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  resolutionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  resolutionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 24,
    color: '#6b7280',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
    marginTop: 12,
  },
  orderPicker: {
    marginBottom: 16,
  },
  orderOption: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  orderOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  orderOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  orderOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  noOrdersText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    padding: 12,
  },
  descriptionInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  charCount: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'right',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statusButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusButtonInProgress: {
    backgroundColor: '#dbeafe',
  },
  statusButtonResolved: {
    backgroundColor: '#d1fae5',
  },
  statusButtonEscalate: {
    backgroundColor: '#fee2e2',
  },
  statusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  escalateButton: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    alignItems: 'center',
  },
  escalateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
})
