import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LanguageSwitcher from './LanguageSwitcher'
import { useTranslation } from 'react-i18next'

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="bg-white shadow-md border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-xl font-bold text-gray-900">
            SCP Platform
          </Link>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <span className="text-sm text-gray-600">
                {user?.full_name} ({user?.main_role || 'USER'})
              </span>
              <Link
                to="/dashboard"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('dashboard.title')}
              </Link>
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('auth.logout')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <Link
                to="/login"
                className="text-gray-700 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-medium"
              >
                {t('auth.login')}
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {t('auth.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

