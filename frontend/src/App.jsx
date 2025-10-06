import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import { useTranslation } from './hooks/useTranslation.js';
import AuthPage from './pages/AuthPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { token, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="auth-card">
        <p className="loading">{t('app.loading')}</p>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? t('app.themeToggle.light') : t('app.themeToggle.dark')}
    >
      <span aria-hidden="true">{isDark ? '☀' : '☾'}</span>
    </button>
  );
};

const LanguageToggle = () => {
  const { language, setLanguage, availableLanguages, t } = useTranslation();
  const entries = Object.entries(availableLanguages);
  const handleClick = () => {
    const index = entries.findIndex(([code]) => code === language);
    const nextEntry = entries[(index + 1) % entries.length];
    setLanguage(nextEntry[0]);
  };
  return (
    <button
      type="button"
      className="language-toggle"
      onClick={handleClick}
      aria-label={t('app.languageToggle')}
    >
      <span>{language.toUpperCase()}</span>
    </button>
  );
};

const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<AuthPage />} />
    <Route
      path="/profile"
      element={(
        <ProtectedRoute>
          <ProfilePage />
        </ProtectedRoute>
      )}
    />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <LanguageProvider>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="app-shell">
            <ThemeToggle />
            <LanguageToggle />
            <AppRoutes />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </LanguageProvider>
);

export default App;
