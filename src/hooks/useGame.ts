import { useState, useEffect, useCallback } from 'react';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GameSession, Question, UserAnswer, UserSelection } from '../types';
import { v4 as uuidv4 } from 'uuid';

export function useGameSession(sessionId: string | null) {
  const [session, setSession] = useState<GameSession | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    const unsub = onSnapshot(doc(db, 'gameSessions', sessionId), (snap) => {
      if (snap.exists()) {
        setSession({ ...snap.data(), id: snap.id } as GameSession);
      }
    });
    return unsub;
  }, [sessionId]);

  return session;
}

export async function getSessionByRoomId(roomId: string): Promise<GameSession | null> {
  const snap = await getDocs(
    query(collection(db, 'gameSessions'), where('roomId', '==', roomId))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { ...d.data(), id: d.id } as GameSession;
}

export async function getGameSessionById(sessionId: string): Promise<GameSession | null> {
  const snap = await getDoc(doc(db, 'gameSessions', sessionId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as GameSession;
}

export async function createGameSession(roomId: string, questionIds: string[]): Promise<GameSession> {
  const now = new Date().toISOString();
  const session: GameSession = {
    id: uuidv4(),
    roomId,
    currentQuestionIndex: 0,
    questionIds,
    gameState: 'question',
    createdAt: now,
    updatedAt: now,
    isTest: false,
  };
  await setDoc(doc(db, 'gameSessions', session.id), session);
  return session;
}

export async function updateGameSession(id: string, updates: Partial<GameSession>) {
  const now = new Date().toISOString();
  await setDoc(doc(db, 'gameSessions', id), { ...updates, updatedAt: now }, { merge: true });

  if (updates.gameState) {
    try {
      const sessionSnap = await getDoc(doc(db, 'gameSessions', id));
      if (sessionSnap.exists()) {
        const roomId = sessionSnap.data().roomId as string;
        let roomStatus: string | null = null;
        if (updates.gameState === 'question' || updates.gameState === 'selection' || updates.gameState === 'transition') {
          roomStatus = 'inProgress';
        } else if (updates.gameState === 'ended') {
          roomStatus = 'completed';
        }
        if (roomStatus) {
          await updateDoc(doc(db, 'rooms', roomId), { status: roomStatus, updatedAt: now });
        }
      }
    } catch {
      // non-blocking
    }
  }
}

export async function getQuestion(questionId: string): Promise<Question | null> {
  const snap = await getDoc(doc(db, 'questions', questionId));
  if (!snap.exists()) return null;
  return { ...snap.data(), id: snap.id } as Question;
}

export async function submitAnswer(answer: Omit<UserAnswer, 'id'>) {
  const existingSnap = await getDocs(
    query(
      collection(db, 'userAnswers'),
      where('gameSessionId', '==', answer.gameSessionId),
      where('userId', '==', answer.userId),
      where('questionId', '==', answer.questionId)
    )
  );

  if (!existingSnap.empty) {
    const existingDocId = existingSnap.docs[0].id;
    await updateDoc(doc(db, 'userAnswers', existingDocId), { selectedOption: answer.selectedOption, answeredAt: answer.answeredAt, hostId: answer.hostId });
  } else {
    const id = uuidv4();
    await setDoc(doc(db, 'userAnswers', id), { ...answer, id });
  }
}

export async function getAnswersForQuestion(sessionId: string, questionId: string): Promise<UserAnswer[]> {
  const snap = await getDocs(
    query(
      collection(db, 'userAnswers'),
      where('gameSessionId', '==', sessionId),
      where('questionId', '==', questionId)
    )
  );
  return snap.docs.map((d) => ({ ...d.data(), id: d.id } as UserAnswer));
}

export async function submitSelection(selection: Omit<UserSelection, 'id'>) {
  const id = uuidv4();
  await setDoc(doc(db, 'userSelections', id), { ...selection, id });
}

export async function deleteSelection(
  gameSessionId: string,
  questionId: string,
  selectorUserId: string,
  selectedUserId: string
) {
  const snap = await getDocs(
    query(
      collection(db, 'userSelections'),
      where('gameSessionId', '==', gameSessionId),
      where('questionId', '==', questionId),
      where('selectorUserId', '==', selectorUserId),
      where('selectedUserId', '==', selectedUserId)
    )
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export async function incrementGamesPlayedForRoom(roomId: string) {
  const now = new Date().toISOString();
  const participantsSnap = await getDocs(
    query(
      collection(db, 'roomParticipants'),
      where('roomId', '==', roomId),
      where('status', 'in', ['approved', 'paid', 'inGame'])
    )
  );
  await Promise.all(
    participantsSnap.docs.map(async (pDoc) => {
      const userId = pDoc.data().userId as string;
      const userSnap = await getDoc(doc(db, 'users', userId));
      if (userSnap.exists()) {
        const current = (userSnap.data().totalGamesPlayed as number) ?? 0;
        await updateDoc(doc(db, 'users', userId), {
          totalGamesPlayed: current + 1,
          updatedAt: now,
        });
      }
    })
  );
}

export function useAnsweredCount(sessionId: string | null, questionId: string | null) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!sessionId || !questionId) return;
    const q = query(
      collection(db, 'userAnswers'),
      where('gameSessionId', '==', sessionId),
      where('questionId', '==', questionId)
    );
    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set(snap.docs.map((d) => d.data().userId as string));
      setCount(ids.size);
    });
    return unsub;
  }, [sessionId, questionId]);

  return count;
}

export async function deleteUserSelectionsForQuestion(sessionId: string, questionId: string) {
  const snap = await getDocs(
    query(
      collection(db, 'userSelections'),
      where('gameSessionId', '==', sessionId),
      where('questionId', '==', questionId)
    )
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

export async function deleteUserAnswersForGameSession(sessionId: string) {
  const snap = await getDocs(
    query(collection(db, 'userAnswers'), where('gameSessionId', '==', sessionId))
  );
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}
