import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'

export default function Sidebar() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const location = useLocation()
  const isSupplierStaff = useIsSupplierStaff()

  const isActive = (path: string) => location.pathname === path

  // Web sidebar is only for supplier staff
  const isOwner = user?.supplier_roles.some((sr) => sr.role === 'OWNER')
  const isOwnerOrManager = user?.supplier_roles.some(
    (sr) => sr.role === 'OWNER' || sr.role === 'MANAGER'
  )
  
  const supplierLinks = [
    { path: '/dashboard', label: t('dashboard.title'), icon: '📊' },
    { path: '/links', label: t('links.title'), icon: '🔗' },
    { path: '/orders', label: t('orders.title'), icon: '🛒' },
    ...(isOwnerOrManager ? [{ path: '/products', label: t('products.title'), icon: '📦' }] : []),
    { path: '/chat', label: t('chat.title'), icon: '💬' },
    { path: '/complaints', label: t('complaints.title'), icon: '📝' },
    ...(isOwner ? [{ path: '/staff', label: t('staff.title'), icon: '👥' }] : []),
  ]

  // Only show sidebar for supplier staff
  if (!isSupplierStaff) {
    return null
  }

  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('common.navigation', 'Navigation')}</h2>
        <nav className="space-y-2">
          {supplierLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(link.path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="text-xl">{link.icon}</span>
              <span className="font-medium">{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  )
}
