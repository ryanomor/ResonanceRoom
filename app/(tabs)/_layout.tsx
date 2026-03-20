import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { House, Heart, Bell, User } from 'lucide-react-native';
import { colors } from '../../src/theme';
import { useNotifications } from '../../src/hooks/useNotifications';
import { useMatches } from '../../src/hooks/useMatches';
import { useAuthStore } from '../../src/store/authStore';

function NotifIcon({ focused }: { focused: boolean }) {
  const { unseen } = useNotifications();
  return (
    <View>
      <Bell size={22} color={focused ? colors.primary : colors.muted} strokeWidth={1.5} />
      {unseen > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unseen > 9 ? '9+' : unseen}</Text>
        </View>
      )}
    </View>
  );
}

function MatchIcon({ focused }: { focused: boolean }) {
  const appUser = useAuthStore((s) => s.appUser);
  const { matches } = useMatches(appUser?.id ?? null);
  const activeCount = matches.filter((m) => m.status === 'active').length;
  return (
    <View>
      <Heart size={22} color={focused ? colors.primary : colors.muted} strokeWidth={1.5} />
      {activeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeCount > 9 ? '9+' : activeCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <House size={22} color={focused ? colors.primary : colors.muted} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          tabBarIcon: ({ focused }) => <MatchIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          tabBarIcon: ({ focused }) => <NotifIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <User size={22} color={focused ? colors.primary : colors.muted} strokeWidth={1.5} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontWeight: '900', color: colors.white },
});
