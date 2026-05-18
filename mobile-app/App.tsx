import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginScreen } from './screens/LoginScreen';
import TabNavigator from './navigation/TabNavigator';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Newsreader_500Medium_Italic } from '@expo-google-fonts/newsreader';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import { JetBrainsMono_400Regular } from '@expo-google-fonts/jetbrains-mono';

const Stack = createStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
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
          <AppNavigator />
          <StatusBar style="auto" />
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
