import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'
import { complaintsApi } from '../api/complaints'

interface Complaint {
  id: number
  order_id: number
  description: string
  status: string
  created_at: string
}

export default function Complaints() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const isSupplierStaff = useIsSupplierStaff()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isSupplierStaff) {
      fetchComplaints()
    }
  }, [isSupplierStaff])

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const complaints = await complaintsApi.getMyComplaints()
      setComplaints(complaints)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch complaints')
    } finally {
      setLoading(false)
    }
  }

  const isManagerOrOwner = () => {
    if (!user) return false
    return user.main_role === 'SUPPLIER_MANAGER' || user.main_role === 'SUPPLIER_OWNER'
  }

  const handleResolveComplaint = async (complaintId: number) => {
    const resolution = prompt(t('complaints.enterResolution', 'Enter resolution details (optional)'))
    if (resolution === null) return // User cancelled

    try {
      await complaintsApi.updateComplaintStatus(complaintId, 'resolved', resolution || undefined)
      await fetchComplaints()
      alert(t('common.success', 'Success'))
    } catch (err: any) {
      alert(err.response?.data?.detail || t('complaints.failedToUpdateStatus', 'Failed to update status'))
    }
  }

  // Web Complaints page is only for supplier staff
  if (!isSupplierStaff) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            {t('common.accessRestricted', 'Access Restricted')}
          </h2>
          <p className="text-yellow-800">
            {t('common.ownersManagersOnly', 'This page is for Supplier Owners and Managers only.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('complaints.title')}</h1>
      <p className="text-gray-600 mb-6">
        {t('complaints.viewManage', 'View and manage complaints from consumers')}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : complaints.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t('complaints.noComplaints')}</div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('orders.orderId', 'Order ID')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('complaints.description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.created')}
                </th>
                {isManagerOrOwner() && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('common.actions', 'Actions')}
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {complaints.map((complaint) => (
                <tr key={complaint.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    #{complaint.order_id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {complaint.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        complaint.status === 'resolved'
                          ? 'bg-green-100 text-green-800'
                          : complaint.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : complaint.status === 'open'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {t(`complaints.status.${complaint.status}`, complaint.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(complaint.created_at).toLocaleDateString()}
                  </td>
                  {isManagerOrOwner() && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {complaint.status !== 'resolved' && (
                        <button
                          onClick={() => handleResolveComplaint(complaint.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm font-medium"
                        >
                          {t('complaints.setToResolved', 'Set to Resolved')}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
