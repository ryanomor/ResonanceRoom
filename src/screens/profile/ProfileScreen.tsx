import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { signOut, updateProfile, deleteAccount } from '../../hooks/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, fontSize, spacing, radius } from '../../theme';

export function ProfileScreen() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(appUser?.username ?? '');
  const [bio, setBio] = useState(appUser?.bio ?? '');
  const [city, setCity] = useState(appUser?.city ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ username, bio, city });
      setEditing(false);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    router.replace('/auth/login');
  }

  function confirmDelete() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount();
            router.replace('/auth/login');
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => setEditing((e) => !e)}>
          <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <Avatar name={appUser?.username} size="xl" />
          <Text style={styles.name}>{appUser?.username}</Text>
          <Text style={styles.email}>{appUser?.email}</Text>
          {appUser?.bio && !editing ? (
            <Text style={styles.bio}>{appUser.bio}</Text>
          ) : null}
        </View>

        {editing ? (
          <Card style={styles.editForm}>
            <Text style={styles.sectionTitle}>Edit Profile</Text>
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
            />
            <Input
              label="City"
              value={city}
              onChangeText={setCity}
              containerStyle={{ marginTop: 14 }}
            />
            <Input
              label="Bio"
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              multiline
              numberOfLines={3}
              style={{ height: 80, paddingTop: 12 }}
              containerStyle={{ marginTop: 14 }}
            />
            <Button
              label="Save Changes"
              onPress={handleSave}
              loading={saving}
              style={{ marginTop: spacing[5] }}
            />
          </Card>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{appUser?.totalGamesPlayed ?? 0}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{appUser?.totalMatches ?? 0}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{appUser?.favoriteCities?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>{appUser?.gender ?? '—'}</Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{appUser?.city ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>
              {appUser?.createdAt
                ? new Date(appUser.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })
                : '—'}
            </Text>
          </View>
        </Card>

        <View style={styles.actions}>
          <Button
            label="Sign Out"
            onPress={handleSignOut}
            variant="ghost"
            style={{ marginBottom: 12 }}
          />
          <Button
            label="Delete Account"
            onPress={confirmDelete}
            variant="danger"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xl, fontWeight: '900', color: colors.white },
  editBtn: { fontSize: fontSize.base, fontWeight: '600', color: colors.accent },
  content: { padding: spacing[5], gap: 16, paddingBottom: 100 },
  avatarSection: { alignItems: 'center', paddingVertical: spacing[5] },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.white, marginTop: 12 },
  email: { fontSize: fontSize.sm, color: colors.muted, marginTop: 4 },
  bio: { fontSize: fontSize.sm, color: colors.muted, marginTop: 8, textAlign: 'center', lineHeight: 22, maxWidth: 260 },
  editForm: {},
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.white, marginBottom: spacing[3] },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: fontSize['2xl'], fontWeight: '900', color: colors.white },
  statLabel: { fontSize: fontSize.xs, color: colors.muted, marginTop: 4 },
  infoCard: { gap: 0, padding: 0, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  infoRowBorder: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  infoLabel: { fontSize: fontSize.sm, color: colors.muted, fontWeight: '600' },
  infoValue: { fontSize: fontSize.sm, color: colors.white, fontWeight: '600' },
  actions: { paddingTop: spacing[4] },
});
