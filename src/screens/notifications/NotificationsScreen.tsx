import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useNotifications } from '../../hooks/useNotifications';
import { colors, fontSize, spacing, radius } from '../../theme';
import type { AppNotification } from '../../types';

const TYPE_ICONS: Record<string, string> = {
  gameStartingSoon: '🎮',
  joinRequest: '🙋',
  joinRequestUpdate: '✅',
  newCityGame: '🏙️',
  newMatch: '💕',
};

function NotificationItem({
  notification,
  onDismiss,
}: {
  notification: AppNotification;
  onDismiss: () => void;
}) {
  const icon = TYPE_ICONS[notification.type] ?? '🔔';
  const date = new Date(notification.createdAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.item}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.itemTitle}>{notification.title}</Text>
        {notification.message && (
          <Text style={styles.itemMsg}>{notification.message}</Text>
        )}
        <Text style={styles.itemDate}>{date}</Text>
      </View>
      <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
        <Text style={styles.dismissText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

export function NotificationsScreen() {
  const { notifications, unseen, dismiss, markAllSeen } = useNotifications();

  useEffect(() => {
    if (unseen > 0) {
      markAllSeen();
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.length > 0 && (
          <TouchableOpacity onPress={() => notifications.forEach((n) => dismiss(n.id))}>
            <Text style={styles.clearAll}>Clear all</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => (
          <NotificationItem notification={item} onDismiss={() => dismiss(item.id)} />
        )}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptyText}>No new notifications</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
  title: { fontSize: fontSize.xl, fontWeight: '900', color: colors.white },
  clearAll: { fontSize: fontSize.sm, fontWeight: '600', color: colors.muted },
  list: { padding: spacing[5], paddingBottom: 100 },
  item: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  icon: { fontSize: 20 },
  content: { flex: 1 },
  itemTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.white, marginBottom: 3 },
  itemMsg: { fontSize: fontSize.sm, color: colors.muted, lineHeight: 20, marginBottom: 4 },
  itemDate: { fontSize: fontSize.xs, color: colors.subtle },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: { fontSize: 12, color: colors.muted },
  separator: { height: 8 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: '800', color: colors.white, marginBottom: 8 },
  emptyText: { fontSize: fontSize.sm, color: colors.muted },
});
