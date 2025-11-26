import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import * as DocumentPicker from 'expo-document-picker'
import { useRoute, RouteProp } from '@react-navigation/native'
import type { AppStackParamList } from '../types'
import { useAuth } from '../context/AuthContext'
import { isConsumer } from '../utils/roleHelpers'
import { getThread, sendMessage } from '../api/chat'
import type { Message } from '../types/api'
import { API_BASE_URL } from '../config'
import { getAccessToken } from '../api/authStorage'

type ChatThreadRouteProp = RouteProp<AppStackParamList, 'ChatThread'>

export default function ChatThreadScreen() {
  const route = useRoute<ChatThreadRouteProp>()
  const { supplierId, consumerId } = route.params
  const { user } = useAuth()
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [messageText, setMessageText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const scrollViewRef = useRef<ScrollView>(null)

  const loadMessages = async () => {
    try {
      const data = await getThread(supplierId, consumerId)
      setMessages(data)
      // Scroll to bottom after loading
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false })
      }, 100)
    } catch (error: any) {
      console.error('Failed to load messages:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [supplierId, consumerId])

  // Polling: refresh messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!sending) {
        loadMessages()
      }
    }, 5000) // 5 seconds

    return () => clearInterval(interval)
  }, [supplierId, consumerId, sending])

  const handleSend = async () => {
    if (!messageText.trim()) return

    const textToSend = messageText.trim()
    setMessageText('')
    setSending(true)

    try {
      // Use route params directly - backend validates permissions
      const newMessage = await sendMessage({
        supplier_id: supplierId,
        consumer_id: consumerId,
        text: textToSend,
      })

      // Add message to local state immediately
      setMessages((prev) => [...prev, newMessage])
      
      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error('Failed to send message:', error)
      Alert.alert(t('common.error'), error.response?.data?.detail || t('chat.failedToSend'))
      // Restore message text on error
      setMessageText(textToSend)
    } finally {
      setSending(false)
    }
  }

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const file = result.assets[0]
      setUploading(true)

      const token = await getAccessToken()
      const formData = new FormData()
      formData.append('supplier_id', supplierId.toString())
      formData.append('consumer_id', consumerId.toString())
      formData.append('text', messageText || '')
      
      // @ts-ignore - FormData file handling for React Native
      formData.append('file', {
        uri: file.uri,
        type: file.mimeType || 'application/octet-stream',
        name: file.name || 'file',
      } as any)

      const response = await fetch(`${API_BASE_URL}/chat/messages/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || t('chat.failedToUpload'))
      }

      const newMessage = await response.json()
      setMessageText('')
      setMessages((prev) => [...prev, newMessage])
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
    } catch (error: any) {
      console.error('Failed to upload file:', error)
      Alert.alert(t('common.error'), error.message || t('chat.failedToUpload'))
    } finally {
      setUploading(false)
    }
  }

  const isMyMessage = (message: Message): boolean => {
    return message.sender_id === user?.id
  }

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return t('chat.justNow', 'Just now')
    if (diffMins < 60) return t('chat.minutesAgo', { count: diffMins }, `${diffMins}m ago`)
    if (diffMins < 1440) return t('chat.hoursAgo', { count: Math.floor(diffMins / 60) }, `${Math.floor(diffMins / 60)}h ago`)
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t('chat.loadingMessages', 'Loading messages...')}</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('chat.noMessages')}</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
          </View>
        ) : (
          messages.map((message) => {
            const isMine = isMyMessage(message)
            return (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  isMine ? styles.messageContainerRight : styles.messageContainerLeft,
                ]}
              >
                {!isMine && message.sender_name && (
                  <Text style={styles.senderName}>
                    {message.sender_name}
                    {message.sender_role && (
                      <Text style={styles.senderRole}> ({message.sender_role})</Text>
                    )}
                  </Text>
                )}
                <View
                  style={[
                    styles.messageBubble,
                    isMine ? styles.messageBubbleRight : styles.messageBubbleLeft,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      isMine ? styles.messageTextRight : styles.messageTextLeft,
                    ]}
                  >
                    {message.text}
                  </Text>
                  {message.file_url && (
                    <TouchableOpacity
                      onPress={() => {
                        // Open file URL
                        Alert.alert(t('chat.fileAttachment', 'File Attachment'), t('chat.file', 'File') + ': ' + message.file_url)
                      }}
                      style={styles.fileLink}
                    >
                      <Text
                        style={[
                          styles.fileLinkText,
                          isMine ? styles.fileLinkTextRight : styles.fileLinkTextLeft,
                        ]}
                      >
                        📎 {t('chat.viewAttachment', 'View Attachment')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <Text
                    style={[
                      styles.messageTime,
                      isMine ? styles.messageTimeRight : styles.messageTimeLeft,
                    ]}
                  >
                    {formatTime(message.created_at)}
                  </Text>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handleFileUpload}
          disabled={uploading || sending}
        >
          {uploading ? (
            <ActivityIndicator color="#3b82f6" size="small" />
          ) : (
            <Text style={styles.attachButtonText}>📎</Text>
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder={t('chat.typeMessage')}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
          editable={!sending && !uploading}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!messageText.trim() || sending || uploading) && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || sending || uploading}
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>{t('chat.send')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageContainerLeft: {
    alignSelf: 'flex-start',
  },
  messageContainerRight: {
    alignSelf: 'flex-end',
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
    marginLeft: 4,
  },
  senderRole: {
    fontSize: 11,
    fontWeight: '400',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleLeft: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    marginBottom: 4,
  },
  messageTextLeft: {
    color: '#111827',
  },
  messageTextRight: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeLeft: {
    color: '#9ca3af',
  },
  messageTimeRight: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
