import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import tr from '../locales/tr.json';
import en from '../locales/en.json';

const savedLocale = localStorage.getItem('ayazma_locale') ?? 'tr';

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: savedLocale,
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export default i18n;

export function setLocale(locale: 'tr' | 'en') {
  localStorage.setItem('ayazma_locale', locale);
  i18n.changeLanguage(locale);
}

export function getLocale(): 'tr' | 'en' {
  return (i18n.language === 'en' ? 'en' : 'tr') as 'tr' | 'en';
}
