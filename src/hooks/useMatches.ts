import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Match } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useMatches(userId: string | null) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q1 = query(collection(db, 'matches'), where('uid1', '==', userId));
    const q2 = query(collection(db, 'matches'), where('uid2', '==', userId));

    const map = new Map<string, Match>();

    const unsub1 = onSnapshot(q1, (snap) => {
      snap.docs.forEach((d) => map.set(d.id, { ...d.data(), id: d.id } as Match));
      setMatches(Array.from(map.values()));
      setLoading(false);
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      snap.docs.forEach((d) => map.set(d.id, { ...d.data(), id: d.id } as Match));
      setMatches(Array.from(map.values()));
      setLoading(false);
    });

    return () => { unsub1(); unsub2(); };
  }, [userId]);

  return { matches, loading };
}

export async function createMatch(
  gameSessionId: string,
  uid1: string,
  uid2: string
): Promise<Match> {
  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const match: Match = {
    id: uuidv4(),
    gameSessionId,
    uid1,
    uid2,
    matchedAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    status: 'active',
  };
  await setDoc(doc(db, 'matches', match.id), match);
  return match;
}

export function getOtherUserId(match: Match, currentUserId: string) {
  return currentUserId === match.uid1 ? match.uid2 : match.uid1;
}

export function isMatchExpired(match: Match) {
  return new Date() > new Date(match.expiresAt) && match.status === 'active';
}

export async function markMatchChatted(matchId: string) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'chatted',
    firstChatAt: new Date().toISOString(),
  });
}
