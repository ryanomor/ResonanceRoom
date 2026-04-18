import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  Linking,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getRoomById, updateRoom } from '../../hooks/useRooms';
import {
  useParticipants,
  joinRoom,
  updateParticipantStatus,
  usePaidParticipantIds,
  withdrawFromRoom,
} from '../../hooks/useParticipants';
import { useAuthStore } from '../../store/authStore';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { VenueSearchInput } from '../../components/ui/VenueSearchInput';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import { colors, fontSize, spacing, radius } from '../../theme';
import { createPaymentLink, getPaymentStatus, refundPayment } from '../../lib/payments';
import type { Room, RoomParticipant } from '../../types';

const MIN_PLAYERS_RATIO = 0.5;

function EditRoomModal({
  room,
  visible,
  onClose,
  onSaved,
}: {
  room: Room;
  visible: boolean;
  onClose: () => void;
  onSaved: (updated: Room) => void;
}) {
  const [title, setTitle] = useState(room.title);
  const [description, setDescription] = useState(room.description);
  const [city, setCity] = useState(room.city);
  const [venueAddress, setVenueAddress] = useState(room.venueAddress ?? '');
  const [maxParticipants, setMaxParticipants] = useState(String(room.maxParticipants));
  const [entryFee, setEntryFee] = useState(String(room.entryFee));
  const [scheduledStart, setScheduledStart] = useState(new Date(room.scheduledStart));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!city.trim()) { setError('City is required.'); return; }
    setError('');
    setSaving(true);
    try {
      const rawMax = parseInt(maxParticipants) || room.maxParticipants;
      const parsedMax = rawMax % 2 === 0 ? rawMax : rawMax + 1;
      const parsedFee = parseFloat(entryFee) || 0;
      const updates: Partial<Room> = {
        title: title.trim(),
        description: description.trim(),
        city: city.trim(),
        venueAddress: venueAddress.trim() || undefined,
        maxParticipants: parsedMax,
        entryFee: parsedFee,
        scheduledStart: scheduledStart.toISOString(),
      };
      await updateRoom(room.id, updates);
      onSaved({ ...room, ...updates });
    } catch (e: any) {
      setError(e?.message ?? 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalTopBar}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Edit Room</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.modalSave, saving && { opacity: 0.5 }]}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
          {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

          <Text style={styles.sectionLabel}>Room Details</Text>
          <Input label="Title" value={title} onChangeText={setTitle} maxLength={60} />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            containerStyle={{ marginTop: 14 }}
            style={{ height: 80, paddingTop: 12 }}
          />

          <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>Location</Text>
          <CitySearchInput label="City" value={city} onSelect={setCity} containerStyle={{ zIndex: 200 }} />
          <VenueSearchInput
            label="Venue Address"
            value={venueAddress}
            onSelect={setVenueAddress}
            cityBias={city}
            placeholder="Search venue or address..."
            containerStyle={{ marginTop: 14, zIndex: 100 }}
          />

          <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>Game Settings</Text>
          <View style={styles.row}>
            <Input
              label="Max Players (even)"
              value={maxParticipants}
              onChangeText={(v) => {
                const n = parseInt(v);
                if (!isNaN(n) && n % 2 !== 0) {
                  setMaxParticipants(String(n + 1));
                } else {
                  setMaxParticipants(v);
                }
              }}
              keyboardType="number-pad"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Entry Fee ($)"
              value={entryFee}
              onChangeText={setEntryFee}
              keyboardType="decimal-pad"
              containerStyle={{ flex: 1 }}
            />
          </View>

          <View style={{ marginTop: 14, gap: 6 }}>
            <Text style={styles.fieldLabel}>Scheduled Start</Text>
            <DateTimePicker value={scheduledStart} onChange={setScheduledStart} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function RoomDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const appUser = useAuthStore((s) => s.appUser);
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [payingLink, setPayingLink] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);

  const participants = useParticipants(id ?? null);
  const paidParticipantIds = usePaidParticipantIds(id ?? null);

  const myParticipant = participants.find((p) => p.userId === appUser?.id);
  const isHost = room?.hostId === appUser?.id;

  const isPaidRoom = (room?.entryFee ?? 0) > 0;

  const approvedPlayers = participants.filter(
    (p) => p.role !== 'host' && (p.status === 'approved' || p.status === 'inGame' || p.status === 'paid')
  );
  const approvedCount = approvedPlayers.length;
  const pendingCount = participants.filter((p) => p.status === 'pending' && p.role !== 'host').length;

  const paidPlayersCount = isPaidRoom
    ? approvedPlayers.filter((p) => paidParticipantIds.has(p.id)).length
    : approvedCount;

  const minPlayers = room ? Math.max(2, Math.ceil(room.maxParticipants * MIN_PLAYERS_RATIO)) : 2;
  const canStartGame = isPaidRoom ? paidPlayersCount >= minPlayers : approvedCount >= minPlayers;

  const myPaymentStatus = myParticipant && isPaidRoom
    ? (paidParticipantIds.has(myParticipant.id) ? 'paid' : 'unpaid')
    : 'free';

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
      await joinRoom(id, appUser.id, appUser.username, appUser.avatarUrl);
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

  async function handleWithdraw() {
    if (!myParticipant || !room) return;
    setWithdrawing(true);
    try {
      if (myPaymentStatus === 'paid') {
        await refundPayment(myParticipant.id, room.scheduledStart);
      }
      await withdrawFromRoom(myParticipant.id, room.scheduledStart);
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not withdraw from room.');
    } finally {
      setWithdrawing(false);
    }
  }

  const handlePayToEnter = useCallback(async () => {
    if (!room || !myParticipant || !appUser) return;
    setPayingLink(true);
    try {
      const { url } = await createPaymentLink({
        roomId: room.id,
        participantId: myParticipant.id,
        userId: appUser.id,
        amount: room.entryFee,
        roomTitle: room.title,
        hostUserId: room.hostId,
      });
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Payment Error', e?.message ?? 'Could not create payment link.');
    } finally {
      setPayingLink(false);
    }
  }, [room, myParticipant, appUser]);

  const handleCheckPayment = useCallback(async () => {
    if (!myParticipant) return;
    setCheckingPayment(true);
    try {
      const record = await getPaymentStatus(myParticipant.id);
      if (record?.payment_status === 'paid') {
        router.push(`/game/${room?.id}`);
      } else {
        Alert.alert('Payment Pending', 'Your payment has not been confirmed yet. Please complete the payment first.');
      }
    } finally {
      setCheckingPayment(false);
    }
  }, [myParticipant, room]);

  function handlePlayerPress(p: RoomParticipant) {
    if (p.userId === appUser?.id) return;
    router.push(`/user/${p.userId}`);
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
        {isHost && room.status === 'waiting' ? (
          <TouchableOpacity onPress={() => setEditModalVisible(true)}>
            <Text style={styles.editBtn}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
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
                <TouchableOpacity
                  key={p.id}
                  style={styles.participantRow}
                  onPress={() => handlePlayerPress(p)}
                  activeOpacity={p.userId === appUser?.id ? 1 : 0.7}
                >
                  <Avatar uri={p.avatarUrl} size="sm" />
                  <Text style={styles.participantName}>{p.username}</Text>
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
                </TouchableOpacity>
              ))}
          </Card>
        )}

        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Players ({approvedCount})</Text>
            {isPaidRoom && (
              <View style={styles.paidSummaryPill}>
                <Text style={styles.paidSummaryText}>
                  {paidPlayersCount}/{approvedCount} paid
                </Text>
              </View>
            )}
          </View>

          {isPaidRoom && isHost && (
            <View style={styles.startRequirement}>
              <Text style={styles.startRequirementText}>
                Need {minPlayers} paid players to start · {paidPlayersCount} paid
              </Text>
            </View>
          )}

          {approvedPlayers.map((p) => {
            const isPaid = isPaidRoom ? paidParticipantIds.has(p.id) : true;
            const isSelf = p.userId === appUser?.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={styles.participantRow}
                onPress={() => handlePlayerPress(p)}
                activeOpacity={isSelf ? 1 : 0.7}
              >
                <Avatar uri={p.avatarUrl} size="sm" />
                <Text style={styles.participantName}>{p.username}{isSelf ? ' (you)' : ''}</Text>
                {isPaidRoom ? (
                  isPaid ? (
                    <View style={[styles.statusBadge, styles.paidBadge]}>
                      <Text style={[styles.statusBadgeText, { color: colors.green }]}>PAID</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusBadge, styles.pendingPayBadge]}>
                      <Text style={[styles.statusBadgeText, { color: colors.yellow }]}>AWAITING</Text>
                    </View>
                  )
                ) : (
                  <View style={[styles.badge, styles.playerBadge]}>
                    <Text style={styles.badgeText}>player</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        {isHost && room.status === 'waiting' ? (
          <View style={styles.hostFooter}>
            {isPaidRoom && (
              <Text style={styles.hostPayNote}>
                {canStartGame
                  ? `${paidPlayersCount} players paid — ready to start`
                  : `Waiting for ${minPlayers - paidPlayersCount} more paid player${minPlayers - paidPlayersCount !== 1 ? 's' : ''}`}
              </Text>
            )}
            <Button
              label="Start Game"
              onPress={() => router.push(`/game/${room.id}`)}
              size="lg"
              variant="tertiary"
              disabled={!canStartGame}
            />
          </View>
        ) : !myParticipant ? (
          <Button
            label="Request to Join"
            onPress={handleJoin}
            loading={joining}
            size="lg"
            variant="tertiary"
          />
        ) : myParticipant.status === 'pending' ? (
          <View style={styles.pendingBanner}>
            <Text style={styles.pendingText}>Waiting for host approval...</Text>
            <TouchableOpacity
              onPress={handleWithdraw}
              disabled={withdrawing}
              style={styles.withdrawLink}
            >
              <Text style={styles.withdrawLinkText}>
                {withdrawing ? 'Withdrawing...' : 'Cancel request'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : myParticipant.status === 'approved' && isPaidRoom && myPaymentStatus !== 'paid' ? (
          <View style={styles.paymentFooter}>
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoTitle}>Payment required to join</Text>
              <Text style={styles.paymentInfoSub}>
                You've been approved! Pay the ${room.entryFee} entry fee to lock in your spot.
              </Text>
            </View>
            <View style={styles.paymentBtns}>
              <Button
                label={payingLink ? 'Opening...' : `Pay $${room.entryFee} to Enter`}
                onPress={handlePayToEnter}
                loading={payingLink}
                size="lg"
                variant="tertiary"
              />
              <TouchableOpacity onPress={handleCheckPayment} disabled={checkingPayment} style={styles.alreadyPaidBtn}>
                <Text style={styles.alreadyPaidText}>
                  {checkingPayment ? 'Checking...' : 'Already paid? Tap to verify'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleWithdraw} disabled={withdrawing} style={styles.withdrawLink}>
                <Text style={styles.withdrawLinkText}>
                  {withdrawing ? 'Withdrawing...' : 'Withdraw request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : myParticipant.status === 'approved' || myPaymentStatus === 'paid' || myParticipant.status === 'paid' ? (
          <View style={styles.hostFooter}>
            <Button
              label="Enter Game"
              onPress={() => router.push(`/game/${room.id}`)}
              size="lg"
              variant="tertiary"
            />
            <TouchableOpacity onPress={handleWithdraw} disabled={withdrawing} style={styles.withdrawLink}>
              <Text style={styles.withdrawLinkText}>
                {withdrawing ? 'Withdrawing...' : myPaymentStatus === 'paid' ? 'Withdraw & request refund' : 'Withdraw from room'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {room && (
        <EditRoomModal
          room={room}
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          onSaved={(updated) => {
            setRoom(updated);
            setEditModalVisible(false);
          }}
        />
      )}
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
  back: { fontSize: fontSize.base, color: colors.accent, fontWeight: '600', width: 60 },
  topTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.white, flex: 1, textAlign: 'center' },
  editBtn: { fontSize: fontSize.base, fontWeight: '600', color: colors.accent, width: 40, textAlign: 'right' },
  content: { padding: spacing[5], gap: 16, paddingBottom: 180 },
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sectionTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  paidSummaryPill: {
    backgroundColor: `${colors.green}22`,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.green,
  },
  paidSummaryText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.green },
  startRequirement: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  startRequirementText: { fontSize: fontSize.xs, color: colors.muted, fontWeight: '600' },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  participantName: { fontSize: fontSize.sm, color: colors.offwhite, flex: 1, fontWeight: '600' },
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
  playerBadge: { backgroundColor: colors.card },
  badgeText: { fontSize: 10, fontWeight: '700', color: colors.muted },
  statusBadge: {
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
  },
  paidBadge: {
    backgroundColor: `${colors.green}22`,
    borderColor: colors.green,
  },
  pendingPayBadge: {
    backgroundColor: `${colors.yellow}22`,
    borderColor: colors.yellow,
  },
  statusBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.4 },
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
  hostFooter: { gap: 10 },
  hostPayNote: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    fontWeight: '600',
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
  paymentFooter: { gap: 12 },
  paymentInfo: {
    backgroundColor: `${colors.yellow}15`,
    borderRadius: radius.md,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: `${colors.yellow}44`,
  },
  paymentInfoTitle: { fontSize: fontSize.sm, fontWeight: '800', color: colors.yellow, marginBottom: 4 },
  paymentInfoSub: { fontSize: fontSize.xs, color: colors.muted, lineHeight: 18 },
  paymentBtns: { gap: 8 },
  alreadyPaidBtn: { alignItems: 'center', paddingVertical: 8 },
  alreadyPaidText: { fontSize: fontSize.xs, color: colors.accent, fontWeight: '600' },
  withdrawLink: { alignItems: 'center', paddingVertical: 8 },
  withdrawLinkText: { fontSize: fontSize.xs, color: colors.error, fontWeight: '600' },
  modalContainer: { flex: 1, backgroundColor: colors.bg },
  modalTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.base, fontWeight: '800', color: colors.white },
  modalCancel: { fontSize: fontSize.base, color: colors.muted, fontWeight: '600', width: 60 },
  modalSave: { fontSize: fontSize.base, color: colors.accent, fontWeight: '700', width: 60, textAlign: 'right' },
  modalContent: { padding: spacing[5], gap: 4, paddingBottom: 60 },
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
  sectionLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing[3],
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.offwhite,
    letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', gap: 12 },
});
