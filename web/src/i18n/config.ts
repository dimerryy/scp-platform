import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enTranslations from './locales/en.json'
import ruTranslations from './locales/ru.json'
import kzTranslations from './locales/kz.json'

i18n
  .use(LanguageDetector)
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
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'scp_language',
    },
  })

export default i18n

