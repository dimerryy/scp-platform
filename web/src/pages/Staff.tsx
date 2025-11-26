import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import apiClient from '../api/client'

// Simple alert function for web (since window.alert is available)
const Alert = {
  alert: (title: string, message: string) => {
    window.alert(`${title}\n\n${message}`)
  }
}

interface Supplier {
  id: number
  name: string
}

interface StaffMember {
  id: number
  user_id: number
  role: 'OWNER' | 'MANAGER' | 'SALES'
  user: {
    id: number
    email: string
    full_name: string
  }
}

export default function Staff() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState<number | null>(null)
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Form state
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'MANAGER' | 'SALES'>('SALES')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [newStaffEmail, setNewStaffEmail] = useState('')

  useEffect(() => {
    fetchSuppliers()
  }, [])

  useEffect(() => {
    if (selectedSupplierId) {
      fetchStaff(selectedSupplierId)
    }
  }, [selectedSupplierId])

  const fetchSuppliers = async () => {
    try {
      const response = await apiClient.get('/suppliers/my')
      setSuppliers(response.data)
      if (response.data.length > 0) {
        setSelectedSupplierId(response.data[0].id)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch suppliers')
    }
  }

  const fetchStaff = async (supplierId: number) => {
    setLoading(true)
    try {
      const response = await apiClient.get(`/suppliers/${supplierId}/staff`)
      // Transform response to match our interface
      const staffData = response.data.map((item: any) => ({
        id: item.id,
        user_id: item.user_id,
        role: item.role,
        user: item.user || {
          id: item.user_id,
          email: 'Unknown',
          full_name: 'Unknown',
        },
      }))
      setStaff(staffData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch staff')
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSupplierId || !email.trim()) {
      setError(t('staff.selectSupplierEmail', 'Please select a supplier and enter an email'))
      return
    }

    setSubmitting(true)
    setError('')
    setSuccessMessage('')
    setTempPassword('')
    setNewStaffEmail('')
    try {
      const response = await apiClient.post(`/suppliers/${selectedSupplierId}/staff`, {
        email: email.trim(),
        role,
        full_name: fullName.trim() || undefined,
      })
      setEmail('')
      setFullName('')
      setNewStaffEmail(response.data.user?.email || email.trim())
      setTempPassword(response.data.temporary_password)
      setSuccessMessage(response.data.message)
      fetchStaff(selectedSupplierId)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add staff member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveStaff = async (userId: number) => {
    if (!selectedSupplierId) return
    if (!confirm(t('staff.confirmRemove', 'Are you sure you want to remove this staff member?'))) return

    try {
      await apiClient.delete(`/suppliers/${selectedSupplierId}/staff/${userId}`)
      fetchStaff(selectedSupplierId)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove staff member')
    }
  }

  // Check if user is owner of any supplier
  const isOwner = user?.supplier_roles.some(
    (sr) => sr.role === 'OWNER' && (!selectedSupplierId || sr.supplier_id === selectedSupplierId)
  )

  if (!isOwner) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            {t('common.accessRestricted', 'Access Restricted')}
          </h2>
          <p className="text-yellow-800">
            {t('staff.onlyOwners', 'Only Supplier Owners can manage staff members.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('staff.title')}</h1>
      <p className="text-gray-600 mb-6">
        {t('staff.manageStaff')}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {successMessage && tempPassword && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            ✅ {t('staff.staffAdded')}
          </h3>
          <p className="text-green-800 mb-4">{successMessage}</p>
          <div className="bg-white border border-green-300 rounded p-4">
            <p className="text-sm font-medium text-gray-700 mb-2">
              {t('staff.shareCredentials', 'Share these credentials with')} <strong>{newStaffEmail}</strong>:
            </p>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-gray-600">{t('auth.email')}:</span>
                <span className="ml-2 font-mono text-sm font-semibold">{newStaffEmail}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">{t('staff.tempPassword')}:</span>
                <span className="ml-2 font-mono text-lg font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded">
                  {tempPassword}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-4">
              <strong>{t('common.note', 'Note')}:</strong> {t('staff.loginNote', 'Manager can login via web, Sales can login via mobile app. They should change their password after first login.')}
            </p>
          </div>
          <button
            onClick={() => {
              setSuccessMessage('')
              setTempPassword('')
              setNewStaffEmail('')
            }}
            className="mt-4 text-sm text-green-700 hover:text-green-900 underline"
          >
            {t('common.close')}
          </button>
        </div>
      )}

      {/* Supplier Selection */}
      {suppliers.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('products.selectSupplier', 'Select Supplier')}
          </label>
          <select
            value={selectedSupplierId || ''}
            onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name} (ID: {supplier.id})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add Staff Form */}
      {selectedSupplierId && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('staff.addStaff')}</h2>
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.email')} *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('staff.autoCreate', 'User account will be created automatically if it doesn\'t exist.')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.fullName')} ({t('common.optional', 'Optional')})
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                {t('staff.nameFromEmail', 'If not provided, name will be derived from email.')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('staff.role')} *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'MANAGER' | 'SALES')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SALES">{t('staff.sales')} ({t('staff.mobileApp', 'Mobile App')})</option>
                <option value="MANAGER">{t('staff.manager')} ({t('staff.webDashboard', 'Web Dashboard')})</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium disabled:opacity-50"
            >
              {submitting ? t('staff.adding', 'Adding...') : t('staff.addStaff')}
            </button>
          </form>
        </div>
      )}

      {/* Staff List */}
      {selectedSupplierId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <h2 className="text-xl font-semibold text-gray-900 p-6 border-b border-gray-200">
            {t('staff.currentStaff', 'Current Staff')}
          </h2>
          {loading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : staff.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('staff.noStaff', 'No staff members yet. Add staff using the form above.')}
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('auth.fullName', 'Name')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('auth.email')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('staff.role')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staff.map((member) => (
                  <tr key={member.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.user.full_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {t(`staff.${member.role.toLowerCase()}`, member.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {member.role !== 'OWNER' && (
                        <button
                          onClick={() => handleRemoveStaff(member.user_id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          {t('staff.remove')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Supplier Deletion Section (Owners only) */}
      {selectedSupplierId && user?.supplier_roles.some(
        (sr) => sr.supplier_id === selectedSupplierId && sr.role === 'OWNER'
      ) && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">{t('staff.dangerZone')}</h2>
          <p className="text-red-800 mb-4">
            {t('staff.deleteWarning')}
          </p>
          <button
            onClick={async () => {
              if (!window.confirm(
                t('staff.confirmDelete', 'Are you sure you want to delete this supplier account?').replace('this', `"${suppliers.find(s => s.id === selectedSupplierId)?.name}"`)
              )) return

              try {
                await apiClient.delete(`/suppliers/${selectedSupplierId}`)
                Alert.alert(t('common.success'), t('staff.supplierDeleted'))
                fetchSuppliers()
                setSelectedSupplierId(null)
              } catch (err: any) {
                setError(err.response?.data?.detail || 'Failed to delete supplier')
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
          >
            {t('staff.deleteSupplier')}
          </button>
        </div>
      )}
    </div>
  )
}
