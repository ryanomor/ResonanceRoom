import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import '../global.css';
import { useAuthListener } from '../src/hooks/useAuth';
import { useAuthStore } from '../src/store/authStore';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { firebaseUser, loading } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'auth';
    if (!firebaseUser && !inAuth) {
      router.replace('/auth/login');
    } else if (firebaseUser && inAuth) {
      router.replace('/(tabs)/home');
    }
  }, [firebaseUser, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  useAuthListener();

  return (
    <AuthGuard>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="room/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="room/create" options={{ presentation: 'modal' }} />
        <Stack.Screen name="game/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="chat/[id]" options={{ presentation: 'card' }} />
      </Stack>
    </AuthGuard>
  );
}
