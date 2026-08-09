import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { completeSocialSignUp } from '../../hooks/useAuth';
import { useAuthStore } from '../../store/authStore';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { Gender } from '../../types';

export function SocialProfileScreen() {
  const router = useRouter();
  const { pendingSocialProfile } = useAuthStore();
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (!username.trim() || !city.trim()) {
      setError('Username and city are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await completeSocialSignUp(username.trim(), city.trim(), gender, isHost);
      router.replace('/(tabs)/home');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
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
        <View style={styles.form}>
          <Text style={styles.title}>Almost there!</Text>
          <Text style={styles.subtitle}>Just a few more details to complete your profile.</Text>

          {pendingSocialProfile?.email ? (
            <View style={styles.emailRow}>
              <Text style={styles.emailLabel}>Signed in as</Text>
              <Text style={styles.emailValue}>{pendingSocialProfile.email}</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            placeholder="yourname"
            autoCapitalize="none"
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

          <View style={styles.genderSection}>
            <Text style={styles.fieldLabel}>I am a...</Text>
            <View style={styles.roleCardContainer}>
              <TouchableOpacity
                onPress={() => setIsHost(false)}
                style={[styles.roleCard, !isHost && styles.roleCardActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.roleCardTitle, !isHost && styles.roleCardTitleActive]}>
                  Participant
                </Text>
                <Text style={[styles.roleCardDesc, !isHost && styles.roleCardDescActive]}>
                  I just want to play trivia and meet a potential match
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsHost(true)}
                style={[styles.roleCard, isHost && styles.roleCardActive]}
                activeOpacity={0.85}
              >
                <Text style={[styles.roleCardTitle, isHost && styles.roleCardTitleActive]}>
                  Host
                </Text>
                <Text style={[styles.roleCardDesc, isHost && styles.roleCardDescActive]}>
                  I want to host trivia speed dating events in my city
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <Button
            label="Finish Setup"
            onPress={handleComplete}
            loading={loading}
            style={{ marginTop: 28 }}
            size="lg"
          />
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
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing[4],
  },
  emailLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  emailValue: {
    fontSize: fontSize.sm,
    color: colors.offwhite,
    fontWeight: '600',
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
  roleCardContainer: { gap: 12 },
  roleCard: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  roleCardActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}18`,
  },
  roleCardTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.muted,
    marginBottom: 4,
  },
  roleCardTitleActive: {
    color: colors.accent,
  },
  roleCardDesc: {
    fontSize: fontSize.sm,
    color: colors.muted,
    lineHeight: 20,
  },
  roleCardDescActive: {
    color: colors.offwhite,
  },
});
