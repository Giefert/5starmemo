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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseStoredUser = (value: string | null): User | null => {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      isRecord(parsed) &&
      typeof parsed.id === 'string' &&
      typeof parsed.email === 'string' &&
      typeof parsed.username === 'string' &&
      (parsed.role === 'student' || parsed.role === 'management') &&
      typeof parsed.restaurantId === 'string'
    ) {
      return parsed as unknown as User;
    }
  } catch {
    // Invalid persisted JSON is handled like an incomplete session below.
  }

  return null;
};

const parseStoredRestaurant = (value: string | null): ActiveRestaurant | null => {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      isRecord(parsed) &&
      typeof parsed.id === 'string' &&
      typeof parsed.name === 'string'
    ) {
      return { id: parsed.id, name: parsed.name };
    }
  } catch {
    // Invalid persisted JSON is discarded below.
  }

  return null;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurantState] = useState<ActiveRestaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const clearAuthState = () => {
      if (!isMounted) return;
      setUser(null);
      setRestaurantState(null);
      setIsLoading(false);
    };

    const unregisterAuthExpiredHandler =
      apiService.setAuthExpiredHandler(clearAuthState);

    const hydrateAuth = async () => {
      try {
        const [tokenData, userData, restaurantData] = await Promise.all([
          SecureStore.getItemAsync('authToken'),
          SecureStore.getItemAsync('userData'),
          SecureStore.getItemAsync('restaurantData'),
        ]);
        const token = tokenData?.trim() || null;
        const storedUser = parseStoredUser(userData);
        const storedRestaurant = parseStoredRestaurant(restaurantData);

        if (token && storedUser) {
          // restaurantData is display/cache state rather than a credential.
          // Recover its ID from the authenticated user if that one record is
          // missing or corrupt, so deck hydration is not disabled.
          const activeRestaurant = storedRestaurant ?? {
            id: storedUser.restaurantId,
            name: '',
          };
          apiService.hydrateToken(token);
          if (isMounted) {
            setUser(storedUser);
            setRestaurantState(activeRestaurant);
          }

          if (restaurantData && !storedRestaurant) {
            await SecureStore.deleteItemAsync('restaurantData');
          }
        } else {
          await apiService.logout();
        }
      } catch (error) {
        console.warn('Failed to hydrate authentication:', error);
        try {
          await apiService.logout();
        } catch (storageError) {
          console.warn('Failed to clear stored credentials:', storageError);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void hydrateAuth();

    return () => {
      isMounted = false;
      unregisterAuthExpiredHandler();
    };
  }, []);

  const login = async (credentials: LoginInput) => {
    try {
      setIsLoading(true);
      const authResponse = await apiService.login(credentials);

      await SecureStore.setItemAsync('userData', JSON.stringify(authResponse.user));
      setUser(authResponse.user);
      if (authResponse.restaurant) {
        await SecureStore.setItemAsync('restaurantData', JSON.stringify(authResponse.restaurant));
        setRestaurantState(authResponse.restaurant);
      } else {
        await SecureStore.deleteItemAsync('restaurantData');
        setRestaurantState(null);
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
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      setUser(null);
      setRestaurantState(null);
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
