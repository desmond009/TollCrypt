import { useState, useEffect, useCallback } from 'react';
import { AdminUser, LoginCredentials, AuthResponse, SessionData } from '../types/auth';
import { api } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const response = await api.get('/api/auth/profile');
          if (response.data.success) {
            setUser(response.data.data.user);
            setIsAuthenticated(true);
          } else {
            localStorage.removeItem('authToken');
          }
        }
      } catch (error) {
        console.error('Session check failed:', error);
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ user: AdminUser; token: string }> => {
    try {
      console.log('useAuth login called with:', credentials);
      const response = await api.post('/api/auth/login', credentials);
      console.log('API response:', response.data);
      
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      console.log('Setting user data:', userData);
      setUser(userData);
      setIsAuthenticated(true);
      
      // Force a small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return response.data;
    } catch (error: any) {
      console.error('Login error in useAuth:', error);
      throw new Error(error.response?.data?.message || 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('userData');
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const response = await api.post('/api/auth/refresh');
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      setUser(userData);
      return true;
    } catch (error) {
      logout();
      return false;
    }
  }, [logout]);

  const hasPermission = useCallback((permission: keyof AdminUser['permissions']) => {
    return user?.permissions[permission] || false;
  }, [user]);

  const hasRole = useCallback((roles: AdminUser['role'][]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
  };
};
