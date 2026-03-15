import React, { useState, useEffect, useMemo } from 'react';
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
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { createRoom } from '../../hooks/useRooms';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { CitySearchInput } from '../../components/ui/CitySearchInput';
import { VenueSearchInput } from '../../components/ui/VenueSearchInput';
import { DateTimePicker } from '../../components/ui/DateTimePicker';
import { QuestionPicker } from '../../components/ui/QuestionPicker';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { Question } from '../../types';
import { Feather } from '@expo/vector-icons';

const SELECTION_BUFFER_SECONDS = 30;

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
  const [questionMap, setQuestionMap] = useState<Record<string, Question>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (questionIds.length === 0) return;
    const missing = questionIds.filter((id) => !questionMap[id]);
    if (missing.length === 0) return;
    getDocs(collection(db, 'questions')).then((snap) => {
      const map: Record<string, Question> = { ...questionMap };
      snap.docs.forEach((d) => {
        map[d.id] = { ...d.data(), id: d.id } as Question;
      });
      setQuestionMap(map);
    });
  }, [questionIds]);

  const { totalGameSeconds, scheduledEnd } = useMemo(() => {
    if (questionIds.length === 0) return { totalGameSeconds: 0, scheduledEnd: null };
    const secs = questionIds.reduce((acc, id) => {
      const q = questionMap[id];
      return acc + (q ? q.timeLimitSeconds + SELECTION_BUFFER_SECONDS : SELECTION_BUFFER_SECONDS);
    }, 0);
    const end = new Date(scheduledStart.getTime() + secs * 1000);
    return { totalGameSeconds: secs, scheduledEnd: end };
  }, [questionIds, questionMap, scheduledStart]);

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
    if (questionIds.length === 0) {
      setError('Select at least 1 question for the game.');
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
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd ? scheduledEnd.toISOString() : undefined,
        questionIds,
        venueAddress: venueAddress.trim(),
        requiresGenderParity: true,
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
        </View>

        <Text style={[styles.sectionLabel, { marginTop: spacing[5] }]}>Questions</Text>
        <QuestionPicker selectedIds={questionIds} onChange={setQuestionIds} />

        {questionIds.length > 0 && scheduledEnd && (
          <View style={styles.endTimeCard}>
            <View style={styles.endTimeRow}>
              <Feather name="clock" size={15} color={colors.accent} />
              <Text style={styles.endTimeLabel}>Estimated End Time</Text>
            </View>
            <Text style={styles.endTimeValue}>{formatTime(scheduledEnd)}</Text>
            <Text style={styles.endTimeMeta}>
              {questionIds.length} question{questionIds.length === 1 ? '' : 's'} · {formatDuration(totalGameSeconds)} total
            </Text>
          </View>
        )}

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
  endTimeCard: {
    marginTop: 14,
    backgroundColor: `${colors.accent}12`,
    borderWidth: 1,
    borderColor: `${colors.accent}40`,
    borderRadius: radius.md,
    padding: 14,
    gap: 4,
  },
  endTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  endTimeLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  endTimeValue: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  endTimeMeta: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginTop: 2,
  },
});
