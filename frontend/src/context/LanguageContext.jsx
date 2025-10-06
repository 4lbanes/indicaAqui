import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fallbackLanguage, languages, translations } from '../i18n/translations.js';

const LanguageContext = createContext({
  language: fallbackLanguage,
  setLanguage: () => {},
  t: (key) => key,
});

const STORAGE_KEY = 'indica-language';

const getNestedValue = (obj, path) => path
  .split('.')
  .reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    return stored && translations[stored] ? stored : fallbackLanguage;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language);
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    availableLanguages: languages,
    t: (key, fallback) => {
      const langPack = translations[language] || translations[fallbackLanguage] || {};
      const fallbackPack = translations[fallbackLanguage] || {};
      const primary = getNestedValue(langPack, key);
      if (primary !== undefined) {
        return primary;
      }
      const secondary = getNestedValue(fallbackPack, key);
      return secondary !== undefined ? secondary : fallback ?? key;
    },
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
