import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createClient } from '@supabase/supabase-js';
import type { RoomParticipant, ParticipantStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function enrichWithUserProfiles(raw: RoomParticipant[]): Promise<RoomParticipant[]> {
  if (raw.length === 0) return raw;

  const userIds = [...new Set(raw.map((p) => p.userId))];

  const userSnaps = await Promise.all(
    userIds.map((uid) => getDoc(doc(db, 'users', uid)))
  );

  const profileMap: Record<string, { username?: string; avatarUrl?: string }> = {};
  userSnaps.forEach((snap) => {
    if (snap.exists()) {
      const data = snap.data();
      profileMap[snap.id] = {
        username: data.username,
        avatarUrl: data.avatarUrl,
      };
    }
  });

  return raw.map((p) => {
    const profile = profileMap[p.userId];
    if (!profile) return p;
    return {
      ...p,
      username: profile.username ?? p.username,
      avatarUrl: profile.avatarUrl ?? p.avatarUrl,
    };
  });
}

export function useParticipants(roomId: string | null) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, 'roomParticipants'), where('roomId', '==', roomId));
    const unsub = onSnapshot(q, async (snap) => {
      const raw = snap.docs.map((d) => ({ ...d.data(), id: d.id } as RoomParticipant));
      const enriched = await enrichWithUserProfiles(raw);
      setParticipants(enriched);
    });
    return unsub;
  }, [roomId]);

  return participants;
}

export async function joinRoom(roomId: string, userId: string): Promise<RoomParticipant> {
  const now = new Date().toISOString();
  const p: RoomParticipant = {
    id: uuidv4(),
    roomId,
    userId,
    status: 'pending',
    role: 'player',
    requestedAt: now,
    score: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'roomParticipants', p.id), p);
  return p;
}

export async function joinRoomAsHost(roomId: string, userId: string): Promise<RoomParticipant> {
  const now = new Date().toISOString();
  const p: RoomParticipant = {
    id: uuidv4(),
    roomId,
    userId,
    status: 'approved',
    role: 'host',
    requestedAt: now,
    approvedAt: now,
    score: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'roomParticipants', p.id), p);
  return p;
}

export async function updateParticipantStatus(id: string, status: ParticipantStatus) {
  await updateDoc(doc(db, 'roomParticipants', id), {
    status,
    updatedAt: new Date().toISOString(),
    ...(status === 'approved' ? { approvedAt: new Date().toISOString() } : {}),
    ...(status === 'paid' ? { paidAt: new Date().toISOString() } : {}),
  });
}

export async function markParticipantPaid(id: string, stripeSessionId: string) {
  const now = new Date().toISOString();
  await updateDoc(doc(db, 'roomParticipants', id), {
    status: 'paid',
    paidAt: now,
    paymentReference: stripeSessionId,
    updatedAt: now,
  });
}

export function usePaidParticipantIds(roomId: string | null): Set<string> {
  const [paidIds, setPaidIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`payments:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participant_payments',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          supabase
            .from('participant_payments')
            .select('participant_id')
            .eq('room_id', roomId)
            .eq('payment_status', 'paid')
            .then(({ data }) => {
              const s = new Set<string>();
              (data ?? []).forEach((r: { participant_id: string }) => s.add(r.participant_id));
              setPaidIds(s);
            });
        }
      )
      .subscribe();

    supabase
      .from('participant_payments')
      .select('participant_id')
      .eq('room_id', roomId)
      .eq('payment_status', 'paid')
      .then(({ data }) => {
        const s = new Set<string>();
        (data ?? []).forEach((r: { participant_id: string }) => s.add(r.participant_id));
        setPaidIds(s);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  return paidIds;
}
