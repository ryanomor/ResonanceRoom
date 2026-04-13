import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
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

async function findMatchDoc(
  gameSessionId: string,
  uid1: string,
  uid2: string
): Promise<Match | null> {
  const snap = await getDocs(query(collection(db, 'matches'), where('gameSessionId', '==', gameSessionId)));
  const existingDoc = snap.docs.find((d) => {
    const data = d.data();
    return (
      (data.uid1 === uid1 && data.uid2 === uid2) ||
      (data.uid1 === uid2 && data.uid2 === uid1)
    );
  });

  return existingDoc ? ({ ...existingDoc.data(), id: existingDoc.id } as Match) : null;
}

async function checkMutualSelection(
  gameSessionId: string,
  questionId: string,
  uid1: string,
  uid2: string
): Promise<boolean> {
  const snap = await getDocs(
    query(
      collection(db, 'userSelections'),
      where('gameSessionId', '==', gameSessionId),
      where('questionId', '==', questionId)
    )
  );

  const selections = snap.docs.map((d) => d.data());
  const uid1SelectedUid2 = selections.some((s) => s.selectorUserId === uid1 && s.selectedUserId === uid2);
  const uid2SelectedUid1 = selections.some((s) => s.selectorUserId === uid2 && s.selectedUserId === uid1);

  return uid1SelectedUid2 && uid2SelectedUid1;
}

export async function setMatch(
  gameSessionId: string,
  uid1: string,
  uid2: string,
  questionId: string,
  matched: boolean
): Promise<Match | null> {
  const existingMatch = await findMatchDoc(gameSessionId, uid1, uid2);

  if (!matched) {
    if (!existingMatch) return null;
    await deleteDoc(doc(db, 'matches', existingMatch.id));
    return null;
  }

  const isMutual = await checkMutualSelection(gameSessionId, questionId, uid1, uid2);
  if (!isMutual) return null;

  const now = new Date();
  const expires = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  if (existingMatch) {
    if (existingMatch.status !== 'active') {
      await updateDoc(doc(db, 'matches', existingMatch.id), {
        status: 'active',
        matchedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
      });
    }
    return existingMatch;
  }

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
