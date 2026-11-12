import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Check existing token on startup
  useEffect(() => {
    async function loadUser() {
      const token = localStorage.getItem('twitchnt_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
          setChannel(res.data.channel);
        } catch (err) {
          console.error('Session expired or invalid:', err);
          localStorage.removeItem('twitchnt_token');
          setUser(null);
          setChannel(null);
        }
      }
      setLoading(false);
    }
    loadUser();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    localStorage.setItem('twitchnt_token', res.data.token);
    setUser(res.data.user);
    setChannel(res.data.channel);
    setIsAuthModalOpen(false);
    return res.data;
  };

  const register = async ({ username, displayName, email, password }) => {
    const res = await api.post('/auth/register', { username, displayName, email, password });
    localStorage.setItem('twitchnt_token', res.data.token);
    setUser(res.data.user);
    setChannel(res.data.channel);
    setIsAuthModalOpen(false);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('twitchnt_token');
    setUser(null);
    setChannel(null);
  };

  const refreshChannel = async () => {
    if (!user) return;
    try {
      const res = await api.get(`/channels/${user.username}`);
      setChannel(res.data);
    } catch (err) {
      console.error('Error refreshing channel:', err);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        channel,
        loading,
        login,
        register,
        logout,
        refreshChannel,
        isAuthModalOpen,
        setIsAuthModalOpen
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
