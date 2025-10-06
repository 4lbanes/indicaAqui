import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fetchProfile } from '../api/client.js';

const AuthContext = createContext({
  user: null,
  token: null,
  loading: false,
  login: () => {},
  logout: () => {},
  refreshProfile: async () => {},
});

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        setUser(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const profile = await fetchProfile(token);
        if (!ignore) {
          setUser(profile);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Erro ao carregar perfil:', err);
          setError(err.message);
          setUser(null);
          localStorage.removeItem('authToken');
          setToken(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      ignore = true;
    };
  }, [token]);

  const login = (newToken, profile) => {
    localStorage.setItem('authToken', newToken);
    setToken(newToken);
    setUser(profile);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
    setError(null);
  };

  const refreshProfile = async () => {
    if (!token) return;
    const profile = await fetchProfile(token);
    setUser(profile);
  };

  const value = useMemo(() => ({
    user,
    token,
    loading,
    error,
    login,
    logout,
    refreshProfile,
  }), [user, token, loading, error]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
