import { useState, useEffect, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { AdminUser, LoginCredentials, AuthResponse, SessionData } from '../types/auth';
import { api } from '../services/api';

export const useAuth = () => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      // Skip session check if we're in the middle of logging in
      if (isLoggingIn) {
        console.log('Session check - skipping because login in progress');
        return;
      }
      
      try {
        const token = localStorage.getItem('authToken');
        console.log('Session check - token exists:', !!token);
        if (token) {
          const response = await api.get('/api/auth/profile');
          if (response.data.success) {
            console.log('Session check - setting user from profile:', response.data.data.user.email);
            setUser(response.data.data.user);
            setIsAuthenticated(true);
          } else {
            console.log('Session check - profile check failed, removing token');
            localStorage.removeItem('authToken');
          }
        } else {
          console.log('Session check - no token found');
        }
      } catch (error) {
        console.error('Session check failed:', error);
        localStorage.removeItem('authToken');
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [isLoggingIn]);

  const login = useCallback(async (credentials: LoginCredentials): Promise<{ user: AdminUser; token: string }> => {
    try {
      console.log('useAuth login called with:', credentials);
      setIsLoggingIn(true);
      
      const response = await api.post('/api/auth/login', credentials);
      console.log('API response:', response.data);
      
      const { token, user: userData } = response.data.data;
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(userData));
      
      console.log('Setting user data:', userData);
      
      // Use flushSync to force synchronous state updates
      flushSync(() => {
        setUser(userData);
        setIsAuthenticated(true);
      });
      
      console.log('Authentication state updated - user:', userData?.email, 'isAuthenticated: true');
      
      // Force a small delay to ensure state updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force a re-render by updating state again
      setUser(prevUser => {
        console.log('Force re-render - user state:', prevUser?.email);
        return prevUser;
      });
      
      setIsLoggingIn(false);
      
      return { user: userData, token };
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
