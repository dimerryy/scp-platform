import { useTranslation } from 'react-i18next'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const isSupplierStaff = useIsSupplierStaff()

  // Web dashboard is only for supplier staff (Owner/Manager)
  // Consumers should not access web
  if (!isSupplierStaff) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-900 mb-2">
            {t('dashboard.notAvailable', 'Web Dashboard Not Available')}
          </h2>
          <p className="text-yellow-800">
            {t('dashboard.webOnly', 'This web dashboard is for Supplier Owners and Managers only. Consumers should use the mobile app.')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">
        {t('dashboard.welcome')}, {user?.full_name}!
      </h1>
      <p className="text-gray-600 mb-6">
        {t('dashboard.subtitle', 'Supplier Admin Dashboard - Manage your supplier operations')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/links"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">🔗 {t('links.title')}</h2>
          <p className="text-gray-600">
            {t('links.manageRequests')}
          </p>
        </Link>

        <Link
          to="/orders"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">🛒 {t('orders.title')}</h2>
          <p className="text-gray-600">
            {t('orders.viewManage')}
          </p>
        </Link>

        <Link
          to="/products"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">📦 {t('products.title')}</h2>
          <p className="text-gray-600">{t('products.manageCatalog', 'Manage your product catalog')}</p>
        </Link>

        <Link
          to="/chat"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">💬 {t('chat.title')}</h2>
          <p className="text-gray-600">{t('chat.withConsumers', 'Chat with consumers')}</p>
        </Link>

        <Link
          to="/complaints"
          className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-2">📝 {t('complaints.title')}</h2>
          <p className="text-gray-600">{t('complaints.viewManage', 'View and manage complaints')}</p>
        </Link>

        {user?.supplier_roles.some((sr) => sr.role === 'OWNER') && (
          <Link
            to="/staff"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">👥 {t('staff.title')}</h2>
            <p className="text-gray-600">{t('staff.manageStaff')}</p>
          </Link>
        )}
      </div>
    </div>
  )
}
