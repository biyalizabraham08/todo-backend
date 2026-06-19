import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

const parseJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch (e) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      // Check token expiry (if exp exists)
      if (decoded && (!decoded.exp || decoded.exp * 1000 > Date.now())) {
        setUser(decoded);
        api.defaults.headers.common['x-auth-token'] = token;
      } else {
        // Token expired
        logout();
      }
    } else {
      setUser(null);
      delete api.defaults.headers.common['x-auth-token'];
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: receivedToken } = response.data;
      localStorage.setItem('token', receivedToken);
      setToken(receivedToken);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data || 'Login failed. Please try again.'
      };
    }
  };

  const signup = async (name, email, password) => {
    try {
      await api.post('/auth/signup', { name, email, password });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data || 'Signup failed. Please try again.'
      };
    }
  };

  const updateToken = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete api.defaults.headers.common['x-auth-token'];
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout, updateToken }}>
      {children}
    </AuthContext.Provider>
  );
};
