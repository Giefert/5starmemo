import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, LoginInput } from '../types/shared';
import apiService from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      const userData = await SecureStore.getItemAsync('userData');

      // If credentials exist but token might be expired, clear them
      // The user will need to log in again
      // This prevents the race condition where HomeScreen tries to load data with expired token
      if (token && userData) {
        // Validate token by making a lightweight API call
        try {
          await apiService.getStudyStats();
          // Token is valid, set user
          setUser(JSON.parse(userData));
        } catch (error) {
          // Token is invalid, clear stored credentials
          console.log('Stored token is invalid, clearing credentials');
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('userData');
        }
      }
    } catch (error) {
      console.warn('Failed to check auth status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginInput) => {
    try {
      setIsLoading(true);
      const authResponse = await apiService.login(credentials);
      
      await SecureStore.setItemAsync('userData', JSON.stringify(authResponse.user));
      setUser(authResponse.user);
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiService.logout();
      await SecureStore.deleteItemAsync('userData');
      setUser(null);
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};