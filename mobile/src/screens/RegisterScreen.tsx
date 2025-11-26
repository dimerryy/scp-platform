import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { useTranslation } from 'react-i18next'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { AuthStackParamList } from '../types'
import { registerConsumer } from '../api/auth'
import { saveAuth } from '../api/authStorage'

type NavigationProp = NativeStackNavigationProp<AuthStackParamList>

export default function RegisterScreen() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigation = useNavigation<NavigationProp>()

  const validateForm = (): boolean => {
    if (!email || !password || !fullName || !organizationName) {
      setError(t('auth.fillAllFields', 'Please fill in all required fields'))
      return false
    }
    return true
  }

  const handleRegister = async () => {
    if (!validateForm()) {
      return
    }

    setError('')
    setLoading(true)

    try {
      // Register as consumer
      const loginResponse = await registerConsumer(
        email,
        password,
        fullName,
        organizationName
      )

      // Save auth and navigate will happen automatically
      await saveAuth(loginResponse.access_token, loginResponse.user)

      Alert.alert(t('common.success'), t('auth.registerSuccess'), [
        {
          text: t('common.ok'),
          onPress: () => {
            // Navigation will happen automatically via RootNavigator
          },
        },
      ])
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.detail || err.message || t('auth.registerFailed')
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('auth.registerAsConsumer', 'Register as Consumer')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.createConsumerAccount', 'Create your consumer account to connect with suppliers')}
          </Text>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={styles.input}
            placeholder={`${t('auth.email')} *`}
            value={email}
            onChangeText={(text) => {
              setEmail(text)
              setError('')
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder={`${t('auth.password')} *`}
            value={password}
            onChangeText={(text) => {
              setPassword(text)
              setError('')
            }}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder={`${t('auth.fullName')} *`}
            value={fullName}
            onChangeText={(text) => {
              setFullName(text)
              setError('')
            }}
            autoCapitalize="words"
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder={`${t('auth.organizationName', 'Organization Name')} *`}
            value={organizationName}
            onChangeText={(text) => {
              setOrganizationName(text)
              setError('')
            }}
            autoCapitalize="words"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('auth.register')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => navigation.navigate('Login')}
            disabled={loading}
          >
            <Text style={styles.linkText}>{t('auth.haveAccount', "Already have an account? Log in")}</Text>
          </TouchableOpacity>

          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              {t('auth.registrationNote', "Note: Sales and Manager staff cannot register here.\nThey must be added by a Supplier Owner and then login.")}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
  },
  noteContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noteText: {
    fontSize: 12,
    color: '#92400e',
    textAlign: 'center',
    lineHeight: 18,
  },
})
