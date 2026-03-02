import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getRoomById } from '../../hooks/useRooms';
import { useParticipants, joinRoom, updateParticipantStatus } from '../../hooks/useParticipants';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { Room, RoomParticipant } from '../../types';

export function RoomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appUser = useAuthStore((s) => s.appUser);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const participants = useParticipants(id ?? null);

  const myParticipant = participants.find((p) => p.userId === appUser?.id);
  const isHost = room?.hostId === appUser?.id;
  const approvedCount = participants.filter((p) => p.status === 'approved' || p.status === 'inGame' || p.status === 'paid').length;
  const pendingCount = participants.filter((p) => p.status === 'pending').length;

  useEffect(() => {
    if (!id) return;
    getRoomById(id).then((r) => {
      setRoom(r);
      setLoading(false);
    });
  }, [id]);

  async function handleJoin() {
    if (!appUser || !id) return;
    setJoining(true);
    try {
      await joinRoom(id, appUser.id);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not join room.');
    } finally {
      setJoining(false);
    }
  }

  async function handleApprove(p: RoomParticipant) {
    await updateParticipantStatus(p.id, 'approved');
  }

  async function handleReject(p: RoomParticipant) {
    await updateParticipantStatus(p.id, 'rejected');
  }

  if (loading || !room) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading room...</Text>
      </View>
    );
  }

  const date = new Date(room.scheduledStart);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>{room.title}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroMeta}>
            <Text style={styles.city}>{room.city}</Text>
            {room.entryFee > 0 && (
              <View style={styles.feeBadge}>
                <Text style={styles.feeText}>${room.entryFee} entry</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{room.title}</Text>
          <Text style={styles.description}>{room.description}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{approvedCount}/{room.maxParticipants}</Text>
              <Text style={styles.statLabel}>Players</Text>
            </View>
            <View style={[styles.statItem, styles.statDivider]}>
              <Text style={styles.statValue}>
                {date.toLocaleDateString([], { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.statLabel}>Date</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              <Text style={styles.statLabel}>Time</Text>
            </View>
          </View>

          {room.venueAddress ? (
            <View style={styles.venue}>
              <Text style={styles.venueText}>📍 {room.venueAddress}</Text>
            </View>
          ) : null}
        </View>

        {isHost && pendingCount > 0 && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitle}>Pending Requests ({pendingCount})</Text>
            {participants
              .filter((p) => p.status === 'pending')
              .map((p) => (
                <View key={p.id} style={styles.participantRow}>
                  <Avatar name={p.userId} size="sm" />
                  <Text style={styles.participantId}>{p.userId.slice(0, 8)}...</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.approveBtn]}
                      onPress={() => handleApprove(p)}
                    >
                      <Text style={styles.approveText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={() => handleReject(p)}
                    >
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
          </Card>
        )}

        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>
            Players ({approvedCount})
          </Text>
          {participants
            .filter((p) => ['approved', 'paid', 'inGame'].includes(p.status))
            .map((p) => (
              <View key={p.id} style={styles.participantRow}>
                <Avatar name={p.userId} size="sm" />
                <Text style={styles.participantId}>{p.userId.slice(0, 8)}...</Text>
                <View style={[styles.badge, p.role === 'host' ? styles.hostBadge : styles.playerBadge]}>
                  <Text style={styles.badgeText}>{p.role}</Text>
                </View>
              </View>
            ))}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        {isHost && room.status === 'waiting' ? (
          <Button
            label="Start Game"
            onPress={() => router.push(`/game/${room.id}`)}
            size="lg"
            variant="primary"
          />
        ) : !myParticipant ? (
          <Button
            label="Request to Join"
            onPress={handleJoin}
            loading={joining}
            size="lg"
          />
        ) : myParticipant.status === 'pending' ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>Waiting for host approval...</Text>
          </View>
        ) : myParticipant.status === 'approved' ? (
          <Button
            label="Enter Game"
            onPress={() => router.push(`/game/${room.id}`)}
            size="lg"
            variant="secondary"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: colors.muted, fontSize: fontSize.base },
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
  back: { fontSize: fontSize.base, color: colors.accent, fontWeight: '600' },
  topTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.white, flex: 1, textAlign: 'center' },
  content: { padding: spacing[5], gap: 16, paddingBottom: 120 },
  hero: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  city: { fontSize: fontSize.sm, color: colors.muted, fontWeight: '600' },
  feeBadge: {
    backgroundColor: `${colors.yellow}22`,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.yellow,
    marginLeft: 'auto',
  },
  feeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.yellow },
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.white, marginBottom: 8 },
  description: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 22, marginBottom: spacing[5] },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing[4],
    marginBottom: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  statValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.white },
  statLabel: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  venue: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 10,
  },
  venueText: { fontSize: fontSize.sm, color: colors.muted },
  section: { gap: 12 },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.white, marginBottom: 4 },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  participantId: { fontSize: fontSize.sm, color: colors.muted, flex: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  approveBtn: { backgroundColor: `${colors.green}22`, borderWidth: 1, borderColor: colors.green },
  rejectBtn: { backgroundColor: `${colors.error}22`, borderWidth: 1, borderColor: colors.error },
  approveText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.green },
  rejectText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.error },
  badge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  hostBadge: { backgroundColor: `${colors.yellow}22`, borderWidth: 1, borderColor: colors.yellow },
  playerBadge: { backgroundColor: colors.card },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.muted },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[5],
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing[5],
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingBanner: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pendingText: { fontSize: fontSize.base, color: colors.muted, fontWeight: '600' },
});
