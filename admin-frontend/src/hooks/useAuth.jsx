import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { adminApi } from '../api/adminApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize state from local storage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    const savedUser = localStorage.getItem('adminUser');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        // Clear corrupt storage
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminUser');
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await adminApi.login({ email, password });
      
      if (res.success && res.data) {
        const { accessToken, admin } = res.data;
        
        localStorage.setItem('adminToken', accessToken);
        localStorage.setItem('adminUser', JSON.stringify(admin));
        
        setToken(accessToken);
        setUser(admin);
        return { success: true };
      }
      return { success: false, message: res.message || 'Login failed' };
    } catch (error) {
      return { success: false, message: error.message || 'Authentication failed' };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    setToken(null);
    setUser(null);
  }, []);

  // Role permissions checking helpers
  const isSuperAdmin = useCallback(() => user?.role === 'SUPER_ADMIN', [user]);
  const isModerator = useCallback(() => user?.role === 'MODERATOR' || user?.role === 'SUPER_ADMIN', [user]);
  const isSupport = useCallback(() => ['SUPER_ADMIN', 'MODERATOR', 'SUPPORT'].includes(user?.role), [user]);

  const hasRole = useCallback((allowedRoles = []) => {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }, [user]);

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isSuperAdmin,
    isModerator,
    isSupport,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
