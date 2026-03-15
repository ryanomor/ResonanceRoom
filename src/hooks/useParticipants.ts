import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { RoomParticipant, ParticipantStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useParticipants(roomId: string | null) {
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, 'roomParticipants'), where('roomId', '==', roomId));
    const unsub = onSnapshot(q, (snap) => {
      setParticipants(snap.docs.map((d) => ({ ...d.data(), id: d.id } as RoomParticipant)));
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
  });
}
