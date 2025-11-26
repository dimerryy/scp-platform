import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'
import apiClient from '../api/client'

interface LinkType {
  id: number
  supplier_id: number
  consumer_id: number
  status: string
  supplier_name: string
  consumer_name: string
  created_at: string
}

export default function ChatList() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const isSupplierStaff = useIsSupplierStaff()
  const navigate = useNavigate()
  const [links, setLinks] = useState<LinkType[]>([])
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
      // Filter to only accepted links (only these can have chats)
      const acceptedLinks = response.data.filter((link: LinkType) => link.status === 'accepted')
      setLinks(acceptedLinks)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch links')
    } finally {
      setLoading(false)
    }
  }

  const handleChatClick = (link: LinkType) => {
    navigate(`/chat/${link.supplier_id}/${link.consumer_id}`)
  }

  // Web ChatList is only for supplier staff
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('chat.title')}</h1>
      <p className="text-gray-600 mb-6">
        {t('chat.withAcceptedLinks', 'Chat with consumers who have accepted links')}
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">{t('common.loading')}</div>
      ) : links.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg mb-2">{t('chat.noActiveChats', 'No Active Chats')}</p>
          <p className="text-gray-400">
            {t('chat.needAcceptedLink', 'You need at least one accepted consumer link to start chatting')}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="divide-y divide-gray-200">
            {links.map((link) => (
              <button
                key={link.id}
                onClick={() => handleChatClick(link)}
                className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center mr-4">
                    <span className="text-white font-semibold text-lg">
                      {link.consumer_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {link.consumer_name}
                    </h3>
                    <p className="text-sm text-gray-500">{t('orders.consumer')}</p>
                  </div>
                </div>
                <span className="text-gray-400 text-xl">›</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

