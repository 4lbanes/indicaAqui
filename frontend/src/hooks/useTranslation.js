import { useLanguage } from '../context/LanguageContext.jsx';

export const useTranslation = () => {
  const { t, language, setLanguage, availableLanguages } = useLanguage();
  return { t, language, setLanguage, availableLanguages };
};
