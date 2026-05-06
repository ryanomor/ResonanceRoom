import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  getDoc,
  getDocs,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { createClient } from '@supabase/supabase-js';
import type { RoomParticipant, ParticipantStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

async function syncRoomParticipantCount(roomId: string) {
  const snap = await getDocs(
    query(
      collection(db, 'roomParticipants'),
      where('roomId', '==', roomId),
      where('status', 'in', ['approved', 'paid', 'inGame']),
      where('role', '==', 'player') // exclude host from participant count
    )
  );
  await updateDoc(doc(db, 'rooms', roomId), {
    currentParticipants: snap.size,
    updatedAt: new Date().toISOString(),
  });
}

async function createNotification(userId: string, type: string, title: string, message: string) {
  const now = new Date().toISOString();
  const id = uuidv4();
  await setDoc(doc(db, 'notifications', id), {
    id,
    userId,
    type,
    title,
    message,
    createdAt: now,
    updatedAt: now,
  });
}

export { createNotification };

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

export function useParticipants(roomId: string | null) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, 'roomParticipants'), where('roomId', '==', roomId));
    const unsub = onSnapshot(q, (snap) => {
      const raw = snap.docs.map((d) => ({ ...d.data(), id: d.id } as RoomParticipant));
      setParticipants(raw);
    });
    return unsub;
  }, [roomId]);

  return participants;
}

export async function joinRoom(
  roomId: string,
  userId: string,
  username?: string,
  avatarUrl?: string,
): Promise<RoomParticipant> {
  const now = new Date().toISOString();
  const p: RoomParticipant = {
    id: uuidv4(),
    roomId,
    userId,
    username,
    avatarUrl,
    status: 'pending',
    role: 'player',
    requestedAt: now,
    score: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'roomParticipants', p.id), p);

  try {
    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (roomSnap.exists()) {
      const room = roomSnap.data();
      const displayName = username ?? 'Someone';
      await createNotification(
        room.hostId,
        'joinRequest',
        'New Join Request',
        `${displayName} wants to join your room "${room.title}".`
      );
    }
  } catch {
    // non-blocking
  }

  return p;
}

export async function joinRoomAsHost(
  roomId: string,
  userId: string,
  username?: string,
  avatarUrl?: string,
): Promise<RoomParticipant> {
  const now = new Date().toISOString();
  const p: RoomParticipant = {
    id: uuidv4(),
    roomId,
    userId,
    username,
    avatarUrl,
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

  try {
    const participantSnap = await getDoc(doc(db, 'roomParticipants', id));
    if (participantSnap.exists()) {
      const participant = participantSnap.data();
      const roomId = participant.roomId as string;

      if (status === 'approved' || status === 'paid' || status === 'rejected') {
        syncRoomParticipantCount(roomId).catch(() => {});
      }

      if (status === 'approved' || status === 'rejected') {
        const roomSnap = await getDoc(doc(db, 'rooms', roomId));
        const roomTitle = roomSnap.exists() ? roomSnap.data().title : 'the room';
        const isApproved = status === 'approved';
        await createNotification(
          participant.userId,
          'joinRequestUpdate',
          isApproved ? 'Request Approved!' : 'Request Declined',
          isApproved
            ? `Your request to join "${roomTitle}" has been approved.`
            : `Your request to join "${roomTitle}" was not approved.`
        );
      }
    }
  } catch {
    // non-blocking
  }
}

export async function withdrawFromRoom(
  participantId: string,
  scheduledStart?: string,
): Promise<void> {
  const now = new Date().toISOString();

  const participantSnap = await getDoc(doc(db, 'roomParticipants', participantId));
  if (!participantSnap.exists()) return;
  const participant = participantSnap.data() as RoomParticipant;
  const wasApproved = participant.status === 'approved' || participant.status === 'paid';
  const roomId = participant.roomId;

  await updateDoc(doc(db, 'roomParticipants', participantId), {
    status: 'withdrawn',
    updatedAt: now,
  });

  try {
    if (wasApproved) {
      syncRoomParticipantCount(roomId).catch(() => {});
    }

    const roomSnap = await getDoc(doc(db, 'rooms', roomId));
    if (roomSnap.exists() && wasApproved) {
      const room = roomSnap.data();
      const displayName = participant.username ?? 'A player';
      await createNotification(
        room.hostId,
        'playerWithdrew',
        'Player Withdrew',
        `${displayName} has withdrawn from your room "${room.title}".`
      );
    }
  } catch {
    // non-blocking
  }
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
