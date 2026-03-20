import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { signOut, updateProfile, deleteAccount } from '../../hooks/useAuth';
import { usePhotoManager } from '../../hooks/usePhotoManager';
import { PhotoGallery } from '../../components/ui/PhotoGallery';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { StripeConnectSection } from '../../components/ui/StripeConnectSection';
import { getHostPayouts, type HostPayout } from '../../lib/payments';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { User } from '../../types';

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function MatchUserProfileScreen() {
  const router = useRouter();
  const { id: userId } = useLocalSearchParams<{ id: string }>();
  const appUser = useAuthStore((s) => s.appUser);

  const isSelf = !userId || userId === appUser?.id;

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [saving, setSaving] = useState(false);
  const [payouts, setPayouts] = useState<HostPayout[]>([]);
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const {
    photos,
    uploadPhoto,
    deletePhoto,
    reorderPhotos,
    uploadingSlot,
    deletingSlot,
    error: photoError,
    canAddMore,
  } = usePhotoManager();

  useEffect(() => {
    const targetId = isSelf ? appUser?.id : userId;
    if (!targetId) {
      setLoading(false);
      setError('User not found.');
      return;
    }

    if (isSelf && appUser) {
      setProfile(appUser);
      setUsername(appUser.username ?? '');
      setBio(appUser.bio ?? '');
      setCity(appUser.city ?? '');
      setLoading(false);
      return;
    }

    setLoading(true);
    getDoc(doc(db, 'users', targetId))
      .then((snap) => {
        if (snap.exists()) {
          setProfile(snap.data() as User);
        } else {
          setError('User not found.');
        }
      })
      .catch(() => setError('Could not load profile.'))
      .finally(() => setLoading(false));
  }, [userId, appUser?.id, isSelf]);

  useEffect(() => {
    if (!isSelf || !appUser?.id) return;
    setPayoutsLoading(true);
    getHostPayouts(appUser.id)
      .then(setPayouts)
      .finally(() => setPayoutsLoading(false));
  }, [isSelf, appUser?.id]);

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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Profile unavailable.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isSelf) {
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
            <PhotoGallery
              photos={photos}
              onUpload={uploadPhoto}
              onDelete={deletePhoto}
              onMoveLeft={(i) => reorderPhotos(i, i - 1)}
              onMoveRight={(i) => reorderPhotos(i, i + 1)}
              uploadingSlot={uploadingSlot}
              deletingSlot={deletingSlot}
              canAddMore={canAddMore}
            />
            {photoError ? <Text style={styles.photoError}>{photoError}</Text> : null}
            <Text style={styles.name}>{profile.username}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            {profile.bio && !editing ? (
              <Text style={styles.bio}>{profile.bio}</Text>
            ) : null}
          </View>

          {editing ? (
            <Card style={styles.editForm}>
              <Text style={styles.sectionTitle}>Edit Profile</Text>
              <Input label="Username" value={username} onChangeText={setUsername} />
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
              <Text style={styles.statValue}>{profile.totalGamesPlayed ?? 0}</Text>
              <Text style={styles.statLabel}>Games</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile.totalMatches ?? 0}</Text>
              <Text style={styles.statLabel}>Matches</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{profile.favoriteCities?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Cities</Text>
            </View>
          </View>

          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{profile.gender ?? '—'}</Text>
            </View>
            <View style={[styles.infoRow, styles.infoRowBorder]}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{profile.city ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Member since</Text>
              <Text style={styles.infoValue}>
                {profile.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString([], { month: 'short', year: 'numeric' })
                  : '—'}
              </Text>
            </View>
          </Card>

          {(profile.favoriteCities?.length ?? 0) > 0 && (
            <Card style={styles.favCard}>
              <Text style={styles.sectionTitle}>Favorite Cities</Text>
              <View style={styles.favList}>
                {profile.favoriteCities.map((c) => (
                  <View key={c} style={styles.favChip}>
                    <Text style={styles.favChipText}>★ {c}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {profile.id ? (
            <View style={styles.stripeSection}>
              <Text style={styles.sectionTitle}>Host Settings</Text>
              <StripeConnectSection userId={profile.id} />
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
                    <Text style={styles.payoutFee}>-{formatCents(payout.platform_fee_cents)} fee</Text>
                    <View
                      style={[
                        styles.payoutStatusPill,
                        payout.payout_status === 'paid' ? styles.payoutPaid : styles.payoutFailed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.payoutStatusText,
                          payout.payout_status === 'paid'
                            ? styles.payoutStatusPaidText
                            : styles.payoutStatusFailedText,
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
            <Button label="Delete Account" onPress={confirmDelete} variant="danger" />
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backTouchable}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{profile.username}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          {(profile.photos?.length ?? 0) > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photoStrip}
            >
              {(profile.photos ?? []).map((url, i) => (
                <View key={i} style={styles.photoStripItem}>
                  <Image source={{ uri: url }} style={styles.photoStripImage} resizeMode="cover" />
                  {i === 0 && (
                    <View style={styles.photoStripPrimary}>
                      <Text style={styles.photoStripPrimaryText}>Primary</Text>
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.avatarWrapper}>
              <Avatar name={profile.username} uri={profile.avatarUrl} size="xl" />
            </View>
          )}
          <Text style={styles.name}>{profile.username}</Text>
          {profile.city ? (
            <View style={styles.locationRow}>
              <Text style={styles.locationIcon}>📍</Text>
              <Text style={styles.locationText}>{profile.city}</Text>
            </View>
          ) : null}
          {profile.bio ? (
            <View style={styles.bioBox}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : (
            <View style={styles.bioBox}>
              <Text style={styles.noBioText}>No bio yet.</Text>
            </View>
          )}
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.totalGamesPlayed ?? 0}</Text>
            <Text style={styles.statLabel}>Games</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.totalMatches ?? 0}</Text>
            <Text style={styles.statLabel}>Matches</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{profile.favoriteCities?.length ?? 0}</Text>
            <Text style={styles.statLabel}>Cities</Text>
          </View>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Gender</Text>
            <Text style={styles.infoValue}>
              {profile.gender
                ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
                : '—'}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowBorder]}>
            <Text style={styles.infoLabel}>City</Text>
            <Text style={styles.infoValue}>{profile.city ?? '—'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member since</Text>
            <Text style={styles.infoValue}>
              {profile.createdAt
                ? new Date(profile.createdAt).toLocaleDateString([], {
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </Text>
          </View>
        </Card>

        {(profile.favoriteCities?.length ?? 0) > 0 && (
          <Card style={styles.favCard}>
            <Text style={styles.sectionTitle}>Favorite Cities</Text>
            <View style={styles.favList}>
              {profile.favoriteCities.map((c) => (
                <View key={c} style={styles.favChip}>
                  <Text style={styles.favChipText}>★ {c}</Text>
                </View>
              ))}
            </View>
          </Card>
        )}

        <View style={styles.matchBadge}>
          <Text style={styles.matchBadgeIcon}>🎯</Text>
          <Text style={styles.matchBadgeText}>
            You matched with {profile.username} in a game!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: spacing[5],
  },
  errorText: { fontSize: fontSize.base, color: colors.muted, textAlign: 'center' },
  backBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  backBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.sm },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  title: { fontSize: fontSize.xl, fontWeight: '900', color: colors.white },
  editBtn: { fontSize: fontSize.base, fontWeight: '600', color: colors.accent },
  back: { fontSize: fontSize.base, color: colors.accent, fontWeight: '600', width: 60 },
  backTouchable: { width: 60 },
  topTitle: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.white,
    textAlign: 'center',
  },
  content: { padding: spacing[5], gap: 16, paddingBottom: 100 },
  avatarSection: { alignItems: 'center', paddingVertical: spacing[5], gap: 8 },
  photoError: { fontSize: fontSize.xs, color: colors.error, textAlign: 'center', maxWidth: 280 },
  photoStrip: { gap: 10, paddingHorizontal: spacing[5], paddingVertical: 4 },
  photoStripItem: { position: 'relative', borderRadius: radius.lg, overflow: 'hidden' },
  photoStripImage: { width: 120, height: 150, borderRadius: radius.lg },
  photoStripPrimary: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: `${colors.yellow}55`,
  },
  photoStripPrimaryText: { fontSize: 9, fontWeight: '700', color: colors.yellow, letterSpacing: 0.3 },
  heroSection: { alignItems: 'center', paddingVertical: spacing[5], gap: 8 },
  avatarWrapper: { position: 'relative' },
  name: { fontSize: fontSize['2xl'], fontWeight: '900', color: colors.white, marginTop: 4 },
  email: { fontSize: fontSize.sm, color: colors.muted, marginTop: 4 },
  bio: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 260,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationIcon: { fontSize: 14 },
  locationText: { fontSize: fontSize.sm, color: colors.muted },
  bioBox: {
    marginTop: 8,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'stretch',
  },
  bioText: {
    fontSize: fontSize.base,
    color: colors.offwhite,
    lineHeight: 24,
    textAlign: 'center',
  },
  noBioText: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  editForm: {},
  sectionTitle: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
    marginBottom: spacing[3],
  },
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
  earningsTotal: { fontSize: fontSize.base, fontWeight: '800', color: colors.green },
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
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${colors.accent}18`,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: `${colors.accent}44`,
    marginTop: 4,
  },
  matchBadgeIcon: { fontSize: 20 },
  matchBadgeText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.accent,
    fontWeight: '600',
    lineHeight: 20,
  },
});
