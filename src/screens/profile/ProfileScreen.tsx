import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { signOut, updateProfile, deleteAccount } from '../../hooks/useAuth';
import { usePhotoUpload } from '../../hooks/usePhotoUpload';
import { Avatar } from '../../components/ui/Avatar';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { StripeConnectSection } from '../../components/ui/StripeConnectSection';
import { getHostPayouts, type HostPayout } from '../../lib/payments';
import { colors, fontSize, spacing, radius } from '../../theme';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function ProfileScreen() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const { pickAndUpload, uploading: photoUploading, error: photoError } = usePhotoUpload();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(appUser?.username ?? '');
  const [bio, setBio] = useState(appUser?.bio ?? '');
  const [city, setCity] = useState(appUser?.city ?? '');
  const [saving, setSaving] = useState(false);
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);

  useEffect(() => {
    if (!appUser?.id) return;
    setPayoutsLoading(true);
    getHostPayouts(appUser.id)
      .then(setPayouts)
      .finally(() => setPayoutsLoading(false));
  }, [appUser?.id]);

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

  const totalEarnedCents = payouts
    .filter((p) => p.payout_status === 'paid')
    .reduce((sum, p) => sum + p.net_payout_cents, 0);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={() => setEditing((e) => !e)}>
          <Text style={styles.editBtn}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.avatarSection}>
          <TouchableOpacity
            onPress={pickAndUpload}
            disabled={photoUploading}
            activeOpacity={0.8}
            style={styles.avatarTouchable}
          >
            <Avatar name={appUser?.username} uri={appUser?.avatarUrl} size="xl" />
            <View style={styles.cameraOverlay}>
              {photoUploading ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.cameraIcon}>📷</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.changePhotoHint}>
            {photoUploading ? 'Uploading...' : 'Tap to change photo'}
          </Text>
          {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
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
            <CitySearchInput
              label="City"
              value={city}
              onSelect={setCity}
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

        {(appUser?.favoriteCities?.length ?? 0) > 0 && (
          <Card style={styles.favCard}>
            <Text style={styles.sectionTitle}>Favorite Cities</Text>
            <View style={styles.favList}>
              {appUser!.favoriteCities.map((c) => (
                <View key={c} style={styles.favChip}>
                  <Text style={styles.favChipText}>★ {c}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        {appUser?.id ? (
          <View style={styles.stripeSection}>
            <Text style={styles.sectionTitle}>Host Settings</Text>
            <StripeConnectSection userId={appUser.id} />
          </View>
        ) : null}

        {payouts.length > 0 && (
          <Card style={styles.earningsCard}>
            <View style={styles.earningsHeader}>
              <Text style={styles.sectionTitle}>Earnings</Text>
              <Text style={styles.earningsTotal}>{formatCents(totalEarnedCents)} total</Text>
            </View>
            {payouts.map((payout) => (
              <View key={payout.id} style={styles.payoutRow}>
                <View style={styles.payoutLeft}>
                  <Text style={styles.payoutRoomId} numberOfLines={1}>
                    Room {payout.room_id.slice(0, 8)}
                  </Text>
                  <Text style={styles.payoutDate}>
                    {payout.paid_out_at
                      ? new Date(payout.paid_out_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : new Date(payout.created_at).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                        })}
                    {' · '}{payout.participant_count} player{payout.participant_count !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.payoutRight}>
                  <Text style={styles.payoutNet}>{formatCents(payout.net_payout_cents)}</Text>
                  <Text style={styles.payoutFee}>
                    -{formatCents(payout.platform_fee_cents)} fee
                  </Text>
                  <View
                    style={[
                      styles.payoutStatusPill,
                      payout.payout_status === 'paid' ? styles.payoutPaid : styles.payoutFailed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.payoutStatusText,
                        payout.payout_status === 'paid' ? styles.payoutStatusPaidText : styles.payoutStatusFailedText,
                      ]}
                    >
                      {payout.payout_status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </Card>
        )}

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
  avatarSection: { alignItems: 'center', paddingVertical: spacing[5], gap: 6 },
  avatarTouchable: { position: 'relative' },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  cameraIcon: { fontSize: 14 },
  changePhotoHint: { fontSize: fontSize.xs, color: colors.muted },
  photoError: { fontSize: fontSize.xs, color: colors.error, textAlign: 'center', maxWidth: 240 },
  name: { fontSize: fontSize.xl, fontWeight: '800', color: colors.white, marginTop: 6 },
  email: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  bio: { fontSize: fontSize.sm, color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 22, maxWidth: 260 },
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
  favCard: {},
  favList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  favChip: {
    backgroundColor: `${colors.yellow}18`,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${colors.yellow}44`,
  },
  favChipText: { fontSize: fontSize.sm, color: colors.yellow, fontWeight: '600' },
  stripeSection: { gap: 12 },
  earningsCard: { gap: 12 },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  earningsTotal: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.green,
  },
  payoutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  payoutLeft: { flex: 1, gap: 4 },
  payoutRoomId: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  payoutDate: { fontSize: fontSize.xs, color: colors.muted },
  payoutRight: { alignItems: 'flex-end', gap: 3 },
  payoutNet: { fontSize: fontSize.base, fontWeight: '800', color: colors.white },
  payoutFee: { fontSize: fontSize.xs, color: colors.muted },
  payoutStatusPill: {
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderWidth: 1,
    marginTop: 2,
  },
  payoutPaid: { backgroundColor: `${colors.green}22`, borderColor: colors.green },
  payoutFailed: { backgroundColor: `${colors.error}22`, borderColor: colors.error },
  payoutStatusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
  payoutStatusPaidText: { color: colors.green },
  payoutStatusFailedText: { color: colors.error },
  actions: { paddingTop: spacing[4] },
});
