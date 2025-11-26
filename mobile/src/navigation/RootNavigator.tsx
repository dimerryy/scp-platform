import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { useAuth } from '../context/AuthContext'
import AuthStack from './AuthStack'
import AppStack from './AppStack'

export default function RootNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return isAuthenticated ? <AppStack /> : <AuthStack />
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
})

