import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth, useIsSupplierStaff } from '../context/AuthContext'
import apiClient from '../api/client'

interface Message {
  id: number
  supplier_id: number
  consumer_id: number
  sender_id: number
  sender_name: string | null
  sender_role: string | null
  text: string
  file_url: string | null
  created_at: string
}

export default function Chat() {
  const { supplierId, consumerId } = useParams<{
    supplierId: string
    consumerId: string
  }>()
  const { user } = useAuth()
  const { t } = useTranslation()
  const isSupplierStaff = useIsSupplierStaff()
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [consumerName, setConsumerName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (supplierId && consumerId && isSupplierStaff) {
      fetchMessages()
      // Poll for new messages every 5 seconds
      const interval = setInterval(fetchMessages, 5000)
      return () => clearInterval(interval)
    }
  }, [supplierId, consumerId, isSupplierStaff])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Fetch consumer name from links
    if (consumerId) {
      fetchConsumerName()
    }
  }, [consumerId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchConsumerName = async () => {
    try {
      // Get consumer name from links
      const response = await apiClient.get('/links/my')
      const link = response.data.find(
        (l: any) => l.consumer_id === parseInt(consumerId!)
      )
      if (link) {
        setConsumerName(link.consumer_name)
      }
    } catch (err: any) {
      console.error('Failed to fetch consumer name:', err)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await apiClient.get(
        `/chat/threads/${supplierId}/${consumerId}`
      )
      setMessages(response.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch messages')
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || sending) return

    const textToSend = newMessage.trim()
    setNewMessage('')
    setSending(true)
    setError('')

    try {
      await apiClient.post('/chat/messages', {
        supplier_id: parseInt(supplierId!),
        consumer_id: parseInt(consumerId!),
        text: textToSend,
      })
      // Refresh messages
      await fetchMessages()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send message')
      setNewMessage(textToSend) // Restore message on error
    } finally {
      setSending(false)
    }
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return t('chat.justNow', 'Just now')
    if (diffMins < 60) return t('chat.minutesAgo', '{{minutes}}m ago', { minutes: diffMins })
    if (diffMins < 1440) return t('chat.hoursAgo', '{{hours}}h ago', { hours: Math.floor(diffMins / 60) })
    return date.toLocaleDateString()
  }

  // Web Chat is only for supplier staff
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
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-200px)]">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <button
            onClick={() => navigate('/chat')}
            className="text-blue-600 hover:text-blue-800 mb-2"
          >
            ← {t('chat.backToChats', 'Back to Chats')}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('chat.chatWith', 'Chat with')} {consumerName || t('chat.consumer', 'Consumer')} #{consumerId}
          </h1>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md flex-1 flex flex-col">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">
            {consumerName || `Consumer #${consumerId}`}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-gray-500 text-lg mb-2">{t('chat.noMessages')}</p>
                <p className="text-gray-400">{t('chat.startConversation', 'Start the conversation!')}</p>
              </div>
            </div>
          ) : (
            messages.map((message) => {
              const isMine = message.sender_id === user?.id
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                >
                  {!isMine && message.sender_name && (
                    <div className="text-xs text-gray-500 mb-1 ml-2">
                      {message.sender_name}
                      {message.sender_role && (
                        <span className="italic text-gray-400"> ({message.sender_role})</span>
                      )}
                    </div>
                  )}
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      isMine
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                    {message.file_url && (
                      <a
                        href={`http://localhost:8000${message.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-sm mt-2 underline ${
                          isMine ? 'text-blue-100' : 'text-blue-600'
                        }`}
                      >
                        📎 {t('chat.viewAttachment', 'View Attachment')}
                      </a>
                    )}
                    <p
                      className={`text-xs mt-1 ${
                        isMine ? 'text-blue-100' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-gray-200">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={t('chat.typeMessage')}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                disabled={sending}
                maxLength={1000}
              />
              <div className="mt-2">
                <label className="cursor-pointer inline-flex items-center px-3 py-1 text-sm text-gray-600 hover:text-blue-600 border border-gray-300 rounded-md hover:border-blue-500">
                  <input
                    type="file"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      
                      setSending(true)
                      try {
                        const formData = new FormData()
                        formData.append('supplier_id', supplierId!)
                        formData.append('consumer_id', consumerId!)
                        formData.append('text', newMessage || '')
                        formData.append('file', file)
                        
                        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/chat/messages/upload`, {
                          method: 'POST',
                          headers: {
                            'Authorization': `Bearer ${localStorage.getItem('scp_access_token')}`,
                          },
                          body: formData,
                        })
                        
                        if (!response.ok) throw new Error('Failed to upload')
                        
                        const data = await response.json()
                        setNewMessage('')
                        fetchMessages()
                      } catch (err: any) {
                        setError(err.message || 'Failed to upload file')
                      } finally {
                        setSending(false)
                      }
                    }}
                    disabled={sending}
                  />
                  📎 {t('chat.attachFile')}
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? t('chat.sending', 'Sending...') : t('chat.send')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
