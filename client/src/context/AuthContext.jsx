import React, { createContext, useState, useContext, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    verifyExistingToken();
  }, []);

  const verifyExistingToken = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const result = await authService.verifyToken();
        setUser(result.user);
      } catch (error) {
        localStorage.removeItem('token');
        console.log('Token verification failed:', error);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      setError(null);
      const result = await authService.login(email, password);
      localStorage.setItem('token', result.token);
      setUser(result.user);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const register = async (email, password) => {
    try {
      setError(null);
      const result = await authService.register(email, password);
      localStorage.setItem('token', result.token);
      setUser(result.user);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading,
    error,
    clearError,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};