import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const token = localStorage.getItem('friendbook_token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch {
        localStorage.removeItem('friendbook_token');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    localStorage.setItem('friendbook_token', response.data.token);
    const meResponse = await api.get('/auth/me');
    setUser(meResponse.data);
  };

  const signup = async (name, email, password) => {
    const response = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('friendbook_token', response.data.token);
    const meResponse = await api.get('/auth/me');
    setUser(meResponse.data);
  };

  const googleAuth = async (credential) => {
    const response = await api.post('/auth/google', { credential });
    localStorage.setItem('friendbook_token', response.data.token);
    const meResponse = await api.get('/auth/me');
    setUser(meResponse.data);
  };

  const logout = () => {
    localStorage.removeItem('friendbook_token');
    setUser(null);
  };

  const refreshMe = async () => {
    const response = await api.get('/auth/me');
    setUser(response.data);
    return response.data;
  };

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      googleAuth,
      logout,
      refreshMe,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
