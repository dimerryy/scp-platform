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
  FlatList,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { isConsumer, isSales } from '../utils/roleHelpers'
import { getMyLinks, createLinkRequest } from '../api/links'
import { getAllSuppliers } from '../api/suppliers'
import type { Link, Supplier } from '../types/api'

export default function LinksScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [links, setLinks] = useState<Link[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  // Form state (for consumers)
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  const loadLinks = async () => {
    try {
      const data = await getMyLinks()
      setLinks(data)
    } catch (error: any) {
      console.error('Error loading links:', error)
      Alert.alert(
        t('common.error'),
        error.response?.data?.detail || error.message || t('links.failedToLoad')
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const loadSuppliers = async () => {
    if (!isConsumer(user)) return
    
    setLoadingSuppliers(true)
    try {
      const data = await getAllSuppliers()
      setSuppliers(data)
    } catch (error: any) {
      console.error('Error loading suppliers:', error)
      Alert.alert(
        t('common.error'),
        error.response?.data?.detail || error.message || t('links.failedToFetchSuppliers')
      )
    } finally {
      setLoadingSuppliers(false)
    }
  }

  useEffect(() => {
    loadLinks()
    if (isConsumer(user)) {
      loadSuppliers()
    }
  }, [user])

  const handleRefresh = () => {
    setRefreshing(true)
    loadLinks()
  }

  const handleCreateLink = async () => {
    if (!selectedSupplierId) {
      Alert.alert(t('common.error'), t('links.selectSupplier'))
      return
    }

    setSubmitting(true)
    try {
      console.log('Creating link request for supplier:', selectedSupplierId)
      await createLinkRequest(selectedSupplierId)
      Alert.alert(t('common.success'), t('links.linkRequested'))
      setSelectedSupplierId(null)
      setShowForm(false)
      // Reload links
      await loadLinks()
    } catch (error: any) {
      console.error('Error creating link:', error)
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to create link request'
      
      // Check for timeout
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        Alert.alert(
          t('errors.timeoutError', 'Timeout Error'),
          t('errors.timeoutMessage', 'The request took too long. Please check your connection and try again.')
        )
      } else {
        Alert.alert('Error', errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'accepted':
        return '#10b981' // green
      case 'pending':
        return '#f59e0b' // yellow
      case 'rejected':
      case 'blocked':
        return '#ef4444' // red
      case 'removed':
        return '#6b7280' // gray
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
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {isConsumer(user) && (
        <View style={styles.formSection}>
          <TouchableOpacity
            style={styles.toggleFormButton}
            onPress={() => setShowForm(!showForm)}
          >
            <Text style={styles.toggleFormText}>
              {showForm ? '−' : '+'} {t('links.requestLink')}
            </Text>
          </TouchableOpacity>

          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formLabel}>{t('links.selectSupplier')} *</Text>
              {loadingSuppliers ? (
                <View style={styles.loadingSuppliers}>
                  <ActivityIndicator size="small" color="#3b82f6" />
                  <Text style={styles.loadingText}>{t('links.loadingSuppliers', 'Loading suppliers...')}</Text>
                </View>
              ) : suppliers.length === 0 ? (
                <Text style={styles.noSuppliersText}>
                  {t('links.noSuppliersFound')}
                </Text>
              ) : (
                <>
                  <ScrollView style={styles.supplierList} nestedScrollEnabled>
                    {suppliers.map((supplier) => {
                      // Check if link already exists
                      const existingLink = links.find(
                        (link) => link.supplier_id === supplier.id
                      )
                      const isSelected = selectedSupplierId === supplier.id
                      
                      return (
                        <TouchableOpacity
                          key={supplier.id}
                          style={[
                            styles.supplierOption,
                            isSelected && styles.supplierOptionSelected,
                            existingLink && styles.supplierOptionDisabled,
                          ]}
                          onPress={() => {
                            if (!existingLink) {
                              setSelectedSupplierId(supplier.id)
                            }
                          }}
                          disabled={!!existingLink}
                        >
                          <View style={styles.supplierOptionContent}>
                            <Text
                              style={[
                                styles.supplierOptionName,
                                isSelected && styles.supplierOptionNameSelected,
                                existingLink && styles.supplierOptionNameDisabled,
                              ]}
                            >
                              {supplier.name}
                            </Text>
                            <Text
                              style={[
                                styles.supplierOptionId,
                                existingLink && styles.supplierOptionNameDisabled,
                              ]}
                            >
                              ID: {supplier.id}
                              {existingLink && ` (${existingLink.status})`}
                            </Text>
                            {supplier.description && (
                              <Text
                                style={[
                                  styles.supplierOptionDesc,
                                  existingLink && styles.supplierOptionNameDisabled,
                                ]}
                                numberOfLines={2}
                              >
                                {supplier.description}
                              </Text>
                            )}
                          </View>
                          {isSelected && !existingLink && (
                            <Text style={styles.checkmark}>✓</Text>
                          )}
                        </TouchableOpacity>
                      )
                    })}
                  </ScrollView>
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      (!selectedSupplierId || submitting) && styles.submitButtonDisabled,
                    ]}
                    onPress={handleCreateLink}
                    disabled={!selectedSupplierId || submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.submitButtonText}>{t('links.requestLink')}</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          {isConsumer(user) ? t('links.mySupplierLinks', 'My Supplier Links') : t('links.consumerLinks', 'Consumer Links')}
        </Text>

        {links.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('links.noLinks')}</Text>
            {isConsumer(user) && (
              <Text style={styles.emptySubtext}>
                {t('links.requestLinkToGetStarted', 'Request a link to a supplier to get started')}
              </Text>
            )}
          </View>
        ) : (
          links.map((link) => (
            <View key={link.id} style={styles.linkCard}>
              <View style={styles.linkHeader}>
                <View style={styles.linkInfo}>
                  <Text style={styles.linkTitle}>
                    {isConsumer(user) ? link.supplier_name : link.consumer_name}
                  </Text>
                  <Text style={styles.linkSubtitle}>
                    {isConsumer(user)
                      ? `${t('links.supplierId', 'Supplier ID')}: ${link.supplier_id}`
                      : `${t('orders.consumer')}: ${link.consumer_name}`}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(link.status) },
                  ]}
                >
                  <Text style={styles.statusText}>{t(`links.${link.status}`, getStatusLabel(link.status))}</Text>
                </View>
              </View>

              <View style={styles.linkMeta}>
                <Text style={styles.metaText}>
                  {t('common.created')}: {new Date(link.created_at).toLocaleDateString()}
                </Text>
                {link.updated_at && (
                  <Text style={styles.metaText}>
                    {t('common.updated')}: {new Date(link.updated_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>
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
  formSection: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  toggleFormButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  toggleFormText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
    textAlign: 'center',
  },
  form: {
    marginTop: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSuppliers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  supplierList: {
    maxHeight: 200,
    marginBottom: 12,
  },
  supplierOption: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  supplierOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  supplierOptionDisabled: {
    opacity: 0.5,
    backgroundColor: '#f3f4f6',
  },
  supplierOptionContent: {
    flex: 1,
  },
  supplierOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  supplierOptionNameSelected: {
    color: '#3b82f6',
  },
  supplierOptionNameDisabled: {
    color: '#6b7280',
  },
  supplierOptionId: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  supplierOptionDesc: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  checkmark: {
    fontSize: 20,
    color: '#3b82f6',
    fontWeight: 'bold',
  },
  noSuppliersText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  listSection: {
    padding: 16,
    paddingTop: 0,
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
  linkCard: {
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
  linkHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  linkInfo: {
    flex: 1,
    marginRight: 12,
  },
  linkTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  linkSubtitle: {
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
  linkMeta: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
})
