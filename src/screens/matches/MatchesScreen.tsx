import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useMatches, getOtherUserId, isMatchExpired } from '../../hooks/useMatches';
import { Avatar } from '../../components/ui/Avatar';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { Match } from '../../types';

function CountdownTimer({ expiresAt }: { expiresAt: string }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    function update() {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTimeStr('Expired'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeStr(`${h}h ${m}m ${s}s`);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const expired = timeStr === 'Expired';
  return <Text style={[styles.timer, expired && styles.timerExpired]}>{timeStr}</Text>;
}

export function MatchesScreen() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const { matches, loading } = useMatches(appUser?.id ?? null);

  const active = matches.filter((m) => m.status !== 'expired' && !isMatchExpired(m));
  const expired = matches.filter((m) => m.status === 'expired' || isMatchExpired(m));

  function renderMatch({ item }: { item: Match }) {
    const otherId = getOtherUserId(item, appUser?.id ?? '');
    const expired2 = isMatchExpired(item) || item.status === 'expired';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${item.id}`)}
        style={[styles.matchCard, expired2 && styles.matchCardExpired]}
        activeOpacity={0.8}
      >
        <Avatar name={otherId} size="md" />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{otherId.slice(0, 12)}...</Text>
          <Text style={styles.matchSub}>
            Matched in game · {new Date(item.matchedAt).toLocaleDateString()}
          </Text>
          {!expired2 && <CountdownTimer expiresAt={item.expiresAt} />}
        </View>
        {item.status === 'chatted' && (
          <View style={styles.chattedDot} />
        )}
        {!expired2 && (
          <View style={styles.chatArrow}>
            <Text style={styles.chatArrowText}>→</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Matches</Text>
        {active.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{active.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={[...active, ...expired]}
        keyExtractor={(m) => m.id}
        renderItem={renderMatch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptyText}>
                Play trivia games and select players who answered like you!
              </Text>
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing[5],
    paddingTop: Platform.OS === 'ios' ? 56 : spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.xl, fontWeight: '900', color: colors.white },
  countBadge: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countText: { fontSize: fontSize.xs, fontWeight: '900', color: colors.white },
  list: { padding: spacing[5], paddingBottom: 100 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchCardExpired: { opacity: 0.5 },
  matchInfo: { flex: 1 },
  matchName: { fontSize: fontSize.base, fontWeight: '700', color: colors.white },
  matchSub: { fontSize: fontSize.xs, color: colors.muted, marginTop: 2 },
  timer: { fontSize: fontSize.xs, fontWeight: '700', color: colors.accent, marginTop: 4 },
  timerExpired: { color: colors.muted },
  chattedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.green,
  },
  chatArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArrowText: { fontSize: 16, color: colors.accent },
  separator: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.white, marginBottom: 8 },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', lineHeight: 22 },
});
