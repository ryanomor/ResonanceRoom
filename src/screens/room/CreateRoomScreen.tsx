import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { createRoom } from '../../hooks/useRooms';
import { joinRoomAsHost } from '../../hooks/useParticipants';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { VenueSearchInput } from '../../components/ui/VenueSearchInput';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import { QuestionPicker } from '../../components/ui/QuestionPicker';
import { colors, fontSize, spacing, radius } from '../../theme';

function computeScheduledEnd(start: Date, maxParticipants: number): Date {
  const baseMins = 30;
  const extraMins = Math.max(0, (maxParticipants - 10) / 2) * 5;
  const totalMins = baseMins + extraMins;
  return new Date(start.getTime() + totalMins * 60 * 1000);
}

function formatEndTime(date: Date): string {
  return date.toLocaleString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDurationMins(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 60000);
}

export function CreateRoomScreen() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(appUser?.city ?? '');
  const [venueAddress, setVenueAddress] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [entryFee, setEntryFee] = useState('0');
  const [scheduledStart, setScheduledStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parsedMax = parseInt(maxParticipants) || 10;
  const minQuestions = parsedMax;

  const scheduledEnd = useMemo(
    () => computeScheduledEnd(scheduledStart, parsedMax),
    [scheduledStart, parsedMax]
  );

  const sessionDurationMins = formatDurationMins(scheduledStart, scheduledEnd);

  async function handleCreate() {
    if (!title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!city.trim()) {
      setError('City is required.');
      return;
    }
    if (!venueAddress.trim()) {
      setError('Venue address is required.');
      return;
    }
    if (questionIds.length < minQuestions) {
      setError(`Add at least ${minQuestions - questionIds.length} more question${minQuestions - questionIds.length === 1 ? '' : 's'} to create this room.`);
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
        maxParticipants: parsedMax,
        entryFee: parseFloat(entryFee) || 0,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        questionIds,
        venueAddress: venueAddress.trim(),
        requiresGenderParity: true,
      });
      await joinRoomAsHost(room.id, appUser.id);
      router.replace(`/room/${room.id}`);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create room.');
    } finally {
      setLoading(false);
    }
  }

  const questionCountDiff = questionIds.length - minQuestions;
  const questionHelperColor =
    questionCountDiff >= 0 ? colors.green : colors.warning;
  const questionHelperText =
    questionCountDiff >= 0
      ? `Good — ${questionIds.length} question${questionIds.length === 1 ? '' : 's'} selected`
      : `Add at least ${Math.abs(questionCountDiff)} more question${Math.abs(questionCountDiff) === 1 ? '' : 's'} to create this room`;

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

        <View style={{ marginTop: 14, gap: 6 }}>
          <Text style={styles.fieldLabel}>Scheduled Start</Text>
          <DateTimePicker value={scheduledStart} onChange={setScheduledStart} />
          <Text style={styles.endTimeHint}>
            Game ends at {formatEndTime(scheduledEnd)} — {sessionDurationMins} min session
          </Text>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>Questions</Text>
        <QuestionPicker selectedIds={questionIds} onChange={setQuestionIds} />
        <Text style={[styles.questionHelper, { color: questionHelperColor }]}>
          {questionHelperText}
        </Text>

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
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.offwhite,
    letterSpacing: 0.3,
  },
  row: { flexDirection: 'row', gap: 12 },
  endTimeHint: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 6,
  },
  questionHelper: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    marginTop: 8,
  },
});
