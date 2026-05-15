import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    ...Ionicons.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: '#FAFAFA' }} />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FAFAFA' },
          headerTitleStyle: { color: '#0F172A', fontWeight: '600' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#FAFAFA' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Visitor Entry' }} />
        <Stack.Screen name="success" options={{ title: 'Submitted', headerBackVisible: false }} />
        <Stack.Screen name="status" options={{ title: 'Check Status' }} />
        <Stack.Screen name="admin" options={{ title: 'Admin' }} />
        <Stack.Screen name="entry-qr" options={{ title: 'Entry QR' }} />
        <Stack.Screen name="employee/login" options={{ title: 'Employee Login' }} />
        <Stack.Screen name="employee/dashboard" options={{ title: 'Employee Dashboard', headerBackVisible: false }} />
        <Stack.Screen name="pass/[id]" options={{ title: 'Visitor Pass' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
