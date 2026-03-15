import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface PaymentRecord {
  id: string;
  participant_id: string;
  room_id: string;
  stripe_session_id: string | null;
  stripe_transfer_id: string | null;
  amount_cents: number | null;
  application_fee_cents: number | null;
  payment_status: 'pending' | 'paid' | 'refunded';
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export interface HostStripeAccount {
  id: string;
  user_id: string;
  stripe_account_id: string;
  connect_status: 'pending' | 'active' | 'restricted';
  onboarding_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface HostPayout {
  id: string;
  room_id: string;
  host_user_id: string;
  stripe_account_id: string;
  gross_collected_cents: number;
  platform_fee_cents: number;
  net_payout_cents: number;
  participant_count: number;
  payout_status: 'pending' | 'paid' | 'failed';
  stripe_transfer_ids: string[];
  paid_out_at: string | null;
  created_at: string;
}

export async function createPaymentLink(params: {
  roomId: string;
  participantId: string;
  userId: string;
  amount: number;
  roomTitle: string;
  hostUserId: string;
}): Promise<{ url: string; sessionId: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-payment-link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to create payment link');
  return data;
}

export async function getPaymentStatus(participantId: string): Promise<PaymentRecord | null> {
  const { data } = await supabase
    .from('participant_payments')
    .select('*')
    .eq('participant_id', participantId)
    .maybeSingle();
  return data as PaymentRecord | null;
}

export async function refundPayment(
  participantId: string,
  scheduledStart?: string
): Promise<{ refunded: boolean; reason?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/refund-payment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ participantId, scheduledStart }),
  });
  const data = await res.json();
  return { refunded: data?.refunded === true, reason: data?.reason };
}

export async function getPaidParticipantIds(roomId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('participant_payments')
    .select('participant_id')
    .eq('room_id', roomId)
    .eq('payment_status', 'paid');
  const set = new Set<string>();
  (data ?? []).forEach((r: { participant_id: string }) => set.add(r.participant_id));
  return set;
}

export async function getHostStripeAccount(userId: string): Promise<HostStripeAccount | null> {
  const { data } = await supabase
    .from('host_stripe_accounts')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  return data as HostStripeAccount | null;
}

export async function startStripeConnectOnboarding(
  userId: string
): Promise<{ url: string; stripeAccountId: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-connect-account`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to start Stripe onboarding');
  return data;
}

export async function refreshStripeConnectStatus(
  userId: string
): Promise<{ connectStatus: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-connect-callback`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ userId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Failed to refresh Stripe status');
  return data;
}

export async function triggerHostPayout(
  roomId: string,
  hostUserId: string
): Promise<{ paid: boolean; reason?: string }> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/trigger-host-payout`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ roomId, hostUserId }),
  });
  const data = await res.json();
  return { paid: data?.paid === true, reason: data?.reason };
}

export async function getHostPayouts(hostUserId: string): Promise<HostPayout[]> {
  const { data } = await supabase
    .from('host_payouts')
    .select('*')
    .eq('host_user_id', hostUserId)
    .order('created_at', { ascending: false });
  return (data ?? []) as HostPayout[];
}
