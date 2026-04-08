import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { metroKey } from '../lib/firestore';
import type { Room, RoomStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useRooms(city?: string) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms'),
      where('status', 'in', ['waiting', 'inProgress'])
    );
    const unsub = onSnapshot(q, (snap) => {
      let all: Room[] = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Room));
      if (city) {
        const key = metroKey(city);
        all = all.filter((r) => metroKey(r.city) === key);
      }
      setRooms(all);
      setLoading(false);
    });
    return unsub;
  }, [city]);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'rooms'),
        where('status', 'in', ['waiting', 'inProgress'])
      );
      const snap = await getDocs(q);
      let all: Room[] = snap.docs.map((d) => ({ ...d.data(), id: d.id } as Room));
      if (city) {
        const key = metroKey(city);
        all = all.filter((r) => metroKey(r.city) === key);
      }
      setRooms(all);
    } finally {
      setLoading(false);
    }
  }, [city]);

  return { rooms, loading, refetch };
}

export async function getRoomById(id: string): Promise<Room | null> {
  const snap = await getDoc(doc(db, 'rooms', id));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Room;
}

export async function createRoom(data: Omit<Room, 'id' | 'createdAt' | 'updatedAt' | 'currentParticipants' | 'status'>): Promise<Room> {
  const now = new Date().toISOString();
  const room: Room = {
    ...data,
    id: uuidv4(),
    status: 'waiting',
    currentParticipants: 0,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'rooms', room.id), room);
  return room;
}

export async function updateRoom(id: string, updates: Partial<Room>) {
  await updateDoc(doc(db, 'rooms', id), { ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteRoom(id: string) {
  await deleteDoc(doc(db, 'rooms', id));
}
