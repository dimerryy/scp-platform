import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'
import apiClient from '../api/client'

interface Link {
  id: number
  supplier_id: number
  consumer_id: number
  status: 'pending' | 'accepted' | 'removed' | 'blocked'
  created_at: string
  supplier_name?: string
  consumer_name?: string
}

export default function Links() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const isSupplierStaff = useIsSupplierStaff()
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSupplierStaff) {
      fetchLinks()
    }
  }, [isSupplierStaff])

  const fetchLinks = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get('/links/my')
      setLinks(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch links')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (linkId: number, status: 'accepted' | 'blocked' | 'removed') => {
    try {
      setError('') // Clear previous errors
      await apiClient.post(`/links/${linkId}/status`, { status })
      fetchLinks()
    } catch (err: any) {
      // Handle validation errors (422) and other errors
      let errorMessage = 'Failed to update link status'
      
      if (err.response?.data) {
        // Check if it's a validation error (422) with detail array
        if (err.response.status === 422 && Array.isArray(err.response.data.detail)) {
          // Extract validation error messages
          errorMessage = err.response.data.detail
            .map((err: any) => err.msg || err.message || 'Validation error')
            .join(', ')
        } else if (err.response.data.detail) {
          // Single error message
          errorMessage = typeof err.response.data.detail === 'string' 
            ? err.response.data.detail 
            : JSON.stringify(err.response.data.detail)
        }
      } else if (err.message) {
        errorMessage = err.message
      }
      
      setError(errorMessage)
    }
  }

  // Web Links page is only for supplier staff
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('links.title')}</h1>
        <p className="text-gray-600 mb-6">
          {t('links.manageRequests')}
        </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('links.consumer')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
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
              {links.map((link) => (
                <tr key={link.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {link.consumer_name || `Consumer #${link.consumer_id}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        link.status === 'accepted'
                          ? 'bg-green-100 text-green-800'
                          : link.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {t(`links.${link.status}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(link.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {link.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleStatusUpdate(link.id, 'accepted')}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          {t('links.accept')}
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(link.id, 'blocked')}
                          className="text-red-600 hover:text-red-900 font-medium"
                        >
                          {t('links.reject')}
                        </button>
                      </div>
                    )}
                    {link.status === 'accepted' && (
                      <button
                        onClick={() => handleStatusUpdate(link.id, 'blocked')}
                        className="text-orange-600 hover:text-orange-900 font-medium"
                      >
                        {t('links.block')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {links.length === 0 && (
            <div className="text-center py-8 text-gray-500">{t('links.noLinks')}</div>
          )}
        </div>
      )}
    </div>
  )
}
