import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from '../api/auth';
import { setAccessToken, clearTokens, getAccessToken } from './token';
import { initSocket, disconnectSocket } from '../websocket/socket';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = getAccessToken();
        if (token) {
          const response = await authAPI.getCurrentUser();
          setUser(response.data);
          initSocket(token);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        clearTokens();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login({ email, password });
      const { access_token: accessToken } = response.data;
      
      setAccessToken(accessToken);
      const userResponse = await authAPI.getCurrentUser();
      setUser(userResponse.data);
      initSocket(accessToken);
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const register = async (name, email, password) => {
    try {
      setError(null);
      await authAPI.register({ name, email, password });
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.detail || 'Registration failed';
      setError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      // Logout is client-side because the backend uses stateless JWT access tokens.
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearTokens();
      setUser(null);
      disconnectSocket();
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
