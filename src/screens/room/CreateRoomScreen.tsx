import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { createRoom } from '../../hooks/useRooms';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { VenueSearchInput } from '../../components/ui/VenueSearchInput';
import { colors, fontSize, spacing, radius } from '../../theme';

export function CreateRoomScreen() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(appUser?.city ?? '');
  const [venueAddress, setVenueAddress] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [entryFee, setEntryFee] = useState('0');
  const [requiresGenderParity, setRequiresGenderParity] = useState(true);
  const [scheduledStart, setScheduledStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!title.trim() || !city.trim()) {
      setError('Title and city are required.');
      return;
    }
    if (!appUser) {
      setError('You must be logged in.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const room = await createRoom({
        hostId: appUser.id,
        city: city.trim(),
        title: title.trim(),
        description: description.trim(),
        maxParticipants: parseInt(maxParticipants) || 10,
        entryFee: parseFloat(entryFee) || 0,
        scheduledStart: new Date(scheduledStart).toISOString(),
        questionIds: [],
        venueAddress: venueAddress.trim() || undefined,
        requiresGenderParity,
      });
      router.replace(`/room/${room.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.topTitle}>Create Room</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <Text style={styles.sectionLabel}>Room Details</Text>

        <Input
          label="Title"
          value={title}
          onChangeText={setTitle}
          placeholder="Friday Night Trivia"
          maxLength={60}
        />
        <Input
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Tell people what this room is about..."
          multiline
          numberOfLines={3}
          containerStyle={{ marginTop: 14 }}
          style={{ height: 80, paddingTop: 12 }}
        />

        <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>Location</Text>

        <CitySearchInput
          label="City"
          value={city}
          onSelect={setCity}
          containerStyle={{ zIndex: 200 }}
        />
        <VenueSearchInput
          label="Venue Address (optional)"
          value={venueAddress}
          onSelect={setVenueAddress}
          cityBias={city}
          placeholder="Search venue or address..."
          containerStyle={{ marginTop: 14, zIndex: 100 }}
        />

        <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>Game Settings</Text>

        <View style={styles.row}>
          <Input
            label="Max Players"
            value={maxParticipants}
            onChangeText={setMaxParticipants}
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

        <Input
          label="Scheduled Start"
          value={scheduledStart}
          onChangeText={setScheduledStart}
          placeholder="YYYY-MM-DDTHH:MM"
          containerStyle={{ marginTop: 14 }}
        />

        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Gender Parity</Text>
            <Text style={styles.toggleSub}>Balance male and female participants</Text>
          </View>
          <Switch
            value={requiresGenderParity}
            onValueChange={setRequiresGenderParity}
            trackColor={{ true: colors.accent, false: colors.subtle }}
            thumbColor={colors.white}
          />
        </View>

        <Button
          label="Create Room"
          onPress={handleCreate}
          loading={loading}
          style={{ marginTop: spacing[6], marginBottom: 40 }}
          size="lg"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
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
  topTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.white },
  content: { padding: spacing[5] },
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
  row: { flexDirection: 'row', gap: 12 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: { fontSize: fontSize.base, fontWeight: '600', color: colors.white },
  toggleSub: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
});
