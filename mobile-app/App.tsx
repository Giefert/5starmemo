import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DecksProvider } from './contexts/DecksContext';
import { LoginScreen } from './screens/LoginScreen';
import TabNavigator from './navigation/TabNavigator';
import { View, ActivityIndicator, AppState, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';
import {
  clearDailyReminderSchedule,
  initializeDailyReminderSettings,
} from './services/reminders';

const Stack = createStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function LoadingScreen() {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}

function DailyReminderManager() {
  const { user, restaurant, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    const prepareDailyReminder = () => {
      const reminderTask =
        user?.id && restaurant?.id
          ? initializeDailyReminderSettings(user.id, restaurant.id)
          : clearDailyReminderSchedule();
      void reminderTask.catch((error) => {
        console.warn('Failed to prepare daily reminder:', error);
      });
    };

    prepareDailyReminder();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') prepareDailyReminder();
    });
    return () => subscription.remove();
  }, [isLoading, user?.id, restaurant?.id]);

  return null;
}

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={TabNavigator} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  // Carte typography — Fraunces (serif display) + Newsreader (italic dek).
  // On a load failure we fall through rather than hang on the splash; RN
  // then renders with the system fallback.
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Newsreader_500Medium_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    JetBrainsMono_400Regular,
  });

  if (!fontsLoaded && !fontError) {
    return <LoadingScreen />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <DailyReminderManager />
          <DecksProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </DecksProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
