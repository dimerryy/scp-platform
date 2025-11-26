import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import AsyncStorage from '@react-native-async-storage/async-storage'

import enTranslations from './locales/en.json'
import ruTranslations from './locales/ru.json'
import kzTranslations from './locales/kz.json'

const LANGUAGE_STORAGE_KEY = 'scp_language'

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (savedLanguage) {
        callback(savedLanguage)
        return
      }
      
      // Get device language
      const deviceLanguage = Localization.getLocales()[0]?.languageCode || 'en'
      const supportedLanguages = ['en', 'ru', 'kz']
      const detectedLanguage = supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'en'
      callback(detectedLanguage)
    } catch (error) {
      callback('en')
    }
  },
  init: () => {},
  cacheUserLanguage: async (language: string) => {
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch (error) {
      console.error('Failed to save language preference:', error)
    }
  },
}

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ru: { translation: ruTranslations },
      kz: { translation: kzTranslations },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ru', 'kz'],
    interpolation: {
      escapeValue: false, // React Native already escapes values
    },
  })

export default i18n

