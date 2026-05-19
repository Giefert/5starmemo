import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { User, LoginInput, Restaurant } from '../types/shared';
import apiService from '../services/api';

// The session's active restaurant. Mutable so a future Settings restaurant
// switcher can update it in place — no re-login needed.
type ActiveRestaurant = Pick<Restaurant, 'id' | 'name'>;

interface AuthContextType {
  user: User | null;
  restaurant: ActiveRestaurant | null;
  isLoading: boolean;
  login: (credentials: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  setRestaurant: (restaurant: ActiveRestaurant) => Promise<void>;
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
  const [restaurant, setRestaurantState] = useState<ActiveRestaurant | null>(null);
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
          const restaurantData = await SecureStore.getItemAsync('restaurantData');
          if (restaurantData) setRestaurantState(JSON.parse(restaurantData));
        } catch (error) {
          // Token is invalid, clear stored credentials
          console.log('Stored token is invalid, clearing credentials');
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('userData');
          await SecureStore.deleteItemAsync('restaurantData');
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
      if (authResponse.restaurant) {
        await SecureStore.setItemAsync('restaurantData', JSON.stringify(authResponse.restaurant));
        setRestaurantState(authResponse.restaurant);
      }
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
      await SecureStore.deleteItemAsync('restaurantData');
      setUser(null);
      setRestaurantState(null);
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch the session's active restaurant — the entry point a future
  // Settings switcher calls. Persisted so the choice survives a relaunch.
  const setRestaurant = async (next: ActiveRestaurant) => {
    await SecureStore.setItemAsync('restaurantData', JSON.stringify(next));
    setRestaurantState(next);
  };

  const value: AuthContextType = {
    user,
    restaurant,
    isLoading,
    login,
    logout,
    setRestaurant,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};