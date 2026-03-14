import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useRooms } from '../../hooks/useRooms';
import { Card } from '../../components/ui/Card';
import { colors, fontSize, spacing, radius } from '../../theme';
import { CityPickerModal } from './CityPickerModal';
import type { Room } from '../../types';

function RoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  const isWaiting = room.status === 'waiting';
  const date = new Date(room.scheduledStart);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Card style={styles.roomCard} elevated>
        <View style={styles.roomHeader}>
          <View style={[styles.statusDot, { backgroundColor: isWaiting ? colors.green : colors.yellow }]} />
          <Text style={styles.statusText}>{isWaiting ? 'Open' : 'In Progress'}</Text>
          {room.entryFee > 0 && (
            <View style={styles.feeBadge}>
              <Text style={styles.feeText}>${room.entryFee}</Text>
            </View>
          )}
        </View>

        <Text style={styles.roomTitle} numberOfLines={2}>{room.title}</Text>
        <Text style={styles.roomDesc} numberOfLines={2}>{room.description}</Text>

        <View style={styles.roomFooter}>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText}>{room.city}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>🕐</Text>
            <Text style={styles.metaText}>{dateStr} · {timeStr}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaIcon}>👥</Text>
            <Text style={styles.metaText}>{room.currentParticipants}/{room.maxParticipants}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export function HomeScreen() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const [selectedCity, setSelectedCity] = useState(appUser?.city ?? '');
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const { rooms, loading, refetch } = useRooms(selectedCity);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.greeting}>Hey, {appUser?.username ?? 'Player'} 👋</Text>
          <Text style={styles.subGreeting}>Play trivia, find your next match!</Text>
        </View>
        <TouchableOpacity
          style={styles.cityPill}
          onPress={() => setCityPickerOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.cityPillText} numberOfLines={1}>
            {selectedCity || 'All Cities'}
          </Text>
          <Text style={styles.cityPillChevron}>›</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onPress={() => router.push(`/room/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No games yet</Text>
              <Text style={styles.emptyText}>
                Be the first to create a trivia room in {selectedCity || 'your city'}!
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {rooms.length > 0 ? `${rooms.length} game${rooms.length !== 1 ? 's' : ''} available` : ''}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/room/create')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <CityPickerModal
        visible={cityPickerOpen}
        selectedCity={selectedCity}
        onSelect={setSelectedCity}
        onClose={() => setCityPickerOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    paddingBottom: spacing[4],
    backgroundColor: colors.bg,
  },
  greeting: { fontSize: fontSize.lg, fontWeight: '800', color: colors.white },
  subGreeting: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: 160,
  },
  cityPillText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.offwhite, flex: 1 },
  cityPillChevron: { fontSize: 18, color: colors.muted, lineHeight: 20 },
  list: { padding: spacing[5], gap: 12, paddingBottom: 100 },
  sectionHeader: { marginBottom: 4 },
  sectionTitle: { fontSize: fontSize.sm, color: colors.muted, fontWeight: '600' },
  roomCard: { padding: spacing[4] },
  roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  feeBadge: {
    marginLeft: 'auto',
    backgroundColor: `${colors.yellow}22`,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.yellow,
  },
  feeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.yellow },
  roomTitle: { fontSize: fontSize.md, fontWeight: '800', color: colors.white, marginBottom: 6 },
  roomDesc: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20, marginBottom: 14 },
  roomFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaIcon: { fontSize: 12 },
  metaText: { fontSize: fontSize.xs, color: colors.muted },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.white, marginBottom: 8 },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: spacing[5],
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: { fontSize: 32, color: colors.white, lineHeight: 36, fontWeight: '300' },
});
