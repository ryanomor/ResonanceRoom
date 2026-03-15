import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { signIn, signInWithGoogle, signInWithApple } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { colors, fontSize, spacing, radius } from '../../theme';

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setGoogleLoading(true);
    try {
      const { isNewUser } = await signInWithGoogle();
      if (isNewUser) {
        router.replace('/auth/social-profile');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleApple() {
    setError('');
    setAppleLoading(true);
    try {
      const { isNewUser } = await signInWithApple();
      if (isNewUser) {
        router.replace('/auth/social-profile');
      } else {
        router.replace('/(tabs)/home');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Apple sign-in failed. Please try again.');
    } finally {
      setAppleLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.logo}>echo</Text>
          <Text style={styles.logoAccent}>match</Text>
          <Text style={styles.tagline}>Connect, compete, and find your match.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Welcome back</Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="current-password"
            containerStyle={{ marginTop: 16 }}
          />

          <Button
            label="Sign In"
            onPress={handleLogin}
            loading={loading}
            style={{ marginTop: 28 }}
            size="lg"
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={handleGoogle}
            disabled={googleLoading}
            style={[styles.socialBtn, googleLoading && styles.socialBtnDisabled]}
            activeOpacity={0.8}
          >
            {googleLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.socialBtnIcon}>G</Text>
                <Text style={styles.socialBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              onPress={handleApple}
              disabled={appleLoading}
              style={[styles.socialBtn, styles.appleBtnDark, appleLoading && styles.socialBtnDisabled]}
              activeOpacity={0.8}
            >
              {appleLoading ? (
                <ActivityIndicator color={colors.bg} size="small" />
              ) : (
                <>
                  <Text style={[styles.socialBtnIcon, styles.appleBtnIconDark]}></Text>
                  <Text style={[styles.socialBtnText, styles.appleBtnTextDark]}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => router.push('/auth/signup')}
            style={styles.linkRow}
          >
            <Text style={styles.linkText}>
              Don't have an account? <Text style={styles.link}>Sign up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: {
    flexGrow: 1,
    padding: spacing[6],
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  logo: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.white,
    letterSpacing: -1,
  },
  logoAccent: {
    fontSize: 42,
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
  },
  tagline: {
    width: '100%',
    fontSize: fontSize.sm,
    color: colors.muted,
    marginBottom: spacing[8],
    marginTop: 4,
  },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.white,
    marginBottom: spacing[5],
  },
  errorBanner: {
    backgroundColor: `${colors.error}22`,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    padding: 12,
    fontSize: fontSize.sm,
    color: colors.error,
    marginBottom: spacing[4],
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 10,
    marginBottom: 12,
  },
  socialBtnDisabled: {
    opacity: 0.5,
  },
  socialBtnIcon: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  socialBtnText: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: colors.white,
  },
  appleBtnDark: {
    backgroundColor: colors.white,
    borderColor: colors.white,
  },
  appleBtnIconDark: {
    color: colors.bg,
  },
  appleBtnTextDark: {
    color: colors.bg,
  },
  linkRow: { marginTop: 8, alignItems: 'center' },
  linkText: { fontSize: fontSize.sm, color: colors.muted },
  link: { color: colors.accent, fontWeight: '700' },
});
