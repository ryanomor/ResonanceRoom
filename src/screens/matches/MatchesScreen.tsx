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
import { useMatches, isMatchExpired, isMatchLocked, deleteMatch } from '../../hooks/useMatches';
import { getUserById } from '../../hooks/useAuth';
import { Avatar } from '../../components/ui/Avatar';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { Match } from '../../types';

function CountdownTimer({ expiresAt, locked }: { expiresAt: string; locked: boolean }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    if (locked) { setTimeStr(''); return; }
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
  }, [expiresAt, locked]);

  if (locked) return <Text style={styles.timerLocked}>Connected</Text>;
  const expired = timeStr === 'Expired';
  return <Text style={[styles.timer, expired && styles.timerExpired]}>{timeStr}</Text>;
}

export function MatchesScreen() {
  const router = useRouter();
  const appUser = useAuthStore((s) => s.appUser);
  const { matches, loading } = useMatches(appUser?.id ?? null);
  const [userCache, setUserCache] = useState<Record<string, any>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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

  async function handleDelete(matchId: string) {
    setDeletingId(matchId);
    try {
      await deleteMatch(matchId);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  function renderMatch({ item: match }: { item: Match }) {
    const otherId = appUser?.id === match.uid1 ? match.uid2 : match.uid1;
    const otherUser = userCache[otherId];
    const expired2 = isMatchExpired(match) || match.status === 'expired';
    const locked = isMatchLocked(match);
    const confirming = confirmDeleteId === match.id;
    const deleting = deletingId === match.id;

    return (
      <View>
        <TouchableOpacity
          onPress={() => {
            if (confirming) { setConfirmDeleteId(null); return; }
            router.push(`/chat/${match.id}`);
          }}
          style={[styles.matchCard, expired2 && styles.matchCardExpired]}
          activeOpacity={0.8}
        >
          <Avatar uri={otherUser?.avatarUrl} name={otherUser?.username || otherId} size="md" />
          <View style={styles.matchInfo}>
            <Text style={styles.matchName}>{otherUser?.username || otherId}</Text>
            <Text style={styles.matchSub}>
              Matched in game · {new Date(match.matchedAt).toLocaleDateString()}
            </Text>
            {!expired2 && <CountdownTimer expiresAt={match.expiresAt} locked={locked} />}
          </View>
          {locked && <View style={styles.lockedDot} />}
          {!locked && match.status === 'chatted' && <View style={styles.chattedDot} />}
          {!expired2 && !confirming && (
            <View style={styles.chatArrow}>
              <Text style={styles.chatArrowText}>→</Text>
            </View>
          )}
          {confirming && (
            <View style={styles.confirmRow}>
              <TouchableOpacity
                style={styles.confirmDeleteBtn}
                onPress={() => handleDelete(match.id)}
                disabled={deleting}
              >
                <Text style={styles.confirmDeleteText}>{deleting ? '...' : 'Delete'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmDeleteId(null)}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
        {!confirming && (
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => setConfirmDeleteId(match.id)}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteBtnText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
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
  timerLocked: { fontSize: fontSize.xs, fontWeight: '700', color: colors.green, marginTop: 4 },
  chattedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
  },
  lockedDot: {
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
  deleteBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
  },
  deleteBtnText: { fontSize: fontSize.xs, color: colors.error, fontWeight: '600' },
  confirmRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  confirmDeleteBtn: {
    backgroundColor: `${colors.error}22`,
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmDeleteText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.error },
  confirmCancelBtn: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  confirmCancelText: { fontSize: fontSize.xs, fontWeight: '600', color: colors.muted },
  separator: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.white, marginBottom: 8 },
  emptyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: 'center', lineHeight: 22 },
});
