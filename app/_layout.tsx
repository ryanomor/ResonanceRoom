import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuthListener } from '../src/hooks/useAuth';
import { useAuthStore } from '../src/store/authStore';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme'
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const { firebaseUser, loading, pendingSocialProfile } = useAuthStore();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'auth';
    const onSocialProfile = inAuth && segments[1] === 'social-profile';

    if (!firebaseUser && !inAuth) {
      router.replace('/auth/login');
    } else if (firebaseUser && pendingSocialProfile && !onSocialProfile) {
      router.replace('/auth/social-profile');
    } else if (firebaseUser && !pendingSocialProfile && inAuth) {
      router.replace('/(tabs)/home');
    }
  }, [firebaseUser, loading, pendingSocialProfile, segments]);

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
  useFrameworkReady();
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
