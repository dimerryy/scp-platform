import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AppStackParamList } from '../types'
import { useAuth } from '../context/AuthContext'
import { isConsumer, isSales } from '../utils/roleHelpers'
import { getMyLinks } from '../api/links'
import type { Link } from '../types/api'

type NavigationProp = NativeStackNavigationProp<AppStackParamList>

export default function ChatListScreen() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()
  const [links, setLinks] = useState<Link[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadLinks = async () => {
    try {
      const data = await getMyLinks()
      // Filter to only accepted links (only these can have chats)
      const acceptedLinks = data.filter((link) => link.status === 'accepted')
      setLinks(acceptedLinks)
    } catch (error: any) {
      console.error('Failed to load links:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLinks()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadLinks()
  }

  const handleChatPress = (link: Link) => {
    navigation.navigate('ChatThread', {
      supplierId: link.supplier_id,
      consumerId: link.consumer_id,
    })
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>{t('chat.loading', 'Loading chats...')}</Text>
      </View>
    )
  }

  const acceptedLinks = links.filter((link) => link.status === 'accepted')

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {acceptedLinks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('chat.noActiveChats', 'No Active Chats')}</Text>
          <Text style={styles.emptySubtext}>
            {isConsumer(user)
              ? t('chat.noChatsConsumer', 'You need at least one accepted supplier link to start chatting')
              : t('chat.noChatsSales', 'You need at least one accepted consumer link to start chatting')}
          </Text>
        </View>
      ) : (
        <View style={styles.chatList}>
          {acceptedLinks.map((link) => {
            const otherPartyName = isConsumer(user)
              ? link.supplier_name
              : link.consumer_name

            return (
              <TouchableOpacity
                key={link.id}
                style={styles.chatItem}
                onPress={() => handleChatPress(link)}
              >
                <View style={styles.chatAvatar}>
                  <Text style={styles.chatAvatarText}>
                    {otherPartyName.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.chatInfo}>
                  <Text style={styles.chatName}>{otherPartyName}</Text>
                  <Text style={styles.chatSubtext}>
                    {isConsumer(user) ? 'Supplier' : 'Consumer'}
                  </Text>
                </View>
                <Text style={styles.chatArrow}>›</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  chatList: {
    padding: 16,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
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
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  chatSubtext: {
    fontSize: 14,
    color: '#6b7280',
  },
  chatArrow: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '300',
  },
})
