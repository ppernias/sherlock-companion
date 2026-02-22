import React, { createContext, useContext, useState, useEffect } from 'react';
import { verifyToken } from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isGameAccess, setIsGameAccess] = useState(false);
  const [maxCase, setMaxCase] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await verifyToken();
      const userData = response.data.user;
      setUser(userData);
      setIsAuthenticated(true);
      setIsAdmin(userData.role === 'admin');
      setIsGameAccess(userData.role === 'game' || userData.role === 'admin');
      // For game role, maxCase comes from JWT; for admin, access to all cases
      setMaxCase(userData.role === 'admin' ? 10 : (userData.maxCase || 10));
    } catch (error) {
      console.error('Auth verification failed:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setLoading(false);
    }
  };

  const loginWithPin = (token, caseLevel) => {
    localStorage.setItem('token', token);
    setIsAuthenticated(true);
    setIsGameAccess(true);
    setIsAdmin(false);
    setMaxCase(caseLevel || 10);
    setUser({ role: 'game', maxCase: caseLevel || 10 });
  };

  const loginAsAdmin = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
    setIsAdmin(true);
    setIsGameAccess(true);
    setMaxCase(10); // Admin has access to all cases
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setIsGameAccess(false);
    setMaxCase(null);
  };

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    isGameAccess,
    maxCase,
    loading,
    loginWithPin,
    loginAsAdmin,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
