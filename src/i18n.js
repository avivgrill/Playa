import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es.json'

i18n
  .use(initReactI18next)
  .init({
    resources: { es: { translation: es } },
    // Start with cached value; AuthContext will override on login with saved preference
    lng: localStorage.getItem('playa_lang') || 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  })

export function setLanguage(lang) {
  i18n.changeLanguage(lang)
  localStorage.setItem('playa_lang', lang)
}

export default i18n
