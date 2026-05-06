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
import { useMatches, isMatchExpired } from '../../hooks/useMatches';
import { getUserById } from '../../hooks/useAuth';
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
  const [userCache, setUserCache] = useState<Record<string, any>>({});

  const active = matches.filter((m) => m.status !== 'expired' && !isMatchExpired(m));
  const expired = matches.filter((m) => m.status === 'expired' || isMatchExpired(m));

  useEffect(() => {
    async function loadUsers() {
      const cache: Record<string, any> = {};
      for (const match of matches) {
        const otherId = appUser?.id === match.uid1 ? match.uid2 : match.uid1;
        if (!cache[otherId]) {
          cache[otherId] = await getUserById(otherId);
        }
      }
      setUserCache(cache);
    }
    if (matches.length > 0) {
      loadUsers();
    }
  }, [matches, appUser?.id]);

  function renderMatch({ item: match }: { item: Match }) {
    const otherId = appUser?.id === match.uid1 ? match.uid2 : match.uid1;
    const otherUser = userCache[otherId];
    const expired2 = isMatchExpired(match) || match.status === 'expired';

    return (
      <TouchableOpacity
        onPress={() => router.push(`/chat/${match.id}`)}
        style={[styles.matchCard, expired2 && styles.matchCardExpired]}
        activeOpacity={0.8}
      >
        <Avatar uri={otherUser?.avatarUrl} name={otherUser?.username || otherId} size="md" />
        <View style={styles.matchInfo}>
          <Text style={styles.matchName}>{otherUser?.username || otherId}</Text>
          <Text style={styles.matchSub}>
            Matched in game · {new Date(match.matchedAt).toLocaleDateString()}
          </Text>
          {!expired2 && <CountdownTimer expiresAt={match.expiresAt} />}
        </View>
        {match.status === 'chatted' && (
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
    backgroundColor: colors.amethyst,
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
