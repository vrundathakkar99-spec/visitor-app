import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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
        <Stack.Screen name="pass/[id]" options={{ title: 'Visitor Pass' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
