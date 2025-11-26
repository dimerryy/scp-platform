import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AppStackParamList } from '../types'
import { isConsumer, isSales } from '../utils/roleHelpers'
import LanguageSwitcher from '../components/LanguageSwitcher'

type NavigationProp = NativeStackNavigationProp<AppStackParamList>

interface MenuButton {
  title: string
  screen: keyof AppStackParamList
  icon?: string
}

export default function DashboardScreen() {
  const { user, logout } = useAuth()
  const { t } = useTranslation()
  const navigation = useNavigation<NavigationProp>()

  // Determine menu items based on user role
  const getMenuItems = (): MenuButton[] => {
    if (!user) return []

    if (isConsumer(user)) {
      // Consumer menu
      return [
        { title: 'Supplier Links', screen: 'Links', icon: '🔗' },
        { title: 'Product Catalog', screen: 'Catalog', icon: '📦' },
        { title: 'My Orders', screen: 'Orders', icon: '🛒' },
        { title: 'Chats', screen: 'ChatList', icon: '💬' },
        { title: 'Complaints', screen: 'Complaints', icon: '📝' },
      ]
    } else if (isSales(user)) {
      // Sales staff menu
      return [
        { title: 'Consumer Links', screen: 'Links', icon: '🔗' },
        { title: 'Orders', screen: 'Orders', icon: '🛒' },
        { title: 'Chats', screen: 'ChatList', icon: '💬' },
        { title: 'Complaints', screen: 'Complaints', icon: '📝' },
      ]
    }

    // Fallback for other roles (Owner, Manager, etc.)
    return [
      { title: 'Links', screen: 'Links', icon: '🔗' },
      { title: 'Orders', screen: 'Orders', icon: '🛒' },
      { title: 'Chats', screen: 'ChatList', icon: '💬' },
      { title: 'Complaints', screen: 'Complaints', icon: '📝' },
    ]
  }

  const menuItems = getMenuItems()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t('dashboard.title')}</Text>
          <LanguageSwitcher />
        </View>
        <Text style={styles.welcome}>{t('dashboard.welcome')}, {user?.full_name || t('common.user', 'User')}!</Text>
        <View style={styles.roleContainer}>
          <Text style={styles.roleLabel}>{t('dashboard.role', 'Role')}:</Text>
          <Text style={styles.roleValue}>{user?.main_role || t('common.unknown', 'Unknown')}</Text>
        </View>
        {user?.email && (
          <Text style={styles.email}>{user.email}</Text>
        )}
      </View>

      <View style={styles.menu}>
        {menuItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('dashboard.noMenuItems', 'No menu items available')}</Text>
            <Text style={styles.emptySubtext}>{t('dashboard.contactSupport', 'Please contact support')}</Text>
          </View>
        ) : (
          <>
            {menuItems.map((item) => {
              // Map screen names to translation keys
              const translationKey = item.screen === 'Links' ? 'dashboard.myLinks' :
                                   item.screen === 'Catalog' ? 'dashboard.catalog' :
                                   item.screen === 'Orders' ? 'dashboard.myOrders' :
                                   item.screen === 'ChatList' ? 'dashboard.chat' :
                                   item.screen === 'Complaints' ? 'dashboard.complaints' :
                                   item.title
              return (
                <TouchableOpacity
                  key={item.screen}
                  style={styles.menuItem}
                  onPress={() => navigation.navigate(item.screen)}
                >
                  <View style={styles.menuItemContent}>
                    {item.icon && <Text style={styles.menuIcon}>{item.icon}</Text>}
                    <Text style={styles.menuText}>{typeof translationKey === 'string' && translationKey.startsWith('dashboard.') ? t(translationKey, item.title) : item.title}</Text>
                  </View>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
              )
            })}
          </>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>{t('auth.logout')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
  },
  welcome: {
    fontSize: 18,
    color: '#374151',
    marginBottom: 8,
    fontWeight: '500',
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginRight: 6,
  },
  roleValue: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  email: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  menu: {
    padding: 16,
  },
  menuItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
    flex: 1,
  },
  menuArrow: {
    fontSize: 24,
    color: '#9ca3af',
    fontWeight: '300',
  },
  emptyContainer: {
    backgroundColor: '#fff',
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
