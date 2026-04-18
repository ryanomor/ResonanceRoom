import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { colors, fontSize, spacing, radius } from '../../theme';
import {
  getHostStripeAccount,
  startStripeConnectOnboarding,
  refreshStripeConnectStatus,
  type HostStripeAccount,
} from '../../lib/payments';

interface Props {
  userId: string;
}

export function StripeConnectSection({ userId }: Props) {
  const [account, setAccount] = useState<HostStripeAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const a = await getHostStripeAccount(userId);
      setAccount(a);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [userId]);

  async function handleConnect() {
    setActionLoading(true);
    setError('');
    try {
      const { url } = await startStripeConnectOnboarding(userId);
      await Linking.openURL(url);
    } catch (e: any) {
      setError(e?.message ?? 'Could not start Stripe onboarding.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefresh() {
    setActionLoading(true);
    setError('');
    try {
      await refreshStripeConnectStatus(userId);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Could not refresh status.');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} size="small" />
      </View>
    );
  }

  const isActive = account?.connect_status === 'active';
  const isPending = account?.connect_status === 'pending';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Host Payouts</Text>
        <View style={[styles.statusPill, isActive ? styles.pillActive : styles.pillPending]}>
          <Text style={[styles.statusText, isActive ? styles.statusTextActive : styles.statusTextPending]}>
            {isActive ? 'Connected' : isPending ? 'Pending' : 'Not Connected'}
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        {isActive
          ? 'Your Stripe account is connected. Entry fees are transferred automatically after each game, minus 2.5% platform fee.'
          : 'Connect a Stripe account to charge entry fees and receive automatic payouts after games end.'}
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.actions}>
        {!isActive && (
          <TouchableOpacity
            style={[styles.btn, styles.btnTertiary, actionLoading && styles.btnDisabled]}
            onPress={handleConnect}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.btnPrimaryText}>
                {isPending ? 'Continue Onboarding' : 'Connect Stripe Account'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {(isPending || isActive) && (
          <TouchableOpacity
            style={[styles.btn, styles.btnGhost, actionLoading && styles.btnDisabled]}
            onPress={handleRefresh}
            disabled={actionLoading}
          >
            <Text style={styles.btnGhostText}>Refresh Status</Text>
          </TouchableOpacity>
        )}
      </View>

      {isActive && (
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Platform fee</Text>
          <Text style={styles.infoValue}>2.5% per transaction</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.white,
  },
  statusPill: {
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: `${colors.green}22`,
    borderColor: colors.green,
  },
  pillPending: {
    backgroundColor: `${colors.yellow}22`,
    borderColor: colors.yellow,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  statusTextActive: { color: colors.green },
  statusTextPending: { color: colors.yellow },
  description: {
    fontSize: fontSize.sm,
    color: colors.muted,
    lineHeight: 20,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    fontWeight: '600',
  },
  actions: {
    gap: 8,
  },
  btn: {
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // btnPrimary: {
  //   backgroundColor: colors.accent,
  // },
  btnTertiary: {
    backgroundColor: colors.amethyst,
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnPrimaryText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.white,
  },
  btnGhostText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.muted,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: fontSize.xs,
    color: colors.offwhite,
    fontWeight: '600',
  },
});
