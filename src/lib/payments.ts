import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface PaymentRecord {
  id: string;
  participant_id: string;
  room_id: string;
  stripe_session_id: string | null;
  payment_status: 'pending' | 'paid' | 'refunded';
  paid_at: string | null;
  refunded_at: string | null;
  created_at: string;
}

export async function createPaymentLink(params: {
  roomId: string;
  participantId: string;
  userId: string;
  amount: number;
  roomTitle: string;
}): Promise<{ url: string; paymentLinkId: string }> {
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

export async function refundPayment(participantId: string): Promise<boolean> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/refund-payment`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ participantId }),
  });
  const data = await res.json();
  return data?.refunded === true;
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
