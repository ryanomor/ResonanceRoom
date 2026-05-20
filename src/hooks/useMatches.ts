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
import { getUserById } from './useAuth';
import { getGameSessionById } from './useGame';

export function useMatches(userId: string | null) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const q1 = query(collection(db, 'matches'), where('uid1', '==', userId));
    const q2 = query(collection(db, 'matches'), where('uid2', '==', userId));

    const map = new Map<string, Match>();

    async function refreshMatches() {
      const allMatches = Array.from(map.values());
      const sessionIds = Array.from(new Set(allMatches.map((m) => m.gameSessionId)));
      const sessionStates = new Map<string, string>();

      await Promise.all(
        sessionIds.map(async (sessionId) => {
          const session = await getGameSessionById(sessionId);
          sessionStates.set(sessionId, session?.gameState ?? '');
        })
      );

      const visibleMatches = allMatches.filter(
        (match) => sessionStates.get(match.gameSessionId) === 'ended'
      );

      if (!active) return;
      setMatches(visibleMatches);
      setLoading(false);
    }

    const unsub1 = onSnapshot(q1, (snap) => {
      snap.docs.forEach((d) => map.set(d.id, { ...d.data(), id: d.id } as Match));
      void refreshMatches();
    });

    const unsub2 = onSnapshot(q2, (snap) => {
      snap.docs.forEach((d) => map.set(d.id, { ...d.data(), id: d.id } as Match));
      void refreshMatches();
    });

    return () => {
      active = false;
      unsub1();
      unsub2();
    };
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

export function isMatchExpired(match: Match) {
  if (match.status === 'locked') return false;
  return new Date() > new Date(match.expiresAt) && match.status === 'active';
}

export function isMatchLocked(match: Match) {
  return match.status === 'locked';
}

export async function markMatchChatted(matchId: string) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'chatted',
    firstChatAt: new Date().toISOString(),
  });
}

export async function lockMatch(matchId: string) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'locked',
    lockedAt: new Date().toISOString(),
  });
}

export async function deleteMatch(matchId: string) {
  await deleteDoc(doc(db, 'matches', matchId));
}

export async function getMatchesBySessionId(sessionId: string): Promise<Match[]> {
  const snap = await getDocs(query(collection(db, 'matches'), where('gameSessionId', '==', sessionId)));
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as Match));
}
