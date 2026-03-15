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
import { signUp, signInWithGoogle, signInWithApple } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { Gender } from '../../types';

export function SignupScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  async function handleSignup() {
    if (!username.trim() || !email.trim() || !password || !city.trim()) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim(), city.trim(), gender);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed. Please try again.');
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
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.form}>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Join the trivia community</Text>

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="yourname"
            autoCapitalize="none"
          />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            containerStyle={{ marginTop: 16 }}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="6+ characters"
            secureTextEntry
            containerStyle={{ marginTop: 16 }}
          />
          <CitySearchInput
            label="Your City"
            value={city}
            onSelect={setCity}
            containerStyle={{ marginTop: 16, zIndex: 100 }}
          />

          <View style={styles.genderSection}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {(['male', 'female'] as Gender[]).map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={[
                    styles.genderBtn,
                    gender === g && styles.genderBtnActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.genderBtnText,
                      gender === g && styles.genderBtnTextActive,
                    ]}
                  >
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <Button
            label="Create Account"
            onPress={handleSignup}
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
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { flexGrow: 1, padding: spacing[6] },
  back: { marginBottom: spacing[4] },
  backText: { color: colors.accent, fontSize: fontSize.base, fontWeight: '600' },
  form: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'visible',
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: fontSize.sm,
    color: colors.muted,
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
  genderSection: { marginTop: 16 },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.offwhite,
    marginBottom: 8,
  },
  genderRow: { flexDirection: 'row', gap: 12 },
  genderBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderBtnActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  genderBtnText: { fontSize: fontSize.base, color: colors.muted, fontWeight: '600' },
  genderBtnTextActive: { color: colors.white },
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
});
